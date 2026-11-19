const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../src/index.template.html'), 'utf8');
const ui = fs.readFileSync(path.join(__dirname, '../src/app-ui.js'), 'utf8');
test('only informational footer hides at the existing 600px page-tab boundary', () => {
  assert.ok(html.includes('@media (max-width: 600px) { body > footer { display: none; } }'));
  assert.ok(html.includes('id="mobileBottomBar"'));
});
test('all three original metadata fields are unique in the quiet final Help child', () => {
  const start = html.lastIndexOf('<dialog', html.indexOf('id="helpDialog"'));
  const help = html.slice(start, html.indexOf('</dialog>', start));
  for (const id of ['buildVersion', 'builtAt', 'dependencyCount']) {
    assert.equal(html.split('id="' + id + '"').length - 1, 1, id + ' unique');
    assert.ok(help.includes('id="' + id + '"'), id + ' inside Help');
  }
  assert.match(help, /<section class="help-build">[\s\S]*<\/section>\s*<\/div>\s*$/);
});
test('Help descendant keyboard click cannot close the dialog but actual backdrop can', () => {
  const source = ui.match(/helpDialog\.addEventListener\('click',event=>\{[^\n]+/)[0];
  let callback, closes = 0;
  const helpDialog = { addEventListener: (_, fn) => callback = fn, getBoundingClientRect: () => ({ left:10, right:110, top:10, bottom:110 }) };
  vm.runInNewContext(source, {helpDialog, AppDialog:{close:()=>closes++}});
  callback({target:{tagName:'SUMMARY'},clientX:0,clientY:0}); assert.equal(closes,0);
  callback({target:helpDialog,clientX:50,clientY:50}); assert.equal(closes,0);
  callback({target:helpDialog,clientX:0,clientY:0}); assert.equal(closes,1);
});
test('local-processing badge keeps bilingual text on desktop but hides at the phone breakpoint', () => {
  assert.match(ui, /localBadge:'完全ローカル処理'/);
  assert.match(ui, /localBadge:'Fully local processing'/);
  assert.match(html, /@media \(max-width: 600px\)\s*\{\s*\.page-intro \.local-badge \{ display: none; \}/);
});

test('input tray arrows point down in the drop area and mobile navigation', () => {
 const inputPath = 'M12 3v12m-4-4 4 4 4-4M5 17v4h14v-4';
 const drop = html.match(/<div class="drop-zone" id="dropZone">([\s\S]*?)<\/div>/)?.[1];
 const nav = html.match(/<button type="button" class="app-mobile-bottom-item" data-mobile-key="input"[^>]*>([\s\S]*?)<\/button>/)?.[1];
 assert.ok(drop?.includes(inputPath), 'drop area arrow points down');
 assert.ok(nav?.includes(inputPath), 'mobile Input arrow points down');
});

test('phone header is not sticky, and mobile page changes use the smaller scroll offset', () => {
 assert.match(html, /\.app-header \{ position: static; \}/);
 assert.match(ui, /initialPage:'input',pageTopOffset:12/);
});
