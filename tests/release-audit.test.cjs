const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../src/app-ui.js'),'utf8');
const settings=require('../src/detection-settings.js');
function harness(){const elements={};for(const [key,value] of Object.entries({onsetThreshold:.5,frameThreshold:.3,minimumNoteSeconds:.059,minimumPitch:21,maximumPitch:108}))elements['#'+key]={value:String(value)};
 const c={$:id=>elements[id],AudioMidiSettings:settings};vm.createContext(c);vm.runInContext(source.slice(source.indexOf('const settingsFields='),source.indexOf('const review=')),c);return {elements,read:()=>vm.runInContext('readDetectionSettings()',c),fields:()=>Array.from(vm.runInContext('invalidSettingsFields()',c))};}
test('detection UI preserves offending fields including both inverted bounds and clears after correction',()=>{
 for(const [key,value] of Object.entries({onsetThreshold:'',frameThreshold:2,minimumNoteSeconds:0,minimumPitch:-1,maximumPitch:128})){
  const h=harness();h.elements['#'+key].value=String(value);assert.equal(h.read(),null);assert.deepEqual(h.fields(),[key]);
 }
 const h=harness();h.elements['#minimumPitch'].value='109';assert.equal(h.read(),null);assert.deepEqual(h.fields(),['minimumPitch','maximumPitch']);h.elements['#minimumPitch'].value='21';assert.ok(h.read());assert.deepEqual(h.fields(),[]);
});
test('progress is named and focus rings are solid; effective bilingual help describes both compressed variants',()=>{
 const html=fs.readFileSync(require('node:path').join(__dirname,'../src/index.template.html'),'utf8');assert.match(html,/id="progressBar" aria-labelledby="statusText" aria-describedby="statusHint"/);assert.doesNotMatch(html,/--focus\) 55%/);assert.match(html,/--focus: #16624f/);assert.match(html,/\.drop-zone:focus-within \{ outline:3px solid var\(--focus\); outline-offset:2px; \}/);
 const t=vm.runInNewContext(source.slice(source.indexOf('const translations='),source.indexOf('const languageKey='))+';translations');assert.match(t.en.helpOffline,/Both require DecompressionStream/);assert.match(t.ja.helpOffline,/どちらも/);assert.match(t.en.postprocessingHint,/selected/);
 assert.match(t.en.browserUnsupported,/Chrome on Windows or Android/);assert.match(t.ja.browserUnsupported,/WindowsまたはAndroid/);assert.match(t.en.helpNoteBrowser,/Windows and Android Chrome/);assert.match(t.ja.helpNoteBrowser,/Windows・AndroidのChrome/);assert.match(t.en.helpDetection,/Quiet noise/);assert.match(t.en.helpDetection,/weak or short/);assert.match(t.ja.helpDetection,/小さな雑音/);assert.match(t.ja.helpDetection,/弱い音や短い音/);
});
