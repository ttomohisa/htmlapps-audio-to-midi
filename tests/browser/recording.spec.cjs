const {test,expect}=require('@playwright/test'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{pathToFileURL}=require('node:url');
const {makeWav}=require('../fixtures.cjs'),{instrumentMicrophone,checkRecording}=require('./recording-check.cjs');
// Chromium's native virtual microphone reads this synthetic WAV in a loop.
// https://chromium.googlesource.com/chromium/src/+/main/media/base/media_switches.cc
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'audio-midi-virtual-mic-')),wav=path.join(directory,'C4.wav');
fs.writeFileSync(wav,makeWav({duration:12,notes:[{pitch:60,start:0,end:12}]}));
test.use({launchOptions:{args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream',`--use-file-for-fake-audio-capture=${wav}`]}});
test.afterAll(()=>fs.rmSync(directory,{recursive:true,force:true}));
const file=variant=>pathToFileURL(path.join(__dirname,'../../dist',variant)).href;
for(const variant of ['index.html','index.self-extract.html'])test(`${variant}: native virtual microphone records, decodes and exports MIDI offline`,async({page,context},testInfo)=>{
 await instrumentMicrophone(page);await context.setOffline(true);await page.goto(file(variant));await expect(page.locator('body')).toHaveAttribute('data-phase','empty');await expect(page.locator('#recordingLocalHint')).toBeVisible();
 await checkRecording(page,context,testInfo,{mobile:variant==='index.html'});
});
test('recording denial, missing device and unsupported MIME preserve file fallback without an initial prompt',async({page})=>{
 await page.addInitScript(()=>{window.__calls=0;window.__micError='NotAllowedError';navigator.mediaDevices.getUserMedia=async()=>{window.__calls++;throw new DOMException('test error',window.__micError);};});
 await page.goto(file('index.html'));expect(await page.evaluate(()=>window.__calls)).toBe(0);await page.locator('#recordButton').click();await expect(page.locator('#recordingError')).toContainText(/permission|許可/);expect(await page.evaluate(()=>window.__calls)).toBe(1);
 await page.evaluate(()=>window.__micError='NotFoundError');await page.locator('#recordButton').click();await expect(page.locator('#recordingError')).toContainText(/microphone was found|見つかり/);
 await page.evaluate(()=>MediaRecorder.isTypeSupported=()=>false);await page.locator('#recordButton').click();await expect(page.locator('#recordingError')).toContainText(/format|形式/);
 await page.locator('#audioFile').setInputFiles({name:'fallback.wav',mimeType:'audio/wav',buffer:makeWav()});await expect(page.locator('body')).toHaveAttribute('data-phase','ready');await expect(page.locator('#analyzeButton')).toBeEnabled();
});
test('active recording reset cancellation, discard, hidden and late permission cleanup',async({page})=>{
 await instrumentMicrophone(page);await page.goto(file('index.html'));await page.locator('#recordButton').click();await expect(page.locator('#recordingPanel')).toHaveAttribute('data-recording','recording');
 await page.locator('#resetButton').click();await page.locator('#appConfirmCancel').click();await expect(page.locator('#recordingPanel')).toHaveAttribute('data-recording','recording');
 await page.locator('#resetButton').click();await page.locator('#appConfirmOk').click();await expect(page.locator('body')).toHaveAttribute('data-phase','empty');expect(await page.evaluate(()=>window.__micTracks.every(t=>t.readyState==='ended'))).toBe(true);
 await page.locator('#recordButton').click();await expect(page.locator('#recordingPanel')).toHaveAttribute('data-recording','recording');await page.waitForTimeout(1000);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.locator('body')).toHaveAttribute('data-phase','ready');expect(await page.evaluate(()=>window.__micTracks.every(t=>t.readyState==='ended'))).toBe(true);
 await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,value:false}));
 await page.locator('#discardRecording').click();await page.locator('#appConfirmCancel').click();await expect(page.locator('body')).toHaveAttribute('data-phase','ready');
 await page.locator('#discardRecording').click();await page.locator('#appConfirmOk').click();await expect(page.locator('body')).toHaveAttribute('data-phase','empty');
 // File replacement while permission is pending must confirm, then stop any late-granted track.
 const previousTracks=await page.evaluate(()=>window.__micTracks.length);await page.evaluate(()=>window.__micHold=true);
 await page.locator('#recordButton').click();await expect(page.locator('#recordingPanel')).toHaveAttribute('data-recording','requesting');
 const replacement={name:'pending-replacement.wav',mimeType:'audio/wav',buffer:makeWav()};
 await page.locator('#audioFile').setInputFiles(replacement);await expect(page.locator('#appConfirmDialog')).toBeVisible();await page.locator('#appConfirmCancel').click();await expect(page.locator('#recordingPanel')).toHaveAttribute('data-recording','requesting');
 await page.locator('#audioFile').setInputFiles(replacement);await page.locator('#appConfirmOk').click();await expect(page.locator('body')).toHaveAttribute('data-phase','ready');await page.evaluate(()=>window.__grant());
 await expect.poll(()=>page.evaluate(()=>window.__micTracks.length)).toBe(previousTracks+1);await expect.poll(()=>page.evaluate(()=>window.__micTracks.every(t=>t.readyState==='ended'))).toBe(true);await expect(page.locator('body')).toHaveAttribute('data-phase','ready');await expect(page.locator('#sourceName')).toHaveText('pending-replacement.wav');
});

test('deployed recording preview works offline with native virtual microphone',async({page,context},testInfo)=>{
 test.skip(!process.env.PREVIEW_URL,'Ordinary preview workflow only');await instrumentMicrophone(page);await page.goto(process.env.PREVIEW_URL);await expect(page.locator('body')).toHaveAttribute('data-phase','empty');await checkRecording(page,context,testInfo,{mobile:true});
});
