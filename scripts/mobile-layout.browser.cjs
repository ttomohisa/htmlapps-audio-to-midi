'use strict';
// Bounded native layout regression. Inputs are synthetic, with no personal data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const cfg = {"slug": "audio-to-midi", "bp": 600, "nav": "#mobileBottomBar", "header": "#helpDialog .dialog-header", "body": "#helpDialog > .dialog-body", "details": "#helpDialog .help-build details", "ids": ["buildVersion", "builtAt", "dependencyCount"], "end": "#dependencyCount", "hideBuild": false};
const evidence = path.resolve('test-results/mobile-layout');
async function settle(page) { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
async function bounds(locator, width, height, label, vertical = true) {
  const r = await locator.boundingBox();
  assert.ok(r && r.x >= -1 && r.x + r.width <= width + 1 && (!vertical || (r.y >= -1 && r.y + r.height <= height + 1)), label + ': bounds ' + JSON.stringify(r));
}
async function metadata(page) {
  for (const id of cfg.ids) {
    assert.equal(await page.locator('#' + id).count(), 1, id + ' unique');
    assert.equal(await page.locator('#helpDialog #' + id).count(), 1, id + ' inside Help');
    assert.equal(await page.locator('main #' + id).count(), 0, id + ' removed from main');
  }
  assert.match(await page.locator('#buildVersion').textContent(), /^\d+\.\d+\.\d+$/);
  assert.match(await page.locator('#builtAt').textContent(), /^\d{4}-\d\d-\d\dT/);
  assert.equal((await page.locator('#dependencyCount').textContent()).trim(), '3');
}
async function main() {
  fs.mkdirSync(evidence, { recursive: true });
  const browser = await chromium.launch();
  try {
    const cases = [];
    for (const language of ['ja', 'en']) for (const [width, height] of [[1360,900], [cfg.bp+1,568], [cfg.bp,568], [320,568], [393,252]]) cases.push({ file:'dist/index.html', language, width, height });
    cases.push({file:'dist/index.self-extract.html',language:'en',width:360,height:640}, {file:cfg.slug+'.html',language:'ja',width:1360,height:900});
    for (const {file, language, width, height} of cases) {
      const context = await browser.newContext({ viewport:{width,height}, locale:language, reducedMotion:'reduce' });
      const page = await context.newPage(), errors = [], requests = [], label = `${file} ${language} ${width}x${height}`;
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('request', r => { if (/^https?:/.test(r.url())) requests.push(r.url()); });
      try {
        await page.goto(pathToFileURL(path.resolve(file)).href);
        await page.locator('#helpButton').waitFor();
        await page.waitForFunction(() => /^\d+\.\d+\.\d+$/.test(document.querySelector('#buildVersion').textContent));
        if (await page.locator('html').getAttribute('lang') !== language) await page.locator('#languageButton').click();
        assert.equal((await page.locator('[data-i18n="localBadge"]').textContent()).trim(), language === 'ja' ? '完全ローカル処理' : 'Fully local processing');
        await bounds(page.locator('.local-badge'), width, height, label, false);
        assert.equal(await page.locator('body > footer').isVisible(), width > cfg.bp, label + ': initial footer');
        assert.equal(await page.locator('[data-mobile-key="notes"]').isDisabled(), true);
        assert.equal(await page.locator('[data-mobile-key="export"]').isDisabled(), true);
        // Existing deterministic fixture generator: synthetic C4 waveform only.
        const {makeWav} = require('../tests/fixtures.cjs');
        await page.locator('#audioFile').setInputFiles({name:'synthetic-layout.wav',mimeType:'audio/wav',buffer:makeWav({duration:1,notes:[{pitch:60,start:.1,end:.9}]})});
        await page.waitForFunction(()=>document.body.dataset.phase==='ready');
        assert.equal(await page.locator('#analyzeButton').isEnabled(), true);
        assert.equal(await page.locator('[data-mobile-key="notes"]').isEnabled(), true);
        assert.equal(await page.locator('[data-mobile-key="export"]').isDisabled(), true);
        if (width<=cfg.bp) {
          await page.locator('[data-mobile-key="notes"]').click();
          await page.locator('#reviewCard').waitFor();
          await page.locator('[data-mobile-key="input"]').click();
          await page.locator('#inputCard').waitFor();
        }
        for (const w of [cfg.bp+1, cfg.bp, width]) {
          await page.setViewportSize({width:w,height}); await settle(page);
          assert.equal(await page.locator('body > footer').isVisible(), w > cfg.bp, label + ': footer resize');
          assert.equal(await page.locator(cfg.nav).isVisible(), w <= cfg.bp, label + ': functional bar');
          if (w <= cfg.bp) await bounds(page.locator(cfg.nav), w, height, label);
        }
        await page.evaluate(() => scrollTo({left:0,top:0,behavior:'instant'})); await settle(page);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), label + ': page width');
        await page.locator('#helpButton').click();
        const body = page.locator(cfg.body), details = page.locator(cfg.details);
        await metadata(page);
        assert.ok(await body.evaluate(e => e.lastElementChild.classList.contains('help-build')), label + ': final Help child');
        const hiddenBuild = cfg.hideBuild && width <= cfg.bp;
        assert.equal(await details.isVisible(), !hiddenBuild, label + ': preserve metadata visibility');
        if (!hiddenBuild) {
          assert.equal(await details.evaluate(e => e.open), false);
          const summary = details.locator('summary');
          await summary.scrollIntoViewIfNeeded(); await summary.focus(); await page.keyboard.press('Enter');
          assert.equal(await details.evaluate(e => e.open), true);
          assert.equal(await page.locator('#helpDialog').isVisible(), true, label + ': keyboard disclosure stays inside Help');
        }
        await body.evaluate(e => { e.scrollTop = e.scrollHeight; }); await settle(page);
        const end = page.locator(hiddenBuild ? '[data-i18n="helpTouchBody"]' : cfg.end);
        const last = await end.evaluate(el => {
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let node, last;
          while (node = walker.nextNode()) if (node.textContent.trim()) last = node;
          if (!last) throw Error('No final Help text');
          const range = document.createRange(); range.setStart(last,last.textContent.trimEnd().length-1); range.setEnd(last,last.textContent.trimEnd().length);
          const r = range.getBoundingClientRect(); let top = 0, bottom = innerHeight;
          for (let p = el.parentElement; p; p = p.parentElement) if (/auto|scroll|hidden|clip/.test(getComputedStyle(p).overflowY)) {
            const b = p.getBoundingClientRect(); top = Math.max(top,b.top); bottom = Math.min(bottom,b.bottom);
          }
          return {top:r.top,bottom:r.bottom,clipTop:top,clipBottom:bottom};
        });
        assert.ok(last.top >= last.clipTop-1 && last.bottom <= last.clipBottom+1, label + ': Help end ' + JSON.stringify(last));
        assert.ok(await body.evaluate(e => e.scrollWidth <= e.clientWidth+1), label + ': Help width');
        await bounds(page.locator(cfg.header), width, height, label);
        const chrome = await page.locator(cfg.header).evaluate(header => {
          const rect = e => { const r=e.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}; };
          return {header:rect(header),dialog:rect(header.closest('dialog')),title:rect(header.querySelector('h2')),close:rect(header.querySelector('button'))};
        });
        for (const key of ['title','close']) {
          const r=chrome[key], h=chrome.header, d=chrome.dialog;
          assert.ok(r.x>=Math.max(h.x,d.x)-1 && r.x+r.width<=Math.min(h.x+h.width,d.x+d.width)+1 && r.y>=Math.max(h.y,d.y)-1 && r.y+r.height<=Math.min(h.y+h.height,d.y+d.height)+1, label+': Help '+key+' containment '+JSON.stringify(chrome));
        }
        if (file==='dist/index.html' && [1360,320].includes(width)) { await settle(page); await page.screenshot({path:path.join(evidence,`${language}-${width}.png`)}); }
        const box=await page.locator('#helpDialog').boundingBox();
        const point=[[1,1],[width-1,1],[1,height-1],[width-1,height-1]].find(([x,y])=>x<box.x||x>box.x+box.width||y<box.y||y>box.y+box.height);
        assert.ok(point,label+': genuine backdrop');
        const before=await page.evaluate(()=>({root:scrollY,main:document.querySelector('main').scrollTop}));
        await page.mouse.move(...point); await page.mouse.wheel(0,400); await page.waitForTimeout(100);
        assert.deepEqual(await page.evaluate(()=>({root:scrollY,main:document.querySelector('main').scrollTop})),before,label+': background locked');
        await page.keyboard.press('Escape'); assert.equal(await page.locator('#helpDialog').isVisible(),false);
        await page.locator('#languageButton').click(); await page.locator('#languageButton').click(); await metadata(page);
        await page.locator('#helpButton').click(); await page.locator('#closeHelpButton').click(); assert.equal(await page.locator('#helpDialog').isVisible(),false);
        assert.deepEqual(errors,[],label+': console errors'); assert.deepEqual(requests,[],label+': runtime requests');
        console.log('PASS '+label);
      } catch (e) { await page.screenshot({path:path.join(evidence,'failure.png')}).catch(()=>{}); throw new Error(label+': '+e.message,{cause:e}); }
      finally { await context.close(); }
    }
  } finally { await browser.close(); }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
