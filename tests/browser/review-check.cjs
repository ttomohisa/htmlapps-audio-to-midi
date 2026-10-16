const {expect}=require('@playwright/test');
async function seek(page,seconds){await page.locator('#seekPosition').evaluate((el,value)=>{el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}));},seconds);}
async function checkReview(page,testInfo){
 const card=page.locator('#reviewCard'),note=page.locator('#pianoRoll [data-pitch="60"]').first();await expect(note).toHaveCount(1);
 const data=()=>page.locator('#pianoRoll [data-note-id]').evaluateAll(nodes=>nodes.map(el=>({id:el.dataset.noteId,pitch:el.dataset.pitch,start:el.dataset.start,end:el.dataset.end})));
 const before=await data(),rect=await note.evaluate(el=>({x:+el.getAttribute('x'),y:+el.getAttribute('y'),width:+el.getAttribute('width'),start:+el.dataset.start,end:+el.dataset.end}));
 const scale=await page.locator('#pianoRoll').evaluate(el=>Number(el.getAttribute('width'))/Number(document.querySelector('#seekPosition').max));
 expect(Math.abs(rect.x-rect.start*scale)).toBeLessThan(.001);expect(rect.y).toBe((127-60)*22+2);expect(Math.abs(rect.width-(rect.end-rect.start)*scale)).toBeLessThan(.001);
 await page.locator('#zoomIn').click();expect(Number(await note.getAttribute('x'))).toBeCloseTo(rect.x*2,4);
 await page.locator('#pianoScroll').evaluate(el=>el.scrollLeft=80);await expect.poll(()=>page.locator('#waveScroll').evaluate(el=>el.scrollLeft)).toBe(80);
 // Force a classic vertical scrollbar and exercise the far right edge, where
 // equal content widths alone used to leave the waveform one gutter behind.
 const scrollbarStyle=await page.addStyleTag({content:'.piano-scroll { overflow-y:scroll; scrollbar-gutter:stable; } .piano-scroll::-webkit-scrollbar { width:17px; height:17px; }'});
 await expect.poll(()=>page.locator('#pianoScroll').evaluate(el=>el.offsetWidth-el.clientWidth)).toBeGreaterThanOrEqual(17);
 await expect.poll(()=>page.evaluate(()=>document.querySelector('#waveScroll').clientWidth-document.querySelector('#pianoScroll').clientWidth)).toBe(0);
 await page.locator('#pianoScroll').evaluate(el=>el.scrollLeft=el.scrollWidth);
 await expect.poll(()=>page.evaluate(()=>document.querySelector('#waveScroll').scrollLeft-document.querySelector('#pianoScroll').scrollLeft)).toBe(0);
 const aligned=await page.locator('#reviewCard .playhead').evaluateAll(lines=>lines.map(el=>el.getBoundingClientRect().x));expect(aligned[0]).toBeCloseTo(aligned[1],1);
 await scrollbarStyle.evaluate(el=>el.remove());
 await page.locator('#notePicker').selectOption(before[0].id);await expect(page.locator('#selectedNoteDetails')).toContainText('C4');
 expect(await data()).toEqual(before);await seek(page,.5);
 const xs=await page.locator('#reviewCard .playhead').evaluateAll(lines=>lines.map(el=>Number(el.getAttribute('x1'))));expect(xs[0]).toBeCloseTo(xs[1],5);
 await page.locator('#playButton').click();await expect(card).toHaveAttribute('data-playback','playing');await expect.poll(async()=>Number(await card.getAttribute('data-position'))).toBeGreaterThan(.6);
 await page.locator('#pauseButton').click();await expect(card).toHaveAttribute('data-playback','paused');await expect(card).toHaveAttribute('data-active-sources','0');const paused=Number(await card.getAttribute('data-position'));
 await page.locator('#languageButton').click();expect(Number(await card.getAttribute('data-position'))).toBeCloseTo(paused,5);await page.locator('#languageButton').click();
 await page.locator('#playbackMode').selectOption('synth');await expect(card).toHaveAttribute('data-mode','synth');expect(Number(await card.getAttribute('data-position'))).toBeCloseTo(paused,5);
 await page.locator('#playButton').click();await expect(card).toHaveAttribute('data-playback','playing');await expect.poll(async()=>Number(await card.getAttribute('data-active-sources'))).toBeGreaterThan(0);
 await page.locator('#playbackMode').selectOption('original');await expect(card).toHaveAttribute('data-active-sources','1');await expect(card).toHaveAttribute('data-mode','original');
 await page.locator('#stopButton').click();await expect(card).toHaveAttribute('data-active-sources','0');expect(Number(await card.getAttribute('data-position'))).toBe(0);
 const duration=Number(await page.locator('#seekPosition').getAttribute('max'));await seek(page,duration-.06);await page.locator('#playButton').click();await expect(card).toHaveAttribute('data-playback','ended');await expect(card).toHaveAttribute('data-active-sources','0');
 expect(Number(await card.getAttribute('data-position'))).toBeCloseTo(duration,4);await page.locator('#stopButton').click();
 for(const width of [320,360]){await page.setViewportSize({width,height:640});await page.locator('[data-mobile-key="notes"]').click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.locator('#reviewCard').scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath(`review-${width}.png`)});}
 expect(await data()).toEqual(before);
 await page.setViewportSize({width:1360,height:900});await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
}
module.exports={seek,checkReview};
