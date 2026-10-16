const {test,expect}=require('@playwright/test');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {makeWav}=require('../fixtures.cjs');

const variants=['index.html','index.self-extract.html','deployed'];
const phase=(page,value)=>expect(page.locator('body')).toHaveAttribute('data-phase',value,{timeout:90000});
const notes=page=>page.locator('#pianoRoll [data-note-id]').evaluateAll(nodes=>nodes.map(node=>({
 id:node.dataset.noteId,pitch:+node.dataset.pitch,start:+node.dataset.start,end:+node.dataset.end
})));
const fixture=(name,pitch=60)=>({name,mimeType:'audio/wav',buffer:makeWav({notes:[{pitch,start:.25,end:2.25}]})});

async function selectSameTick(page,files){
 await page.evaluate(files=>{
  const input=document.querySelector('#audioFile');
  for(const file of files){
   const transfer=new DataTransfer();
   transfer.items.add(new File([Uint8Array.from(file.bytes)],file.name,{type:'audio/wav'}));
   input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
  }
 },files.map(file=>({name:file.name,bytes:Array.from(file.buffer)})));
}

// Instrument only the browser test. Native mode delegates to the real Worker and
// embedded model unchanged; protocol mode deliberately holds jobs without inference.
async function installProbe(page,protocol=false){
 await page.addInitScript(({protocol})=>{
  const NativeWorker=window.Worker,records=[],instances=new Map(),ids=new WeakMap();
  const probe=window.__workerLifecycle={protocol,records,posts:[],responses:[],live:[],maxLive:0,
   revoked:[],cancelOnAnalyzing:false,cancelledJob:null,heldFiles:[],waitingFiles:[],readFiles:[]};
  const fileGates=new Map(),readFile=File.prototype.arrayBuffer;
  File.prototype.arrayBuffer=async function(){
   if(probe.heldFiles.includes(this.name)){
    probe.waitingFiles.push(this.name);
    await new Promise(resolve=>fileGates.set(this.name,resolve));
   }
   const bytes=await readFile.call(this);probe.readFiles.push(this.name);return bytes;
  };
  probe.releaseFile=name=>{const release=fileGates.get(name);fileGates.delete(name);release?.();};
  const revoke=URL.revokeObjectURL.bind(URL);
  URL.revokeObjectURL=url=>{probe.revoked.push(String(url));return revoke(url);};
  function register(instance,url,kind){
   const record={id:records.length+1,url:String(url),kind,terminated:false};
   records.push(record);ids.set(instance,record);probe.live.push(record.id);
   probe.maxLive=Math.max(probe.maxLive,probe.live.length);
   return record;
  }
  function posted(instance,input,transfer){
   const record=ids.get(instance);
   probe.posts.push({workerId:record.id,kind:record.kind,jobId:input.jobId,
    modelJson:Object.prototype.hasOwnProperty.call(input,'modelJson'),
    weights:Object.prototype.hasOwnProperty.call(input,'weights'),
    sampleCount:input.samples.length,transferCount:transfer?.length||0});
  }
  function terminated(instance){
   const record=ids.get(instance);record.terminated=true;
   probe.live=probe.live.filter(id=>id!==record.id);
  }
  class TrackedWorker extends NativeWorker{
   constructor(url,options){
    super(url,options);const record=register(this,url,'native');
    this.addEventListener('message',event=>{
     probe.responses.push({workerId:record.id,jobId:event.data.jobId,phase:event.data.phase,tensors:event.data.tensors});
     // Cancel from the first actual inference progress event, before a short
     // model job can race a separate Playwright click. This uses the real UI.
     if(probe.cancelOnAnalyzing&&event.data.phase==='analyzing'){
      probe.cancelOnAnalyzing=false;probe.cancelledJob=event.data.jobId;
      document.querySelector('#cancelButton').click();
     }
    });
   }
   postMessage(input,transfer){posted(this,input,transfer);return super.postMessage(input,transfer);}
   terminate(){terminated(this);return super.terminate();}
  }
  class ProtocolWorker{
   constructor(url){const record=register(this,url,'protocol');instances.set(record.id,this);this.onmessage=null;this.onerror=null;}
   postMessage(input,transfer){
    posted(this,input,transfer);
    // Retain no PCM, model JSON or weights in the test double.
    this.onmessage?.({data:{jobId:input.jobId,phase:'analyzing',progress:.25}});
   }
   terminate(){terminated(this);}
  }
  // Retired protocol workers are kept solely to deliver deliberately late events.
  // Native instances are never retained by the probe after app termination.
  probe.emit=(id,data)=>{const worker=instances.get(id);if(!worker)throw new Error('Unknown protocol worker');worker.onmessage?.({data});};
  window.Worker=function(url,options){return probe.protocol?new ProtocolWorker(url):new TrackedWorker(url,options);};
  window.Worker.prototype=NativeWorker.prototype;Object.setPrototypeOf(window.Worker,NativeWorker);
 },{protocol});
}
async function open(page,context,variant,{protocol=false}={}){
 const errors=[],requests=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
 await installProbe(page,protocol);
 await page.goto(variant==='deployed'?process.env.PREVIEW_URL:pathToFileURL(path.join(__dirname,'../../dist',variant)).href);
 await phase(page,'empty');
 page.on('request',request=>{if(/^https?:/.test(request.url()))requests.push(request.url());});
 await context.setOffline(true);
 return {errors,requests};
}
async function snapshot(page){
 return page.evaluate(()=>{const p=window.__workerLifecycle;return {
  records:p.records,posts:p.posts,responses:p.responses,live:p.live,maxLive:p.maxLive,
  revoked:p.revoked,cancelledJob:p.cancelledJob
 };});
}
async function posted(page,count){
 await expect.poll(()=>page.evaluate(()=>window.__workerLifecycle.posts.length)).toBe(count);
 return page.evaluate(()=>window.__workerLifecycle.posts.at(-1));
}
async function emit(page,workerId,data){await page.evaluate(({workerId,data})=>window.__workerLifecycle.emit(workerId,data),{workerId,data});}
function complete(jobId,pitch){return {jobId,phase:'complete',elapsedMs:1,notes:[{pitchMidi:pitch,startSeconds:.25,endSeconds:2.25,velocity:96,origin:'detected'}]};}
async function finish(page,info,observed){
 expect(observed.errors).toEqual([]);expect(observed.requests).toEqual([]);
 await info.attach('worker-lifecycle',{body:Buffer.from(JSON.stringify(await snapshot(page),null,2)),contentType:'application/json'});
}

for(const variant of variants){
 test(`${variant}: real worker/model reuse, one-time bootstrap and cancellation recovery`,async({page,context},info)=>{
  test.skip(variant==='deployed'&&!process.env.PREVIEW_URL,'Preview URL not supplied');
  test.setTimeout(180000);
  const observed=await open(page,context,variant);
  await page.locator('#audioFile').setInputFiles(fixture('reuse-C4.wav'));await phase(page,'ready');
  await page.locator('#analyzeButton').click();await phase(page,'result');
  await expect(page.locator('#noteRows')).toContainText('C4 (60)');
  const first=await notes(page);expect(first.length).toBeGreaterThan(0);
  await page.locator('#analyzeButton').click();await phase(page,'result');expect(await notes(page)).toEqual(first);
  let probe=await snapshot(page);
  expect(probe.records).toHaveLength(1);expect(probe.live).toEqual([1]);
  expect(probe.posts.map(post=>[post.workerId,post.modelJson,post.weights])).toEqual([[1,true,true],[1,false,false]]);

  // A completed model survives an idle source replacement, but old notes/export do not.
  // Both change events occur in one task, before either async permission
  // continuation runs. The latest selection alone must install its source.
  await selectSameTick(page,[fixture('superseded-F4.wav',65),fixture('replacement-D4.wav',62)]);await phase(page,'ready');
  await expect(page.locator('#sourceName')).toHaveText('replacement-D4.wav');
  await expect(page.locator('#downloadButton')).toBeDisabled();await expect(page.locator('#noteRows .note-row')).toHaveCount(0);
  expect((await snapshot(page)).live).toEqual([1]);
  await page.locator('#analyzeButton').click();await phase(page,'result');
  await expect(page.locator('#noteRows')).toContainText('D4 (62)');const replacement=await notes(page);
  probe=await snapshot(page);expect(probe.records).toHaveLength(1);
  expect(probe.posts[2]).toMatchObject({workerId:1,modelJson:false,weights:false});

  await page.evaluate(()=>{window.__workerLifecycle.cancelOnAnalyzing=true;});
  await page.locator('#analyzeButton').click();
  await expect.poll(()=>page.evaluate(()=>window.__workerLifecycle.cancelledJob)).not.toBeNull();
  await phase(page,'result');expect(await notes(page)).toEqual(replacement);
  await expect(page.locator('#downloadButton')).toBeEnabled();
  probe=await snapshot(page);expect(probe.live).toEqual([]);expect(probe.records[0].terminated).toBe(true);
  expect(probe.revoked).toContain(probe.records[0].url);
  expect(probe.posts[3].jobId).toBe(probe.cancelledJob);

  await page.locator('#analyzeButton').click();await phase(page,'result');expect(await notes(page)).toEqual(replacement);
  probe=await snapshot(page);expect(probe.records).toHaveLength(2);expect(probe.live).toEqual([2]);
  expect(probe.posts[4]).toMatchObject({workerId:2,kind:'native',modelJson:true,weights:true});
  expect(probe.maxLive).toBe(1);
  expect(new Set(probe.posts.map(post=>post.jobId)).size).toBe(5);
  expect(probe.posts.every(post=>Number.isInteger(post.jobId)&&post.sampleCount===55125&&post.transferCount===1)).toBe(true);
  expect(probe.responses.length).toBeGreaterThan(0);
  expect(probe.responses.every(response=>probe.posts.some(post=>post.workerId===response.workerId&&post.jobId===response.jobId))).toBe(true);
  expect(probe.responses.filter(response=>response.phase==='complete')).toHaveLength(4);
  // A newly invalid source must also release the formerly idle native model.
  await page.locator('#audioFile').setInputFiles({name:'corrupt-replacement.wav',mimeType:'audio/wav',buffer:makeWav().subarray(0,12)});
  await phase(page,'error');await expect(page.locator('#noteRows .note-row')).toHaveCount(0);
  await expect(page.locator('#downloadButton')).toBeDisabled();
  probe=await snapshot(page);expect(probe.live).toEqual([]);
  expect(probe.records.every(record=>record.terminated&&probe.revoked.includes(record.url))).toBe(true);
  await page.locator('#resetButton').click();await page.locator('#appConfirmOk').click();await phase(page,'empty');
  probe=await snapshot(page);expect(probe.live).toEqual([]);
  expect(probe.records.every(record=>record.terminated&&probe.revoked.includes(record.url))).toBe(true);
  await finish(page,info,observed);
 });

 test(`${variant}: 100 protocol cancellation cycles release workers, then real inference succeeds`,async({page,context},info)=>{
  test.skip(variant==='deployed'&&!process.env.PREVIEW_URL,'Preview URL not supplied');
  test.setTimeout(180000);
  const observed=await open(page,context,variant,{protocol:true});
  await page.locator('#audioFile').setInputFiles(fixture('cancel-stress-C4.wav'));await phase(page,'ready');
  // This is lifecycle/protocol stress, not 100 real-model inference passes.
  for(let cycle=1;cycle<=100;cycle++){
   await page.locator('#analyzeButton').click();await posted(page,cycle);await phase(page,'analyzing');
   await page.locator('#cancelButton').click();await phase(page,'cancelled');
   const probe=await snapshot(page);
   expect(probe.live,`live workers after cancellation ${cycle}`).toEqual([]);
   expect(probe.records).toHaveLength(cycle);
   expect(probe.records[cycle-1].terminated).toBe(true);
   expect(probe.revoked).toContain(probe.records[cycle-1].url);
   await expect(page.locator('#downloadButton')).toBeDisabled();
  }
  let probe=await snapshot(page);expect(probe.maxLive).toBe(1);
  expect(probe.posts.every(post=>post.kind==='protocol'&&post.modelJson&&post.weights)).toBe(true);
  expect(new Set(probe.posts.map(post=>post.jobId)).size).toBe(100);
  await page.evaluate(()=>{window.__workerLifecycle.protocol=false;});
  await page.locator('#analyzeButton').click();await phase(page,'result');
  await expect(page.locator('#noteRows')).toContainText('C4 (60)');await expect(page.locator('#downloadButton')).toBeEnabled();
  probe=await snapshot(page);expect(probe.records).toHaveLength(101);expect(probe.live).toEqual([101]);
  expect(probe.posts.at(-1)).toMatchObject({workerId:101,kind:'native',modelJson:true,weights:true});
  expect(probe.responses.some(response=>response.workerId===101&&response.phase==='complete')).toBe(true);
  await page.locator('#resetButton').click();await page.locator('#appConfirmOk').click();await phase(page,'empty');
  probe=await snapshot(page);expect(probe.live).toEqual([]);expect(probe.maxLive).toBe(1);
  expect(probe.records.every(record=>record.terminated&&probe.revoked.includes(record.url))).toBe(true);
  await finish(page,info,observed);
 });

 test(`${variant}: protocol stale jobs, rapid replacement and hidden lifecycle preserve the current result`,async({page,context},info)=>{
  test.skip(variant==='deployed'&&!process.env.PREVIEW_URL,'Preview URL not supplied');
  const observed=await open(page,context,variant,{protocol:true});
  await page.locator('#audioFile').setInputFiles(fixture('old-C4.wav'));await phase(page,'ready');
  await page.locator('#analyzeButton').click();const old=await posted(page,1);await phase(page,'analyzing');
  // Hold B's file read so C definitely replaces it while B is still pending.
  await page.evaluate(()=>{window.__workerLifecycle.heldFiles.push('delayed-D4.wav');});
  await page.locator('#audioFile').setInputFiles(fixture('delayed-D4.wav',62));
  await expect.poll(()=>page.evaluate(()=>window.__workerLifecycle.waitingFiles.includes('delayed-D4.wav'))).toBe(true);
  await page.locator('#audioFile').setInputFiles(fixture('current-E4.wav',64));await phase(page,'ready');
  await page.evaluate(()=>window.__workerLifecycle.releaseFile('delayed-D4.wav'));
  await expect.poll(()=>page.evaluate(()=>window.__workerLifecycle.readFiles.includes('delayed-D4.wav'))).toBe(true);
  expect((await snapshot(page)).live).toEqual([]);
  for(const stale of [{jobId:old.jobId,phase:'analyzing',progress:1},{jobId:old.jobId,phase:'error'},complete(old.jobId,21)]){
   await emit(page,old.workerId,stale);await phase(page,'ready');
   await expect(page.locator('#sourceName')).toHaveText('current-E4.wav');await expect(page.locator('#downloadButton')).toBeDisabled();
   await expect(page.locator('#noteRows .note-row')).toHaveCount(0);
  }
  await page.locator('#analyzeButton').click();const current=await posted(page,2);
  await emit(page,current.workerId,complete(current.jobId,64));await phase(page,'result');
  const result=await notes(page);expect(result.map(note=>note.pitch)).toEqual([64]);
  await page.locator('#analyzeButton').click();const reused=await posted(page,3);await phase(page,'analyzing');
  expect(reused.workerId).toBe(current.workerId);expect(reused.jobId).not.toBe(current.jobId);
  expect(reused).toMatchObject({modelJson:false,weights:false});
  // Deliver obsolete job IDs to the NEW handler on the SAME reused worker.
  // Generation and worker-identity checks alone cannot reject these messages.
  for(const jobId of [current.jobId,undefined,null,String(reused.jobId)]){
   for(const stale of [{jobId,phase:'loading-model'},{jobId,phase:'postprocessing',progress:1},{jobId,phase:'error'},complete(jobId,21)]){
    await emit(page,reused.workerId,stale);await phase(page,'analyzing');expect(await notes(page)).toEqual(result);
    await expect(page.locator('#progressBar')).toHaveAttribute('value','0.25');
   }
  }
  await emit(page,reused.workerId,complete(reused.jobId,64));await phase(page,'result');
  // Idle replacement also keeps the worker, with a new source/job boundary.
  await page.locator('#audioFile').setInputFiles(fixture('final-G4.wav',67));await phase(page,'ready');
  await page.locator('#analyzeButton').click();const latest=await posted(page,4);await phase(page,'analyzing');
  expect(latest.workerId).toBe(reused.workerId);expect(latest.modelJson).toBe(false);
  await emit(page,latest.workerId,complete(reused.jobId,21));await phase(page,'analyzing');
  await expect(page.locator('#noteRows .note-row')).toHaveCount(0);
  await emit(page,latest.workerId,complete(latest.jobId,67));await phase(page,'result');
  await page.locator('#pitchUp').click();await page.locator('#pitchUp').click();await page.locator('#undoNoteButton').click();
  const edited=await notes(page);expect(edited.map(note=>note.pitch)).toEqual([68]);
  await expect(page.locator('#undoNoteButton')).toBeEnabled();await expect(page.locator('#redoNoteButton')).toBeEnabled();

  for(const boundary of ['hidden','pagehide']){
   const before=(await snapshot(page)).posts.length;
   await page.locator('#analyzeButton').click();await page.locator('#appConfirmOk').click();
   const interrupted=await posted(page,before+1);await phase(page,'analyzing');
   // Synthetic lifecycle dispatch tests app behavior deterministically. It does
   // not claim physical background-tab/BFCache eligibility coverage.
   await page.evaluate(boundary=>{
    if(boundary==='hidden'){
     Object.defineProperty(document,'hidden',{configurable:true,value:true});
     Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});
     document.dispatchEvent(new Event('visibilitychange'));
    }else{
     dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));
     dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
    }
   },boundary);
   await phase(page,'result');expect(await notes(page)).toEqual(edited);
   await expect(page.locator('#downloadButton')).toBeEnabled();await expect(page.locator('#noteDirty')).toBeVisible();
   await expect(page.locator('#undoNoteButton')).toBeEnabled();await expect(page.locator('#redoNoteButton')).toBeEnabled();
   let probe=await snapshot(page);expect(probe.live).toEqual([]);
   const record=probe.records.find(record=>record.id===interrupted.workerId);
   expect(record.terminated).toBe(true);expect(probe.revoked).toContain(record.url);
   await emit(page,interrupted.workerId,complete(interrupted.jobId,21));await phase(page,'result');expect(await notes(page)).toEqual(edited);
   if(boundary==='hidden')await page.evaluate(()=>{
    delete document.hidden;delete document.visibilityState;document.dispatchEvent(new Event('visibilitychange'));
   });
   probe=await snapshot(page);expect(probe.live).toEqual([]);expect(probe.posts).toHaveLength(before+1);
  }
  await page.locator('#redoNoteButton').click();expect((await notes(page)).map(note=>note.pitch)).toEqual([69]);
  await page.locator('#undoNoteButton').click();expect(await notes(page)).toEqual(edited);
  expect((await snapshot(page)).maxLive).toBe(1);
  await expect(page.locator('#sourceName')).toHaveText('final-G4.wav');
  // A shared loss-confirmation must reject both pending choices on Cancel and
  // choose only the latest file on approval, without displaying a second dialog.
  const simultaneous=[fixture('superseded-C4.wav'),fixture('accepted-D4.wav',62)];
  await selectSameTick(page,simultaneous);await page.locator('#appConfirmCancel').click();
  await phase(page,'result');expect(await notes(page)).toEqual(edited);
  await expect(page.locator('#sourceName')).toHaveText('final-G4.wav');await expect(page.locator('#appConfirmDialog')).not.toBeVisible();
  await selectSameTick(page,simultaneous);await page.locator('#appConfirmOk').click();await phase(page,'ready');
  await expect(page.locator('#sourceName')).toHaveText('accepted-D4.wav');await expect(page.locator('#appConfirmDialog')).not.toBeVisible();
  await expect(page.locator('#noteRows .note-row')).toHaveCount(0);await expect(page.locator('#downloadButton')).toBeDisabled();
  await finish(page,info,observed);
 });
}
