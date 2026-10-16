const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {parseMidi}=require('midi-file'),{makeWav}=require('../fixtures.cjs');
const phase=(page,value)=>expect(page.locator('body')).toHaveAttribute('data-phase',value,{timeout:90000});
async function download(page){const pending=page.waitForEvent('download');await page.locator('#downloadButton').click();const file=await pending;return {name:file.suggestedFilename(),bytes:fs.readFileSync(await file.path())};}
function csvRows(bytes){const text=bytes.toString('utf8');expect(text.endsWith('\r\n')).toBe(true);expect(text.replace(/\r\n/g,'')).not.toContain('\n');const lines=text.trimEnd().split('\r\n');expect(lines.shift()).toBe('start_seconds,end_seconds,pitch_midi,velocity');return lines.map(row=>row.split(',').map(Number));}
function midiRows(bytes){const midi=parseMidi(bytes),rows=[],active=new Map();expect(midi.header.format).toBe(1);expect(midi.header.ticksPerBeat).toBe(480);expect(midi.tracks[0].find(e=>e.type==='setTempo').microsecondsPerBeat).toBe(500000);let tick=0;for(const e of midi.tracks[1]){tick+=e.deltaTime;expect(e.type).not.toBe('pitchBend');if(e.type==='noteOn'){if(!active.has(e.noteNumber))active.set(e.noteNumber,[]);active.get(e.noteNumber).push(tick);}if(e.type==='noteOff')rows.push([active.get(e.noteNumber).shift()/960,tick/960,e.noteNumber,96]);}return rows.sort((a,b)=>a[0]-b[0]||a[2]-b[2]);}
async function edit(page,pitch,start,end){await page.locator('#editPitch').fill(pitch);await page.locator('#editStart').fill(String(start));await page.locator('#editEnd').fill(String(end));await page.locator('#applyNoteButton').click();}
for(const variant of ['index.html','index.self-extract.html','deployed'])test(`${variant}: current notes export as MIDI and exact CSV with safe editable names`,async({page,context},info)=>{
 test.skip(variant==='deployed'&&!process.env.PREVIEW_URL,'Preview URL not supplied');
 const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
 await page.goto(variant==='deployed'?process.env.PREVIEW_URL:pathToFileURL(path.join(__dirname,'../../dist',variant)).href);requests.length=0;await context.setOffline(true);
 await expect(page.locator('#outputFormat')).toHaveValue('mid');await expect(page.locator('#downloadButton')).toBeDisabled();
 await page.locator('#audioFile').setInputFiles({name:'export-C4.wav',mimeType:'audio/wav',buffer:makeWav()});await phase(page,'ready');await page.locator('#analyzeButton').click();await phase(page,'result');
 await edit(page,'C4',.123456789,1.23456789);await page.locator('#addNoteButton').click();await edit(page,'D4',.2,1.8);
 await page.locator('#deleteNoteButton').click();await page.locator('#undoNoteButton').click();
 const expected=[[.123456789,1.23456789,60,96],[.2,1.8,62,96]];
 await page.locator('#outputFormat').selectOption('csv');await expect(page.locator('#outputExtension')).toHaveText('.csv');await expect(page.locator('#midiNote')).toContainText(/CSV/);
 await page.locator('#outputFilename').fill('鼻歌/試作?.mid.csv');const csv=await download(page);expect(csv.name).toBe('鼻歌試作.csv');expect(csvRows(csv.bytes)).toEqual(expected);await expect(page.locator('#noteDirty')).not.toBeVisible();
 await page.locator('#languageButton').click();await expect(page.locator('#appToastMessage')).toHaveText('CSVの保存を開始しました');await expect(page.locator('#outputFormat')).toHaveValue('csv');await page.locator('#languageButton').click();
 await page.locator('#outputFormat').selectOption('mid');await expect(page.locator('#outputExtension')).toHaveText('.mid');await expect(page.locator('#outputFilename')).toHaveValue('鼻歌試作');
 const midi=await download(page);expect(midi.name).toBe('鼻歌試作.mid');const decoded=midiRows(midi.bytes);expect(decoded).toHaveLength(2);for(let i=0;i<2;i++){expect(decoded[i][2]).toBe(expected[i][2]);expect(Math.abs(decoded[i][0]-expected[i][0])).toBeLessThan(.0011);expect(Math.abs(decoded[i][1]-expected[i][1])).toBeLessThan(.0011);}
 await page.locator('#outputFormat').selectOption('csv');expect((await download(page)).bytes.equals(csv.bytes)).toBe(true);
 await page.locator('#pitchUp').click();await expect(page.locator('#noteDirty')).toBeVisible();const changed=csvRows((await download(page)).bytes);expect(changed[1][2]).toBe(63);await page.locator('#undoNoteButton').click();expect(csvRows((await download(page)).bytes)).toEqual(expected);
 await page.locator('#outputFilename').fill('');expect((await download(page)).name).toBe('audio-to-midi-notes.csv');
 await page.locator('#outputFilename').fill('CON.csv.mid');expect((await download(page)).name).toBe('_CON.csv');
 // Keyboard selection changes the export format without touching notes.
 await page.locator('#outputFormat').focus();await page.keyboard.press('Home');await expect(page.locator('#outputFormat')).toHaveValue('mid');await page.keyboard.press('End');await expect(page.locator('#outputFormat')).toHaveValue('csv');
 await page.locator('#analyzeButton').click();await expect(page.locator('#downloadButton')).toBeDisabled();await page.locator('#cancelButton').click();await phase(page,'result');expect(csvRows((await download(page)).bytes)).toEqual(expected);
 await page.setViewportSize({width:1360,height:900});await page.locator('#outputCard').scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('desktop-csv-export.png')});
 for(const width of [320,360,390]){await page.setViewportSize({width,height:760});await page.locator('[data-mobile-key="export"]').click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect((await page.locator('#outputFormat').boundingBox()).height).toBeGreaterThanOrEqual(44);}
 await page.locator('#languageButton').click();await page.screenshot({path:info.outputPath('mobile-csv-export.png'),fullPage:true});
 await page.setViewportSize({width:1360,height:900});
 await page.locator('#audioFile').setInputFiles({name:'silent.wav',mimeType:'audio/wav',buffer:makeWav({notes:[]})});await phase(page,'ready');await expect(page.locator('#outputFormat')).toHaveValue('csv');await expect(page.locator('#downloadButton')).toBeDisabled();await page.locator('#analyzeButton').click();await phase(page,'no-notes');await expect(page.locator('#downloadButton')).toBeDisabled();
 await page.locator('#resetButton').click();await page.locator('#appConfirmOk').click();await phase(page,'empty');await expect(page.locator('#outputFormat')).toHaveValue('mid');
 await info.attach('edited-notes-csv',{body:csv.bytes,contentType:'text/csv'});await info.attach('edited-notes-midi',{body:midi.bytes,contentType:'audio/midi'});
 expect(errors).toEqual([]);expect(requests).toEqual([]);
});
