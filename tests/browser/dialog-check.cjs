const {expect}=require('@playwright/test');
async function checkModalScroll(page,testInfo){
 for(const width of [1360,320]){
  await page.setViewportSize({width,height:480});if(width<=600)await page.locator('[data-mobile-key="input"]').click();
  for(const dismiss of ['button','escape','backdrop','native']){
   await page.evaluate(()=>window.scrollTo({top:220,behavior:'instant'}));
   const before=await page.evaluate(()=>({y:scrollY,top:document.querySelector('#inputTitle').getBoundingClientRect().top}));
   expect(before.y).toBeGreaterThan(0);
   await page.locator('#helpButton').click();await expect(page.locator('#helpDialog')).toBeVisible();
   await expect(page.locator('body')).toHaveCSS('position','fixed');
   await page.mouse.move(1,240);await page.mouse.wheel(0,500);
   expect(Math.abs(await page.locator('#inputTitle').evaluate(el=>el.getBoundingClientRect().top)-before.top)).toBeLessThan(1);
   await page.locator('#helpDialog .dialog-body').evaluate(el=>el.scrollTop=0);
   await page.locator('#helpDialog .dialog-body').hover();await page.mouse.wheel(0,500);
   await expect.poll(()=>page.locator('#helpDialog .dialog-body').evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
   await page.locator('#licensesDetails').scrollIntoViewIfNeeded();
   if(dismiss==='button')await page.locator('#closeHelpButton').click();
   if(dismiss==='escape')await page.keyboard.press('Escape');
   if(dismiss==='backdrop')await page.mouse.click(1,240);
   if(dismiss==='native')await page.locator('#helpDialog').evaluate(dialog=>dialog.close());
   await expect(page.locator('#helpDialog')).not.toBeVisible();await expect(page.locator('body')).not.toHaveCSS('position','fixed');
   await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(before.y);
   if(dismiss!=='native')await expect(page.locator('#helpButton')).toBeFocused();
   await page.mouse.move(width-2,240);await page.mouse.wheel(0,60);await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(before.y);
  }
  await page.locator('#languageButton').click();
 }
 await page.setViewportSize({width:320,height:480});
 await page.locator('#helpButton').click();await page.locator('#licensesDetails').scrollIntoViewIfNeeded();
 await page.screenshot({path:testInfo.outputPath('help-mobile-scroll.png')});await page.keyboard.press('Escape');
 // Reset uses the same lock and must not strand the document after cancellation.
 await page.locator('#resetButton').scrollIntoViewIfNeeded();const before=await page.evaluate(()=>scrollY);
 await page.locator('#resetButton').click();await expect(page.locator('#appConfirmDialog')).toBeVisible();await expect(page.locator('body')).toHaveCSS('position','fixed');
 await page.locator('#appConfirmCancel').click();await expect(page.locator('body')).not.toHaveCSS('position','fixed');await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(before);
 await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
}
module.exports={checkModalScroll};
