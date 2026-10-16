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

test("active toast retains a translation key without restarting its timer",()=>{const ui=fs.readFileSync(path.join(__dirname,"../src/app-ui.js"),"utf8");const components=fs.readFileSync(path.join(__dirname,"../src/ui-components.js"),"utf8");assert.ok(ui.includes("showToast('downloaded')"));assert.ok(ui.includes("message.textContent=translate(message.dataset.messageKey)"));assert.ok(components.includes("dataset.messageKey=messageKey"));});

test('header subtitle describes audio transcription and panels reuse canonical workspace',()=>{
 const ui=fs.readFileSync(path.join(__dirname,'../src/app-ui.js'),'utf8');
 assert.ok(ui.includes("brandMeta:'音声から音符を見つけてMIDIに'"));
 assert.ok(ui.includes("brandMeta:'Find notes in audio and turn them into MIDI'"));
 assert.equal((html.match(/class="workspace flow-card (?:input|output)-card[^"]*"/g)||[]).length,2);
 assert.doesNotMatch(html,/\.flow-card\s*\{[^}]*padding:/);
});

test('v0.2 keeps waveform, transport and read-only selection beside the piano roll',()=>{
 for(const id of ['reviewCard','waveform','pianoRoll','playButton','pauseButton','stopButton','seekPosition','playbackMode','zoomIn','zoomOut','notePicker','selectedNoteDetails'])assert.ok(html.includes(`id="${id}"`),id);
 const ui=fs.readFileSync(path.join(__dirname,'../src/app-ui.js'),'utf8');assert.ok(ui.includes('originalBuffer'));assert.ok(ui.includes('review.setSession(state.originalBuffer,state.notes)'));assert.ok(ui.includes("addEventListener('visibilitychange'"));
 const build=fs.readFileSync(path.join(__dirname,'../build-standalone.ps1'),'utf8');for(const file of ['timeline-core.js','playback-engine.js','review-ui.js'])assert.ok(build.includes(file),file);
});

test('mobile Notes waits for a measurable viewport before centering the selected pitch',()=>{
 const review=fs.readFileSync(path.join(__dirname,'../src/review-ui.js'),'utf8'),ui=fs.readFileSync(path.join(__dirname,'../src/app-ui.js'),'utf8');
 assert.ok(review.includes('piano.clientWidth<=0'));assert.ok(review.includes('needsReveal'));assert.ok(ui.includes("if(key==='notes')review.reveal()"));
});
