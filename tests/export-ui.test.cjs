const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const core=require('../src/audio-core.js'),editing=require('../src/editing-core.js'),{parseMidi}=require('midi-file');
const source=fs.readFileSync(require('node:path').join(__dirname,'../src/app-ui.js'),'utf8');
function harness(format='csv'){
 const events={},elements={'#outputFormat':{value:format},'#downloadButton':{addEventListener:(name,fn)=>events[name]=fn}};
 const editor=editing.createSession([{id:'one',pitchMidi:60,startSeconds:.123456789,endSeconds:1.23456789,velocity:96,origin:'detected'}],2);
 editor.update('one',{pitchMidi:61});
 const outputFilename={value:'鼻歌?.mid.csv'},blobs=[],anchors=[],toasts=[],urls=new Set(),timers=[];
 const context={core,Blob,outputFilename,editor,state:{phase:'result',notes:editor.snapshot()},recording:{active:()=>false},editRevision:0,blobUrls:urls,$:id=>elements[id],
 URL:{createObjectURL:blob=>{blobs.push(blob);return 'blob:'+blobs.length;},revokeObjectURL(){}},document:{body:{append(){}},createElement(){const a={click(){},remove(){}};anchors.push(a);return a;}},
 setTimeout:fn=>timers.push(fn),clearCleanup(){},render(){},showToast:key=>toasts.push(key)};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf("$('#downloadButton').addEventListener('click'"),source.indexOf("$('#outputFormat').addEventListener")),context);
 return {context,editor,elements,blobs,anchors,toasts,urls,timers,click:()=>events.click()};
}
test('CSV download uses exact current edited notes, safe name, MIME, saved fingerprint and URL cleanup',async()=>{
 const h=harness();h.click();assert.equal(h.anchors[0].download,'鼻歌.csv');assert.equal(h.blobs[0].type,'text/csv;charset=utf-8');
 assert.equal(await h.blobs[0].text(),core.encodeCsv(h.context.state.notes));assert.equal(h.editor.dirty(),false);assert.deepEqual(h.toasts,['csvDownloaded']);
 h.editor.update('one',{pitchMidi:62});h.context.state.notes=h.editor.snapshot();assert.equal(h.editor.dirty(),true);h.click();assert.match(await h.blobs[1].text(),/,62,96\r\n/);assert.equal(h.editor.dirty(),false);
 h.timers.forEach(fn=>fn());assert.equal(h.urls.size,0);
});
test('default MIDI export semantics stay intact when choosing MIDI after CSV',async()=>{
 const h=harness('mid');h.click();assert.equal(h.anchors[0].download,'鼻歌.mid');assert.equal(h.blobs[0].type,'audio/midi');
 const midi=parseMidi(new Uint8Array(await h.blobs[0].arrayBuffer()));assert.equal(midi.tracks[1].find(e=>e.type==='noteOn').noteNumber,61);assert.deepEqual(h.toasts,['downloaded']);
});
test('programmatic click cannot export absent/busy/stale result or active recording',()=>{
 for(const phase of ['empty','ready','decoding','loading-model','analyzing','postprocessing','no-notes','error','cancelled']){
  const h=harness();h.context.state.phase=phase;h.click();assert.equal(h.blobs.length,0);assert.equal(h.editor.dirty(),true);
 }
 const h=harness();h.context.state.notes=[];h.click();assert.equal(h.blobs.length,0);
 const r=harness();r.context.recording.active=()=>true;r.click();assert.equal(r.blobs.length,0);
});
