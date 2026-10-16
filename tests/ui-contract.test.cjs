const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../src/index.template.html'),'utf8');
test('bilingual audio workflow replaces starter',()=>{
 for(const id of ['audioFile','dropZone','analyzeButton','cancelButton','resetButton','downloadButton','outputFilename','statusText','notesSummary','noteRows'])assert.ok(html.includes(`id="${id}"`),id);
 assert.ok(!html.includes('id="editor"'));assert.ok(html.includes("connect-src 'none'"));
});
test('all development sources are included by the supported builder',()=>{
 const build=fs.readFileSync(path.join(__dirname,'../build-standalone.ps1'),'utf8');
 for(const name of ['audio-core.js','inference-worker.js','app-ui.js'])assert.ok(build.includes(name),name);
});
test('BFCache lifecycle explicitly preserves or recovers session state',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../src/app-ui.js'),'utf8');
 assert.ok(source.includes('event.persisted'),'pagehide must distinguish BFCache');assert.ok(source.includes("addEventListener('pageshow'"),'restored document must render coherent state');
});
test('Japanese and English contain every static and dynamic message key',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../src/app-ui.js'),'utf8');const expression=source.slice(source.indexOf('const translations='),source.indexOf('const languageKey='));const vm=require('node:vm');const translations=vm.runInNewContext(expression+';translations');
 assert.deepEqual(Object.keys(translations.ja).sort(),Object.keys(translations.en).sort());
 for(const match of html.matchAll(/data-i18n(?:-title|-aria-label)?="([^"]+)"/g))assert.equal(typeof translations.en[match[1]],'string',match[1]);
});

test("canonical shell uses compact EN/JA and local-processing badge",()=>{const ui=fs.readFileSync(path.join(__dirname,"../src/app-ui.js"),"utf8");assert.match(ui,/language==='ja'\?'EN':'JA'/);assert.ok(ui.includes("完全ローカル処理"));});
