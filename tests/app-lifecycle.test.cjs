const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../src/app-ui.js'),'utf8');
const core=require('../src/audio-core.js');
function lifecycle(){
 const events=[],context={generation:core.createGeneration(),state:{phase:'ready'},worker:{terminate:()=>events.push('terminate')},workerUrl:'blob:test',decodeContext:null,URL:{revokeObjectURL:url=>events.push(url)}};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('const busy='),source.indexOf('function pitchName')),context);
 return {context,events,run:text=>vm.runInContext(text,context)};
}
test('idle worker survives source change; reset releases it and URL exactly once',()=>{
 const {run,events}=lifecycle();assert.equal(run('invalidate({keepIdleWorker:true})'),1);assert.deepEqual(events,[]);
 run('invalidate()');run('invalidate()');assert.deepEqual(events,['terminate','blob:test']);assert.equal(run('worker'),null);
});
test('100 active replacement/cancel cycles release workers without retaining URL ownership',()=>{
 const {context,events,run}=lifecycle();
 for(let i=0;i<100;i++){
  context.state.phase=['loading-model','analyzing','postprocessing','decoding'][i%4];
  context.worker={terminate:()=>events.push('terminate')};context.workerUrl='blob:'+i;
  run('invalidate({keepIdleWorker:true})');assert.equal(context.worker,null);assert.equal(context.workerUrl,null);
 }
 assert.equal(events.filter(x=>x==='terminate').length,100);assert.equal(new Set(events.filter(x=>x.startsWith('blob:'))).size,100);
});
test('worker response requires matching source generation, worker and job ID',()=>{
 const handler=source.slice(source.indexOf('activeWorker.onmessage=event=>{'),source.indexOf('  activeWorker.onerror='));
 let renders=0;const activeWorker={};const generation=core.createGeneration();const token=generation.next();
 const context={activeWorker,worker:activeWorker,generation,token,state:{phase:'analyzing',duration:2,notes:[]},render:()=>renders++,previousCount:0,editor:null,editRevision:0,editError:null,core,AudioMidiEditing:require('../src/editing-core.js'),restoreAnalysis:()=>{},stopWorker:()=>{}};
 vm.createContext(context);vm.runInContext(handler,context);
 const complete={phase:'complete',jobId:token,notes:[{pitchMidi:60,startSeconds:.2,endSeconds:1,velocity:96,origin:'detected'}],elapsedMs:10};
 activeWorker.onmessage({data:{...complete,jobId:token-1}});assert.equal(renders,0);
 context.worker={};activeWorker.onmessage({data:complete});assert.equal(renders,0);
 context.worker=activeWorker;activeWorker.onmessage({data:complete});assert.equal(renders,1);assert.equal(context.state.notes.length,1);
 generation.next();activeWorker.onmessage({data:{phase:'analyzing',jobId:token,progress:.1}});assert.equal(renders,1);assert.equal(context.state.phase,'result');
});
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
function selections(permission){
 const reads=[],generation=core.createGeneration();let confirmationCalls=0,replacementCalls=0,stops=0;
 class Decoder{constructor(){this.state='running';}close(){this.state='closed';return Promise.resolve();}async decodeAudioData(){return {duration:1,sampleRate:22050,numberOfChannels:1,getChannelData:()=>new Float32Array(22050)};}}
 const context={sourceRequest:0,sourcePermission:null,decodeContext:null,generation,core,state:{phase:'ready'},window:{AudioContext:Decoder,OfflineAudioContext:class{},Worker:class{}},outputFilename:{value:''},confirmEdits:()=>{confirmationCalls++;return permission.promise;},recording:{replace:async()=>{replacementCalls++;return true;}},clearEditing(){},invalidate:()=>generation.next(),render(){},stopWorker:()=>stops++,closeDecoder:()=>{context.decodeContext=null;}};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('async function selectFiles('),source.indexOf('async function analyze(')),context);
 const file=name=>({name:name+'.wav',size:20,type:'audio/wav',async arrayBuffer(){reads.push(name);return new ArrayBuffer(1);}});
 return {context,reads,file,calls:()=>({confirmationCalls,replacementCalls,stops})};
}
test('simultaneous valid file requests share confirmation and only newest source decodes',async()=>{
 const permission=deferred(),{context,reads,file,calls}=selections(permission);
 const a=context.selectFiles([file('old')]),b=context.selectFiles([file('new')]);permission.resolve(true);
 assert.equal(await a,false);assert.equal(await b,true);assert.deepEqual(reads,['new']);assert.equal(context.state.file.name,'new.wav');assert.deepEqual(calls(),{confirmationCalls:1,replacementCalls:1,stops:0});
});
test('cancelled shared replacement does not prompt again or replace either source',async()=>{
 const permission=deferred(),{context,reads,file,calls}=selections(permission);
 const a=context.selectFiles([file('old')]),b=context.selectFiles([file('new')]);permission.resolve(false);
 assert.equal(await a,false);assert.equal(await b,false);assert.deepEqual(reads,[]);assert.deepEqual(calls(),{confirmationCalls:1,replacementCalls:0,stops:0});
});
test('another generation boundary invalidates pending source permission',async()=>{
 const permission=deferred(),{context,reads,file}=selections(permission);
 const pending=context.selectFiles([file('old')]);context.generation.next();permission.resolve(true);
 assert.equal(await pending,false);assert.deepEqual(reads,[]);
});
test('new request during pending recording discard shares that decision and wins',async()=>{
 const permission=deferred(),recordingPermission=deferred(),{context,reads,file}=selections(permission);let replacements=0;
 context.recording.replace=()=>{replacements++;return recordingPermission.promise;};
 const old=context.selectFiles([file('old')]);permission.resolve(true);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(replacements,1);const latest=context.selectFiles([file('latest')]);recordingPermission.resolve(true);
 assert.equal(await old,false);assert.equal(await latest,true);assert.equal(replacements,1);assert.deepEqual(reads,['latest']);
});
