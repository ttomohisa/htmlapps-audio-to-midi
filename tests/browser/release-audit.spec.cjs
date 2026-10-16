// Bounded release checks, also suitable for optional Playwright engine projects.
// DOM/live-region assertions are not screen-reader or physical-device certification.
const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {parseMidi}=require('midi-file');
const {makeWav}=require('../fixtures.cjs');

const variants=['index.html','index.self-extract.html','deployed'];
const copy={
 en:{empty:'Ready when you are',emptyHint:'Choose a short audio file to begin.',emptyFile:/empty.*Choose/,error:'Could not finish',decode:/valid WAV or MP3/,noNotes:'No notes detected',noNotesHint:/clearer, louder recording/,help:'How to use & notes'},
 ja:{empty:'音声を選んで始めましょう',emptyHint:'短い音声ファイルを選んでください。',emptyFile:/空のファイル.*音声/,error:'処理を完了できませんでした',decode:/正常なWAVまたはMP3/,noNotes:'音符が見つかりませんでした',noNotesHint:/雑音の少ない環境/,help:'使い方と注意事項'}
};
const phase=(page,value)=>expect(page.locator('body')).toHaveAttribute('data-phase',value,{timeout:90000});
const upload=(page,buffer,name)=>page.locator('#audioFile').setInputFiles({name,mimeType:'audio/wav',buffer});
async function language(page,value){
 if(await page.locator('html').getAttribute('lang')!==value)await page.locator('#languageButton').click();
 await expect(page.locator('html')).toHaveAttribute('lang',value);
}
async function bilingual(page,check){
 for(const value of ['en','ja']){await language(page,value);await check(copy[value],value);}
 await language(page,'en');
}
async function openAudit(page,context,variant){
 test.skip(variant==='deployed'&&!process.env.PREVIEW_URL,'Run after the existing preview workflow returns PREVIEW_URL.');
 let url=pathToFileURL(path.join(__dirname,'../../dist',variant)).href;
 if(variant==='deployed'){
  const preview=new URL(process.env.PREVIEW_URL);
  expect(preview.protocol).toBe('https:');
  expect(preview.hostname.endsWith('.ttomohisa.workers.dev')).toBe(true);
  url=preview.href;
 }
 const errors=[],requests=[];
 let documentLoaded=false;
 const isEntryDocument=request=>variant==='deployed'&&!documentLoaded&&request.isNavigationRequest()&&request.frame()===page.mainFrame()&&request.url()===url;
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
 // Deny network before any app code runs. WebKit's offline emulation also
 // rejects file:// navigation, so enable it only after the local HTML loads.
 // Only the exact initial deployed document is allowed through the guard.
 await context.route(/^https?:/,route=>isEntryDocument(route.request())?route.continue():route.abort('blockedbyclient'));
 page.on('request',request=>{
  if(/^https?:/.test(request.url())&&!isEntryDocument(request))requests.push(request.url());
 });
 await page.goto(url);documentLoaded=true;await phase(page,'empty');await context.setOffline(true);
 await language(page,'en');
 return ()=>{expect(errors,'Browser console/page errors').toEqual([]);expect(requests,'Runtime HTTP(S) requests').toEqual([]);};
}
async function tabTo(page,selector){
 // Walk the actual tab order. Do not use locator.focus(), which can hide a
 // missing tabindex or an unreachable control from the keyboard audit.
 for(let step=0;step<90;step++){
  await page.keyboard.press('Tab');
  if(await page.locator(selector).evaluate(node=>node===document.activeElement)){
   await expect(page.locator(selector)).toBeFocused();
   const focus=await page.locator(selector).evaluate(node=>({visible:node.matches(':focus-visible'),width:parseFloat(getComputedStyle(node).outlineWidth),style:getComputedStyle(node).outlineStyle}));
   expect(focus.visible,`${selector} keyboard focus`).toBe(true);
   expect(focus.width,`${selector} focus outline`).toBeGreaterThan(0);
   expect(focus.style).not.toBe('none');
   return;
  }
 }
 throw new Error(`${selector} was not reachable in 90 Tab presses`);
}
async function download(page){
 const pending=page.waitForEvent('download');await page.locator('#downloadButton').click();const result=await pending;
 return {name:result.suggestedFilename(),bytes:fs.readFileSync(await result.path())};
}
function readMidi(bytes){
 const midi=parseMidi(bytes),notes=[],active=new Map();let tick=0;
 expect(midi.header.format).toBe(1);expect(midi.header.ticksPerBeat).toBe(480);
 expect(midi.tracks[0].find(event=>event.type==='setTempo').microsecondsPerBeat).toBe(500000);
 for(const event of midi.tracks[1]){
  tick+=event.deltaTime;
  if(event.type==='noteOn'){
   expect(event.channel).toBe(0);expect(event.velocity).toBe(96);
   if(!active.has(event.noteNumber))active.set(event.noteNumber,[]);
   active.get(event.noteNumber).push(tick/960);
  }
  if(event.type==='noteOff')notes.push([active.get(event.noteNumber).shift(),tick/960,event.noteNumber,96]);
 }
 expect([...active.values()].every(starts=>starts.length===0)).toBe(true);
 return notes.sort((a,b)=>a[0]-b[0]||a[2]-b[2]);
}
function readCsv(bytes){
 const lines=bytes.toString('utf8').trimEnd().split('\r\n');
 expect(lines.shift()).toBe('start_seconds,end_seconds,pitch_midi,velocity');
 return lines.map(line=>line.split(',').map(Number)).sort((a,b)=>a[0]-b[0]||a[2]-b[2]);
}
async function invalidSettingsAudit(page){
 const notes=await page.locator('#noteRows').textContent();
 const cases=[
  {values:{onsetThreshold:'1.1'},invalid:['onsetThreshold']},
  {values:{frameThreshold:'-0.1'},invalid:['frameThreshold']},
  {values:{minimumNoteSeconds:'0.001'},invalid:['minimumNoteSeconds']},
  {values:{minimumPitch:'-1'},invalid:['minimumPitch']},
  {values:{maximumPitch:'128'},invalid:['maximumPitch']},
  {values:{minimumPitch:'90',maximumPitch:'30'},invalid:['minimumPitch','maximumPitch']}
 ];
 for(const value of ['en','ja']){
  await language(page,value);
  for(const check of cases){
   await page.locator('#sensitivityPreset').selectOption('standard');
   if(!await page.locator('#detectionAdvanced').evaluate(node=>node.open))await page.locator('#detectionAdvanced summary').click();
   for(const [id,input] of Object.entries(check.values))await page.locator('#'+id).fill(input);
   await page.locator('#detectionAdvanced summary').click();
   await expect(page.locator('#detectionAdvanced')).not.toHaveAttribute('open');
   await page.locator('#analyzeButton').click();
   await expect(page.locator('#detectionAdvanced')).toHaveAttribute('open');
   await expect(page.locator('#'+check.invalid[0])).toBeFocused();
   for(const id of check.invalid){
    await expect(page.locator('#'+id)).toHaveAttribute('aria-invalid','true');
    await expect(page.locator('#'+id)).toHaveAttribute('aria-describedby',/detectionSettingsError/);
   }
   await expect(page.locator('#detectionSettingsError')).toBeVisible();
   await phase(page,'result');await expect(page.locator('#noteRows')).toHaveText(notes);
   await expect(page.locator('#downloadButton')).toBeEnabled();
  }
 }
 await page.locator('#sensitivityPreset').selectOption('standard');
 await expect(page.locator('#detectionSettingsError')).toBeHidden();
 for(const id of ['onsetThreshold','frameThreshold','minimumNoteSeconds','minimumPitch','maximumPitch'])await expect(page.locator('#'+id)).toHaveAttribute('aria-invalid','false');
 await page.locator('#detectionAdvanced summary').click();
 await language(page,'en');
}

for(const variant of variants){
 test(`${variant}: release audit bilingual recovery, edited exports and narrow layouts`,async({page,context},info)=>{
  test.setTimeout(180000);
  await page.setViewportSize({width:1360,height:900});
  const assertClean=await openAudit(page,context,variant);
  await bilingual(page,async text=>{
   await phase(page,'empty');await expect(page.locator('#statusText')).toHaveText(text.empty);await expect(page.locator('#statusHint')).toHaveText(text.emptyHint);
   await expect(page.locator('#analyzeButton')).toBeDisabled();await expect(page.locator('#downloadButton')).toBeDisabled();
  });
  await upload(page,Buffer.alloc(0),'empty.wav');
  await bilingual(page,async text=>{await phase(page,'empty');await expect(page.locator('#inputError')).toHaveText(text.emptyFile);});
  await upload(page,Buffer.from('Synthetic invalid WAV fixture'),'broken.wav');await phase(page,'error');
  await bilingual(page,async text=>{
   await expect(page.locator('#statusText')).toHaveText(text.error);await expect(page.locator('#statusHint')).toHaveText(text.decode);
   await expect(page.locator('#downloadButton')).toBeDisabled();
  });
  await upload(page,makeWav({duration:1,notes:[]}),'silence.wav');await phase(page,'ready');
  await expect(page.locator('#inputError')).toBeHidden();
  await page.locator('#analyzeButton').click();await phase(page,'no-notes');
  await bilingual(page,async text=>{
   await phase(page,'no-notes');await expect(page.locator('#statusText')).toHaveText(text.noNotes);await expect(page.locator('#statusHint')).toHaveText(text.noNotesHint);
   await expect(page.locator('#noteCount')).toHaveText('0');await expect(page.locator('#downloadButton')).toBeDisabled();await expect(page.locator('#analyzeButton')).toBeEnabled();
  });
  // Real embedded-model inference, never a stub or injected result. The fixture
  // is synthesized in memory and contains no recording or personal information.
  const melody=makeWav({duration:6.5,notes:[
   {pitch:60,start:.25,end:.95},{pitch:62,start:1.1,end:1.6},{pitch:64,start:1.75,end:2.45},
   {pitch:67,start:2.6,end:3.3},{pitch:64,start:3.45,end:4.15},{pitch:62,start:4.3,end:5},{pitch:60,start:5.15,end:6.15}
  ]});
  await upload(page,melody,'melody-sketch.wav');await phase(page,'ready');
  await tabTo(page,'#analyzeButton');await page.keyboard.press('Enter');await phase(page,'result');
  for(const pitch of ['C4 (60)','D4 (62)','E4 (64)','G4 (67)'])await expect(page.locator('#noteRows')).toContainText(pitch);
  const count=Number(await page.locator('#noteCount').textContent());expect(count).toBeGreaterThanOrEqual(7);
  await expect(page.locator('#downloadButton')).toBeEnabled();
  await invalidSettingsAudit(page);
  if(variant==='index.html'){
   for(const value of ['en','ja']){
    await language(page,value);
    await page.evaluate(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));
    await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);
    await expect(page.locator('#pianoRoll [data-note-id]').first()).toBeInViewport();
    const screenshot=info.outputPath(`release-desktop-${value}.png`);
    await page.screenshot({path:screenshot,fullPage:false});
    await info.attach(`release-desktop-${value}`,{path:screenshot,contentType:'image/png'});
   }
   await language(page,'en');
  }
  await tabTo(page,'#notePicker');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#selectedNoteDetails')).not.toHaveAttribute('data-note-id','');
  await page.locator('#notePicker').selectOption({index:0});
  await tabTo(page,'#editPitch');await page.keyboard.press('ControlOrMeta+A');await page.keyboard.type('C#4');
  await page.locator('#editStart').fill('0.125');await page.locator('#editEnd').fill('0.875');
  await tabTo(page,'#applyNoteButton');await page.keyboard.press('Enter');await expect(page.locator('#noteEditError')).toBeHidden();
  await expect(page.locator('#noteDirty')).toBeVisible();
  await tabTo(page,'#outputFormat');await page.locator('#outputFormat').selectOption('csv');
  await tabTo(page,'#outputFilename');await page.keyboard.press('ControlOrMeta+A');await page.keyboard.type('release-audit-notes');
  await tabTo(page,'#downloadButton');const csv=await download(page);expect(csv.name).toBe('release-audit-notes.csv');
  const rows=readCsv(csv.bytes);expect(rows).toHaveLength(count);expect(rows[0]).toEqual([.125,.875,61,96]);
  await page.locator('#outputFormat').selectOption('mid');const midi=await download(page);expect(midi.name).toBe('release-audit-notes.mid');
  const decoded=readMidi(midi.bytes);expect(decoded).toHaveLength(rows.length);
  for(let i=0;i<rows.length;i++){
   expect(decoded[i].slice(2)).toEqual(rows[i].slice(2));
   expect(Math.abs(decoded[i][0]-rows[i][0])).toBeLessThanOrEqual(1/960);
   expect(Math.abs(decoded[i][1]-rows[i][1])).toBeLessThanOrEqual(1/960);
  }
  await info.attach('release-edited-notes.csv',{body:csv.bytes,contentType:'text/csv'});
  await info.attach('release-edited-notes.mid',{body:midi.bytes,contentType:'audio/midi'});
  for(const width of [320,360,390]){
   await page.setViewportSize({width,height:640});
   await bilingual(page,async()=>{
    for(const key of ['input','notes','export']){
     await page.locator(`[data-mobile-key="${key}"]`).click();
     expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}px ${key} result overflow`).toBe(true);
    }
    await expect(page.locator('#downloadButton')).toBeEnabled();
   });
  }
  await page.setViewportSize({width:1360,height:900});
  // Long source names are inspected on input/review pages without more inference.
  const longName='長いメロディーの録音ファイル名-'.repeat(10)+'synthetic.wav';
  await upload(page,melody,longName);await phase(page,'ready');await expect(page.locator('#sourceName')).toHaveText(longName);
  for(const width of [320,360,390]){
   await page.setViewportSize({width,height:640});
   await bilingual(page,async()=>{
    for(const key of ['input','notes']){
     await page.locator(`[data-mobile-key="${key}"]`).click();
     expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}px ${key} page overflow`).toBe(true);
    }
    await page.locator('[data-mobile-key="input"]').click();
    const bounds=await page.locator('#sourceName').boundingBox();expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(width);
    await expect(page.locator('[data-mobile-key="export"]')).toBeDisabled();
   });
  }
  assertClean();
 });

 test(`${variant}: release audit short-screen help, keyboard focus and reduced motion`,async({page,context})=>{
  const assertClean=await openAudit(page,context,variant);
  // Real emulated OS preference + computed styles; not an assistive-technology test.
  await page.emulateMedia({reducedMotion:'reduce'});
  expect(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  for(const selector of ['#languageButton','#helpButton','#appToast']){
   const motion=await page.locator(selector).evaluate(node=>{const css=getComputedStyle(node);return {scroll:css.scrollBehavior,transition:css.transitionDuration.split(',').map(parseFloat),animation:css.animationDuration.split(',').map(parseFloat)};});
   expect(motion.scroll).toBe('auto');expect(motion.transition.every(seconds=>seconds<=.00001)).toBe(true);expect(motion.animation.every(seconds=>seconds<=.00001)).toBe(true);
  }
  await expect(page.locator('.status-panel')).toHaveAttribute('role','status');await expect(page.locator('.status-panel')).toHaveAttribute('aria-live','polite');await expect(page.locator('.status-panel')).toHaveAttribute('aria-atomic','true');
  await expect(page.locator('#progressBar')).toHaveAttribute('aria-labelledby','statusText');await expect(page.locator('#progressBar')).toHaveAttribute('aria-describedby','statusHint');
  await expect(page.locator('#inputError')).toHaveAttribute('role','alert');await expect(page.locator('#noteEditError')).toHaveAttribute('aria-live','polite');await expect(page.locator('#appToast')).toHaveAttribute('aria-live','polite');
  await tabTo(page,'#languageButton');await page.keyboard.press('Enter');await expect(page.locator('html')).toHaveAttribute('lang','ja');
  await tabTo(page,'#audioFile');await expect(page.locator('#audioFile')).toHaveAccessibleName(/音声/);
  for(const width of [1360,320]){
   await page.setViewportSize({width,height:480});
   for(const value of ['en','ja']){
    await language(page,value);await tabTo(page,'#helpButton');
    await page.evaluate(()=>window.scrollTo({top:180,behavior:'instant'}));
    const before=await page.evaluate(()=>({y:scrollY,top:document.querySelector('#inputTitle').getBoundingClientRect().top}));expect(before.y).toBeGreaterThan(0);
    await page.keyboard.press('Enter');await expect(page.locator('#helpDialog')).toBeVisible();await expect(page.locator('#helpTitle')).toHaveText(copy[value].help);
    await expect(page.locator('body')).toHaveCSS('position','fixed');
    await page.mouse.move(1,240);await page.mouse.wheel(0,450);
    expect(Math.abs(await page.locator('#inputTitle').evaluate(node=>node.getBoundingClientRect().top)-before.top)).toBeLessThan(1);
    const body=page.locator('#helpDialog .dialog-body'),last=page.locator('#helpDialog [data-i18n="helpExport"]');
    await body.hover();await page.mouse.wheel(0,500);
    await expect.poll(()=>body.evaluate(node=>node.scrollTop)).toBeGreaterThan(0);
    await last.scrollIntoViewIfNeeded();
    const geometry=await last.evaluate(node=>{const last=node.getBoundingClientRect(),body=node.closest('.dialog-body').getBoundingClientRect(),dialog=node.closest('dialog').getBoundingClientRect();return {lastTop:last.top,lastBottom:last.bottom,bodyTop:body.top,bodyBottom:body.bottom,dialogTop:dialog.top,dialogBottom:dialog.bottom,height:innerHeight};});
    expect(geometry.lastTop).toBeGreaterThanOrEqual(geometry.bodyTop-1);expect(geometry.lastBottom).toBeLessThanOrEqual(geometry.bodyBottom+1);
    expect(geometry.dialogTop).toBeGreaterThanOrEqual(0);expect(geometry.dialogBottom).toBeLessThanOrEqual(geometry.height);
    await expect(page.locator('#closeHelpButton')).toBeInViewport();
    // Native Tab may visit browser chrome (body in Chromium, the last focused
    // control retained in Firefox). Do not assume forward Tab wraps around.
    // Check both directions and require keyboard return to Close, while never
    // permitting a background element to receive focus.
    await expect(page.locator('#closeHelpButton')).toBeFocused();
    let returnedToClose=false;
    for(const key of ['Tab','Shift+Tab']){
     for(let step=0;step<4;step++){
      await page.keyboard.press(key);
      const focus=await page.evaluate(()=>{const active=document.activeElement;return {allowed:active===document.body||!!active.closest('#helpDialog'),close:active.id==='closeHelpButton',tag:active.tagName,id:active.id};});
      expect(focus.allowed,`Modal ${key} reached ${focus.tag}#${focus.id}`).toBe(true);
      await expect(page.locator('#helpDialog')).toBeVisible();
      if(focus.close){returnedToClose=true;break;}
     }
     if(returnedToClose)break;
    }
    expect(returnedToClose,'Modal Tab/Shift+Tab must return from browser chrome/dialog content to Close').toBe(true);
    await expect(page.locator('#closeHelpButton')).toBeFocused();
    await page.keyboard.press('Escape');await expect(page.locator('#helpDialog')).toBeHidden();await expect(page.locator('body')).not.toHaveCSS('position','fixed');await expect(page.locator('#helpButton')).toBeFocused();
    await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(before.y);
    await page.mouse.move(width-2,240);await page.mouse.wheel(0,60);await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(before.y);
   }
  }
  assertClean();
 });
}
