const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path');const {pathToFileURL}=require('node:url');
const {parseMidi}=require('midi-file');const {makeWav}=require('../fixtures.cjs');
const core=require('../../src/audio-core.js');

// A deterministic rendering fixture, not an inference quality/speed claim.
// Include a sustained note starting well before the viewport and both edge pitches.
const rawNotes=Array.from({length:12000},(_,i)=>({pitchMidi:21+i%88,startSeconds:i*59.5/12000,endSeconds:i*59.5/12000+.04}));
rawNotes.push({pitchMidi:60,startSeconds:0,endSeconds:59.9},{pitchMidi:0,startSeconds:30,endSeconds:30.25},{pitchMidi:127,startSeconds:59.8,endSeconds:60});
const normalized=core.normalizeNotes(rawNotes,60),sustain=normalized.find(n=>n.endSeconds===59.9),last=normalized.at(-1);
async function metrics(page){return page.evaluate(()=>{
 const piano=document.getElementById('pianoScroll'),svg=document.getElementById('pianoRoll'),wave=document.getElementById('waveform');
 return {notes:svg.querySelectorAll('[data-note-id]').length,nodes:svg.children.length,labels:document.getElementById('pitchLabels').children.length,waveSegments:(wave.querySelector('path')?.getAttribute('d').match(/M/g)||[]).length,ticks:wave.querySelectorAll('text').length,scrollLeft:piano.scrollLeft,scrollTop:piano.scrollTop,width:piano.clientWidth,height:piano.clientHeight,svgWidth:Number(svg.getAttribute('width')),waveLeft:document.getElementById('waveScroll').scrollLeft};
 });}
async function waitScroll(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function downloadMidi(page){const pending=page.waitForEvent('download');await page.locator('#downloadButton').click();return fs.readFileSync(await(await pending).path());}

for(const variant of ['index.html','index.self-extract.html','deployed'])test(`${variant}: dense timeline virtualizes scroll/zoom without losing selection or MIDI`,async({page,context},info)=>{
 test.skip(variant==='deployed'&&!process.env.PREVIEW_URL,'Preview URL not supplied');
 const errors=[],requests=[];page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(/^https?:/.test(request.url()))requests.push(request.url());});
 await page.addInitScript(notes=>{
  window.Worker=class {
   postMessage(message){this.timer=setTimeout(()=>this.onmessage?.({data:{jobId:message.jobId,phase:'complete',notes,elapsedMs:1}}),0);}
   terminate(){clearTimeout(this.timer);}
  };
 },rawNotes);
 await page.setViewportSize({width:1360,height:900});
 await page.goto(variant==='deployed'?process.env.PREVIEW_URL:pathToFileURL(path.join(__dirname,'../../dist',variant)).href);requests.length=0;await context.setOffline(true);
 await page.locator('#audioFile').setInputFiles({name:'synthetic-dense-60s.wav',mimeType:'audio/wav',buffer:makeWav({duration:60,sampleRate:8000,notes:[]})});
 await expect(page.locator('body')).toHaveAttribute('data-phase','ready');await page.locator('#analyzeButton').click();await expect(page.locator('body')).toHaveAttribute('data-phase','result');
 await expect(page.locator('#notePicker option')).toHaveCount(normalized.length);
 const before=await downloadMidi(page);expect(parseMidi(before).tracks[1].filter(e=>e.type==='noteOn')).toHaveLength(normalized.length);
 const samples=[];
 async function checkBounds(){
  await waitScroll(page);const m=await metrics(page);samples.push(m);
  expect(m.notes).toBeGreaterThan(0);expect(m.notes).toBeLessThan(normalized.length/8);
  expect(m.nodes).toBeLessThan(m.notes+80);expect(m.labels).toBeLessThan(20);expect(m.ticks).toBeLessThan(30);
  expect(m.waveSegments).toBeLessThanOrEqual(Math.ceil((m.width+320)/m.svgWidth*1200)+2);
  expect(m.waveLeft).toBeCloseTo(m.scrollLeft,1);return m;
 }
 const initial=await checkBounds();expect(initial.svgWidth).toBe(4800);
 // Native keyboard selection reaches a note omitted from the visible SVG.
 await expect(page.locator(`#pianoRoll [data-note-id="${last.id}"]`)).toHaveCount(0);
 await page.locator('#notePicker').focus();await page.keyboard.press('End');
 await expect(page.locator('#selectedNoteDetails')).toHaveAttribute('data-note-id',last.id);
 const selected=page.locator(`#pianoRoll [data-note-id="${last.id}"]`);await expect(selected).toHaveCount(1);
 await expect(selected).toHaveClass(/selected/);const end=await checkBounds();expect(end.scrollLeft).toBeGreaterThan(3000);expect(end.scrollTop).toBe(0);
 expect(Number(await selected.getAttribute('x'))).toBeCloseTo(last.startSeconds*80,6);
 await page.locator('#zoomIn').click();await waitScroll(page);const centered=await metrics(page);expect((centered.scrollLeft+centered.width/2)/160).toBeCloseTo((end.scrollLeft+end.width/2)/80,2);
 await page.locator('#notePicker').selectOption(last.id);const zoomed=await checkBounds();expect(zoomed.svgWidth).toBe(9600);
 expect(Number(await selected.getAttribute('x'))).toBeCloseTo(last.startSeconds*160,6);
 // A note spanning almost the entire source remains visible far from its onset.
 await page.locator('#pianoScroll').evaluate(el=>{el.scrollLeft=30*160;el.scrollTop=(127-60)*22-100;});await checkBounds();
 await expect(page.locator(`#pianoRoll [data-note-id="${sustain.id}"]`)).toHaveCount(1);
 await expect(selected).toHaveCount(0);await expect(page.locator('#selectedNoteDetails')).toHaveAttribute('data-note-id',last.id);
 await page.locator('#waveScroll').scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('desktop-deterministic-dense-fixture.png')});
 await page.locator('#waveScroll').scrollIntoViewIfNeeded();
 const waveBox=await page.locator('#waveScroll').boundingBox(),m=await metrics(page),clickX=150;
 await page.mouse.click(waveBox.x+clickX,waveBox.y+50);
 await expect.poll(async()=>Number(await page.locator('#reviewCard').getAttribute('data-position'))).toBeCloseTo((m.scrollLeft+clickX)/160,2);
 const playheads=await page.locator('#reviewCard .playhead').evaluateAll(nodes=>nodes.map(n=>+n.getAttribute('x1')));expect(playheads[0]).toBeCloseTo(playheads[1],6);
 // Language/transport renders preserve a draft and do not rebuild the scene.
 await page.locator('#editStart').fill('59.81');
 await waitScroll(page);await page.locator('#pianoRoll').evaluate(svg=>{window.__renderCount=0;window.__renderObserver=new MutationObserver(records=>{window.__renderCount+=records.filter(r=>r.type==='childList').length;});window.__renderObserver.observe(svg,{childList:true});});
 await page.locator('#languageButton').click();await expect(page.locator('#editStart')).toHaveValue('59.81');expect(await page.evaluate(()=>window.__renderCount)).toBe(0);await page.evaluate(()=>window.__renderObserver.disconnect());
 // Playback auto-follow also refreshes the visible notes and keeps both axes aligned.
 await page.locator('#seekPosition').evaluate(el=>{el.value='55';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.locator('#playButton').click();await expect(page.locator('#reviewCard')).toHaveAttribute('data-playback','playing');
 await expect.poll(async()=>(await metrics(page)).scrollLeft).toBeGreaterThan(8000);await checkBounds();await page.locator('#pauseButton').click();
 // At the narrow viewport, full source extents stay inside the dedicated scroller.
 for(const width of [320,360,390]){
  await page.setViewportSize({width,height:760});await page.locator('[data-mobile-key="notes"]').click();await page.locator('#notePicker').selectOption(last.id);await checkBounds();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(selected).toHaveCount(1);
  if(width===390){await page.locator('#waveScroll').scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('mobile-deterministic-dense-fixture.png')});}
 }
 await page.locator('[data-mobile-key="export"]').click();const after=await downloadMidi(page);expect(after.equals(before)).toBe(true);
 await info.attach('visible-range-metrics',{body:JSON.stringify({fixtureNotes:normalized.length,samples},null,2),contentType:'application/json'});
 expect(errors).toEqual([]);expect(requests).toEqual([]);
});
