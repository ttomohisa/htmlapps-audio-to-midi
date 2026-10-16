// Only enabled in the ordinary preview workflow, using its returned deployment URL.
const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {parseMidi}=require('midi-file');const {makeWav}=require('../fixtures.cjs');
const previewUrl=process.env.PREVIEW_URL;
test('deployed HTTPS preview matches build and converts offline with MIDI readback',async({page,context,request},testInfo)=>{
 test.skip(!previewUrl,'Run after the existing preview workflow returns a URL.');
 const url=new URL(previewUrl);expect(url.protocol).toBe('https:');expect(url.hostname.endsWith('.ttomohisa.workers.dev')).toBeTruthy();
 const response=await request.get(url.href);expect(response.status()).toBe(200);
 const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
 expect(digest(await response.body())).toBe(digest(fs.readFileSync(path.join(__dirname,'../../dist/index.html'))));
 const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url.href);await expect(page.locator('body')).toHaveAttribute('data-phase','empty');
 page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});await context.setOffline(true);
 await page.locator('#audioFile').setInputFiles({name:'synthetic-C4.wav',mimeType:'audio/wav',buffer:makeWav()});
 await expect(page.locator('body')).toHaveAttribute('data-phase','ready');await page.locator('#analyzeButton').click();
 await expect(page.locator('body')).toHaveAttribute('data-phase','result',{timeout:90000});await expect(page.locator('#noteRows')).toContainText('C4 (60)');
 await page.locator('#outputFilename').fill('preview-C4');const pending=page.waitForEvent('download');await page.locator('#downloadButton').click();const download=await pending;
 expect(download.suggestedFilename()).toBe('preview-C4.mid');const bytes=fs.readFileSync(await download.path()),midi=parseMidi(bytes);expect(midi.header.format).toBe(1);expect(midi.tracks).toHaveLength(2);
 let tick=0,start,end;for(const event of midi.tracks[1]){tick+=event.deltaTime;if(event.noteNumber===60){if(event.type==='noteOn')start=tick/960;if(event.type==='noteOff')end=tick/960;}}
 expect(Math.abs(start-.25)).toBeLessThan(.05);expect(Math.abs(end-2.25)).toBeLessThan(.05);await testInfo.attach('preview-midi',{body:bytes,contentType:'audio/midi'});
 const originalLanguage=await page.locator('html').getAttribute('lang');await page.locator('#languageButton').click();await expect(page.locator('#appToastMessage')).toHaveText(originalLanguage==='en'?'MIDIの保存を開始しました':'MIDI download started');await page.locator('#languageButton').click();
 await page.locator('#notesDetails summary').click();await expect(page.locator('#appToast')).not.toHaveClass(/show/,{timeout:10000});
 await require('./dialog-check.cjs').checkModalScroll(page,testInfo);
 await page.setViewportSize({width:1360,height:900});await page.screenshot({path:testInfo.outputPath('preview-desktop.png')});
 await page.setViewportSize({width:320,height:640});for(let i=0;i<2;i++){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.screenshot({path:testInfo.outputPath(`preview-mobile-${i}.png`),fullPage:true});await page.locator('#languageButton').click();}
 expect(errors).toEqual([]);expect(requests).toEqual([]);
});
