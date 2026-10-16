const {expect}=require('@playwright/test'),fs=require('node:fs'),{parseMidi}=require('midi-file');
async function instrumentMicrophone(page){
 await page.addInitScript(()=>{
  window.__micCalls=0;window.__micTracks=[];
  if(navigator.mediaDevices?.getUserMedia){const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async constraints=>{window.__micCalls++;if(window.__micHold)await new Promise(resolve=>window.__grant=resolve);const stream=await original(constraints);window.__micTracks.push(...stream.getTracks());return stream;};}
 });
}
async function checkRecording(page,context,testInfo,{mobile=false}={}){
 const errors=[],requests=[];page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(/^https?:/.test(request.url()))requests.push(request.url());});await context.setOffline(true);
 expect(await page.evaluate(()=>window.__micCalls)).toBe(0);
 if(mobile)await page.setViewportSize({width:390,height:700});
 await page.locator('#recordButton').click();await expect(page.locator('#recordingPanel')).toHaveAttribute('data-recording','recording');
 expect(await page.evaluate(()=>window.__micCalls)).toBe(1);await expect(page.locator('#analyzeButton')).toBeDisabled();await expect(page.locator('#playButton')).toBeDisabled();
 await expect.poll(()=>page.locator('#recordingMeter').evaluate(el=>el.value)).toBeGreaterThan(.01);
 // Real native encoder sees a deterministic C4 virtual device, not user audio.
 await page.waitForTimeout(2200);
 if(mobile){
  await page.locator('[data-mobile-key="notes"]').click();await expect(page.locator('#appConfirmDialog')).toBeVisible();await page.locator('#appConfirmCancel').click();await expect(page.locator('#recordingPanel')).toHaveAttribute('data-recording','recording');
  await page.locator('[data-mobile-key="notes"]').click();await page.locator('#appConfirmOk').click();
 }else await page.locator('#stopRecordButton').click();
 await expect(page.locator('body')).toHaveAttribute('data-phase','ready');await expect(page.locator('#recordingPanel')).toHaveAttribute('data-recording','recorded');
 expect(await page.evaluate(()=>window.__micTracks.every(track=>track.readyState==='ended'))).toBe(true);
 expect(await page.locator('#noteCount').textContent()).toBe('—');await expect(page.locator('#downloadButton')).toBeDisabled();
 if(mobile)await page.locator('[data-mobile-key="input"]').click();
 await page.locator('#listenRecording').click();await expect(page.locator('#reviewCard')).toHaveAttribute('data-playback','playing');await page.locator('#stopButton').click();
 if(mobile)await page.locator('[data-mobile-key="input"]').click();
 await page.locator('.recording-export summary').click();await page.locator('#recordingFilename').fill('my-recording');
 const recordingPending=page.waitForEvent('download');await page.locator('#downloadRecording').click();const recording=await recordingPending;
 expect(recording.suggestedFilename()).toMatch(/^my-recording\.(webm|ogg|m4a)$/);
 const original=fs.readFileSync(await recording.path());expect(original.length).toBeGreaterThan(1000);
 const decoded=await page.evaluate(async bytes=>{const audio=new AudioContext();try{const result=await audio.decodeAudioData(Uint8Array.from(bytes).buffer);const data=result.getChannelData(0),a=Math.round(.5*result.sampleRate),b=Math.round(1.5*result.sampleRate);let crossings=0;for(let i=a;i<b;i++)if(data[i-1]<=0&&data[i]>0)crossings++;return{duration:result.duration,frequency:crossings};}finally{await audio.close();}},Array.from(original));
 expect(decoded.duration).toBeGreaterThan(2);expect(decoded.duration).toBeLessThan(12);expect(Math.abs(decoded.frequency-261.63)).toBeLessThan(4);
 await testInfo.attach('native-recorded-audio',{body:original,contentType:'application/octet-stream'});
 await page.locator('#analyzeButton').click();await expect(page.locator('body')).toHaveAttribute('data-phase','result',{timeout:90000});await expect(page.locator('#noteRows')).toContainText('C4 (60)');
 if(mobile)await page.locator('[data-mobile-key="export"]').click();
 await page.locator('#outputFilename').fill('recorded-C4');const pending=page.waitForEvent('download');await page.locator('#downloadButton').click();const output=await pending;expect(output.suggestedFilename()).toBe('recorded-C4.mid');
 const midi=parseMidi(fs.readFileSync(await output.path()));expect(midi.header.format).toBe(1);expect(midi.tracks).toHaveLength(2);
 const expected=await page.locator('#noteRows .note-row').evaluateAll(rows=>rows.map(row=>({pitch:Number(row.children[0].textContent.match(/\((\d+)\)/)[1]),start:Number(row.children[1].textContent),end:Number(row.children[2].textContent)})));
 let ticks=0;const starts=new Map(),notes=[];for(const event of midi.tracks[1]){ticks+=event.deltaTime;if(event.type==='noteOn')starts.set(event.noteNumber,ticks/960);if(event.type==='noteOff')notes.push({pitch:event.noteNumber,start:starts.get(event.noteNumber),end:ticks/960});}
 for(const note of expected)expect(notes.some(n=>n.pitch===note.pitch&&Math.abs(n.start-note.start)<.002&&Math.abs(n.end-note.end)<.002)).toBe(true);
 expect(notes.some(n=>n.pitch===60&&n.start<.3&&n.end>decoded.duration-.4)).toBe(true);
 if(mobile){
  for(const width of [320,360,390]){await page.setViewportSize({width,height:560});for(const tab of ['input','notes','export']){await page.locator(`[data-mobile-key="${tab}"]`).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.locator('.app-mobile-page:visible')).toHaveCount(1);await expect(page.locator(`[data-mobile-key="${tab}"]`)).toHaveAttribute('aria-current','page');}await page.screenshot({path:testInfo.outputPath(`recording-export-${width}.png`)});}
  await page.locator('[data-mobile-key="input"]').click();await page.locator('#languageButton').click();await page.screenshot({path:testInfo.outputPath('recording-input-ja.png'),fullPage:true});await page.locator('[data-mobile-key="notes"]').click();await page.screenshot({path:testInfo.outputPath('recording-notes-ja.png'),fullPage:true});await page.locator('[data-mobile-key="input"]').click();
 }
 // Downloaded format must return through the ordinary file decoder and inference path.
 await page.locator('#audioFile').setInputFiles({name:recording.suggestedFilename(),mimeType:'audio/'+(recording.suggestedFilename().endsWith('m4a')?'mp4':'webm'),buffer:original});await expect(page.locator('body')).toHaveAttribute('data-phase','ready');await expect(page.locator('#sourceName')).toHaveText(recording.suggestedFilename());await expect(page.locator('#recordingResult')).not.toBeVisible();
 expect(errors).toEqual([]);expect(requests).toEqual([]);
}
module.exports={instrumentMicrophone,checkRecording};
