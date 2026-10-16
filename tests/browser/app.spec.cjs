const {test,expect}=require('@playwright/test');const path=require('node:path');const fs=require('node:fs');const {pathToFileURL}=require('node:url');
const {parseMidi}=require('midi-file');const {makeWav}=require('../fixtures.cjs');
const file=name=>pathToFileURL(path.join(__dirname,'../../dist',name)).href;
const upload=async(page,buffer,name='C4.wav')=>{await page.locator('#audioFile').setInputFiles({name,mimeType:'audio/wav',buffer});};
const phase=async(page,value)=>expect(page.locator('body')).toHaveAttribute('data-phase',value,{timeout:90000});
async function open(page,variant='index.html'){await page.goto(file(variant));await expect(page.locator('#audioFile')).toBeVisible();}
function midiNotes(bytes){const midi=parseMidi(bytes);let tick=0;const starts=new Map(),notes=[];for(const e of midi.tracks[1]){tick+=e.deltaTime;if(e.type==='noteOn'){if(!starts.has(e.noteNumber))starts.set(e.noteNumber,[]);starts.get(e.noteNumber).push(tick);}if(e.type==='noteOff')notes.push({pitch:e.noteNumber,start:starts.get(e.noteNumber).shift()/960,end:tick/960,channel:e.channel});}return {midi,notes};}
for(const variant of ['index.html','index.self-extract.html'])test(`${variant}: offline real inference and downloaded MIDI readback`,async({page,context},testInfo)=>{
 const requests=[],errors=[];page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});page.on('pageerror',e=>errors.push(e.message));await context.setOffline(true);await open(page,variant);
 await upload(page,makeWav());await phase(page,'ready');await page.locator('#analyzeButton').click();await phase(page,'result');
 await expect(page.locator('#noteRows')).toContainText('C4 (60)');await page.locator('#outputFilename').fill('私のメロディー.mid');
 const downloadPromise=page.waitForEvent('download');await page.locator('#downloadButton').click();const download=await downloadPromise;expect(download.suggestedFilename()).toBe('私のメロディー.mid');
 const bytes=fs.readFileSync(await download.path()),{midi,notes}=midiNotes(bytes);expect(midi.header.format).toBe(1);expect(midi.header.numTracks).toBe(2);expect(notes.some(n=>n.pitch===60&&Math.abs(n.start-.25)<.05&&Math.abs(n.end-2.25)<.05)).toBeTruthy();
 const rendered=await page.locator('#noteRows .note-row').evaluateAll(rows=>rows.map(row=>Array.from(row.children,x=>x.textContent)));
 expect(notes.length).toBe(rendered.length);for(const row of rendered){const pitch=Number(row[0].match(/\((\d+)\)/)[1]);expect(notes.some(n=>n.pitch===pitch&&Math.abs(n.start-Number(row[1]))<.002&&Math.abs(n.end-Number(row[2]))<.002)).toBeTruthy();}
 await testInfo.attach('downloaded-midi',{body:bytes,contentType:'audio/midi'});expect(requests).toEqual([]);expect(errors).toEqual([]);
 if(variant==='index.html'){await page.setViewportSize({width:1360,height:900});await page.screenshot({path:testInfo.outputPath('desktop-result.png'),fullPage:false});await page.locator('#languageButton').click();await page.screenshot({path:testInfo.outputPath('desktop-result-alternate-language.png'),fullPage:false});}
 await page.reload();await phase(page,'empty');await expect(page.locator('#downloadButton')).toBeDisabled();
});
test('silence, corrupt input, duration boundaries and retry',async({page})=>{
 await open(page);await upload(page,makeWav({notes:[],duration:1}),'silence.wav');await phase(page,'ready');await page.locator('#analyzeButton').click();await phase(page,'no-notes');await expect(page.locator('#downloadButton')).toBeDisabled();
 for(const duration of [.4,60.1]){await upload(page,makeWav({duration,notes:[],sampleRate:8000}));await phase(page,'error');await expect(page.locator('#statusHint')).toContainText(/0.5/);}
 await upload(page,Buffer.from('not an audio file'),'broken.wav');await phase(page,'error');
 await upload(page,makeWav({duration:.5,notes:[],sampleRate:48000,channels:2}),'retry.wav');await phase(page,'ready');await expect(page.locator('#sourceMeta')).toContainText('0.50');
});
test('cancel during inference, change source, reject stale result and repeated clicks',async({page})=>{
 await open(page);await upload(page,makeWav({duration:10,notes:[{pitch:60,start:.25,end:9.75}]}),'old.wav');await phase(page,'ready');await page.locator('#analyzeButton').dblclick();await phase(page,'analyzing');
 await page.locator('#cancelButton').click();await phase(page,'cancelled');await expect(page.locator('#downloadButton')).toBeDisabled();
 await page.locator('#analyzeButton').click();await phase(page,'analyzing');await upload(page,makeWav({duration:1,notes:[]}),'replacement.wav');await phase(page,'ready');await expect(page.locator('#sourceName')).toHaveText('replacement.wav');
 await page.locator('#analyzeButton').click();await phase(page,'no-notes');await expect(page.locator('#downloadButton')).toBeDisabled();
});
test('invalid replacement preserves result; reset cancellation and language keep state',async({page})=>{
 await open(page);await upload(page,makeWav());await phase(page,'ready');await page.locator('#analyzeButton').click();await phase(page,'result');const count=await page.locator('#noteCount').textContent();
 await upload(page,Buffer.alloc(50*1024*1024+1),'oversized.wav');await phase(page,'result');await expect(page.locator('#inputError')).toBeVisible();await expect(page.locator('#downloadButton')).toBeEnabled();
 await page.locator('#languageButton').click();await expect(page.locator('#noteCount')).toHaveText(count);
 await page.locator('#resetButton').click();await page.locator('#appConfirmCancel').click();await phase(page,'result');
 await page.locator('#resetButton').click();await page.locator('#appConfirmOk').click();await phase(page,'empty');
});
test('reset dialog cancellation during analysis does not strand job',async({page})=>{
 await open(page);await upload(page,makeWav());await phase(page,'ready');await page.locator('#analyzeButton').click();await phase(page,'analyzing');await page.locator('#resetButton').click();await page.locator('#appConfirmCancel').click();await phase(page,'result');
});
test('320px bilingual layout, help scroll, keyboard and stereo input',async({page},testInfo)=>{
 await page.setViewportSize({width:320,height:640});await open(page);await upload(page,makeWav({sampleRate:48000,channels:2}), '長いファイル名'.repeat(12)+'.wav');await phase(page,'ready');
 for(let i=0;i<2;i++){
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.locator('#helpButton').click();await expect(page.locator('#helpDialog')).toBeVisible();await page.locator('#licensesDetails').scrollIntoViewIfNeeded();await page.keyboard.press('Escape');await expect(page.locator('#helpDialog')).not.toBeVisible();await page.locator('#languageButton').click();
 }
 await page.locator('#analyzeButton').focus();await page.keyboard.press('Enter');await phase(page,'result');await expect(page.locator('#noteRows')).toContainText('C4 (60)');
 await page.screenshot({path:testInfo.outputPath('mobile-result.png'),fullPage:true});
});

test('BFCache lifecycle keeps completed MIDI and cancels interrupted analysis coherently',async({page})=>{
 await open(page);await upload(page,makeWav());await phase(page,'ready');await page.locator('#analyzeButton').click();await phase(page,'result');
 const count=await page.locator('#noteCount').textContent();
 await page.evaluate(()=>{dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});
 await phase(page,'result');await expect(page.locator('#noteCount')).toHaveText(count);await expect(page.locator('#downloadButton')).toBeEnabled();
 const saved=page.waitForEvent('download');await page.locator('#downloadButton').click();expect(midiNotes(fs.readFileSync(await (await saved).path())).notes.length).toBe(Number(count));
 await page.locator('#analyzeButton').click();await phase(page,'analyzing');
 await page.evaluate(()=>{dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});
 await phase(page,'cancelled');await expect(page.locator('#analyzeButton')).toBeEnabled();await expect(page.locator('#downloadButton')).toBeDisabled();
});
test('MP3 decoding and drag-and-drop use the same real inference path',async({page})=>{
 await open(page);const buffer=fs.readFileSync(path.join(__dirname,'../fixtures/c4.mp3'));
 const data=await page.evaluateHandle(bytes=>{const transfer=new DataTransfer();transfer.items.add(new File([new Uint8Array(bytes)],'drop-C4.mp3',{type:'audio/mpeg'}));return transfer;},Array.from(buffer));
 await page.locator('#dropZone').dispatchEvent('drop',{dataTransfer:data});await data.dispose();await phase(page,'ready');await expect(page.locator('#sourceName')).toHaveText('drop-C4.mp3');
 await page.locator('#analyzeButton').click();await phase(page,'result');await expect(page.locator('#noteRows')).toContainText('C4 (60)');
});
test('synthetic melody preserves distinct pitches and note time order',async({page})=>{
 await open(page);await upload(page,makeWav({duration:3.5,notes:[{pitch:60,start:.25,end:.95},{pitch:62,start:1.2,end:1.9},{pitch:64,start:2.15,end:3}]}),'melody.wav');await phase(page,'ready');await page.locator('#analyzeButton').click();await phase(page,'result');
 const rows=await page.locator('#noteRows').textContent();for(const pitch of ['C4 (60)','D4 (62)','E4 (64)'])expect(rows).toContain(pitch);
 const saved=page.waitForEvent('download');await page.locator('#downloadButton').click();const {notes}=midiNotes(fs.readFileSync(await (await saved).path()));
 for(const expected of [{pitch:60,start:.25},{pitch:62,start:1.2},{pitch:64,start:2.15}])expect(notes.some(n=>n.pitch===expected.pitch&&Math.abs(n.start-expected.start)<.07)).toBeTruthy();
});
