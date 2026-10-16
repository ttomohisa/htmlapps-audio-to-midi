const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path');const {pathToFileURL}=require('node:url');
const {makeWav}=require('../fixtures.cjs');
async function phase(page,value){await expect(page.locator('body')).toHaveAttribute('data-phase',value,{timeout:90000});}
async function notes(page){return page.locator('#pianoRoll [data-note-id]').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.noteId,pitch:n.dataset.pitch,start:n.dataset.start,end:n.dataset.end})));}
for(const variant of ['index.html','index.self-extract.html','deployed'])test(`${variant}: settings, history, preserved reanalysis and approved icon`,async({page,context},info)=>{
 test.skip(variant==='deployed'&&!process.env.PREVIEW_URL,'Preview URL not supplied');
 const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
 await page.goto(variant==='deployed'?process.env.PREVIEW_URL:pathToFileURL(path.join(__dirname,'../../dist',variant)).href);requests.length=0;await context.setOffline(true);
 const icon=fs.readFileSync(path.join(__dirname,'../../assets/favicon.svg'),'utf8');expect(await page.locator('link[rel="icon"]').getAttribute('href')).toBe('data:image/svg+xml;base64,'+Buffer.from(icon).toString('base64'));
 await page.locator('#audioFile').setInputFiles({name:'settings-C4.wav',mimeType:'audio/wav',buffer:makeWav()});await phase(page,'ready');
 await page.locator('#analyzeButton').click();await phase(page,'result');const original=await notes(page);
 await page.locator('#pitchUp').click();const edited=await notes(page);await page.locator('#undoNoteButton').click();expect(await notes(page)).toEqual(original);await expect(page.locator('#noteDirty')).not.toBeVisible();await page.locator('#redoNoteButton').click();expect(await notes(page)).toEqual(edited);
 await page.locator('#pitchUp').focus();await page.keyboard.press('Control+z');expect(await notes(page)).toEqual(original);await page.keyboard.press('Control+Shift+z');expect(await notes(page)).toEqual(edited);
 await page.locator('#sensitivityPreset').selectOption('more');expect(await notes(page)).toEqual(edited);await page.locator('#analyzeButton').click();await page.locator('#appConfirmCancel').click();expect(await notes(page)).toEqual(edited);
 await page.locator('#detectionAdvanced').evaluate(el=>el.open=true);await page.locator('#minimumPitch').fill('100');await page.locator('#maximumPitch').fill('40');await page.locator('#analyzeButton').click();await expect(page.locator('#detectionSettingsError')).toBeVisible();expect(await notes(page)).toEqual(edited);
 await page.locator('#sensitivityPreset').selectOption('fewer');await expect(page.locator('#detectionSettingsError')).not.toBeVisible();await expect(page.locator('#onsetThreshold')).toHaveValue('0.7');
 // An explicit cancel after accepting replacement must preserve the editor and its history.
 await page.locator('#analyzeButton').click();await page.locator('#appConfirmOk').click();await page.locator('#cancelButton').click();await phase(page,'result');expect(await notes(page)).toEqual(edited);await page.locator('#undoNoteButton').click();expect(await notes(page)).toEqual(original);
 // Successful changed settings replace notes only when complete and start fresh history.
 await page.locator('#sensitivityPreset').selectOption('standard');await page.locator('#minimumPitch').fill('61');await page.locator('#analyzeButton').click();await phase(page,'no-notes');await expect(page.locator('#undoNoteButton')).toBeDisabled();await expect(page.locator('#downloadButton')).toBeDisabled();
 await page.locator('#sensitivityPreset').selectOption('standard');await page.locator('#analyzeButton').click();await phase(page,'result');expect(await notes(page)).toEqual(original);await page.locator('#pitchUp').click();await page.locator('#undoNoteButton').click();
 // Cancel terminates the native worker so the following fault injection is used by a new worker.
 await page.locator('#analyzeButton').click();await page.locator('#cancelButton').click();await phase(page,'result');
 // A worker failure also retains the last complete result. Replace only the browser test worker.
 await page.evaluate(()=>{const NativeWorker=window.Worker;window.Worker=class extends NativeWorker{postMessage(){setTimeout(()=>this.onmessage({data:{phase:'error'}}),0);}};});
 await page.locator('#analyzeButton').click();await expect(page.locator('#statusHint')).toContainText(/failed|失敗/);await phase(page,'result');expect(await notes(page)).toEqual(original);await expect(page.locator('#redoNoteButton')).toBeEnabled();
 for(const width of [320,360,390]){await page.setViewportSize({width,height:760});await page.locator('[data-mobile-key="input"]').click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.locator('#languageButton').click();await expect(page.locator('#minimumNoteSeconds')).toHaveValue('0.059');await page.screenshot({path:info.outputPath('mobile-detection-settings.png'),fullPage:true});
 await page.setViewportSize({width:1360,height:900});await page.locator('#noteEditor').scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('desktop-history.png')});expect(errors).toEqual([]);expect(requests).toEqual([]);
});
