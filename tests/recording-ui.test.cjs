const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../src/index.template.html'),'utf8');
test('v0.3 exposes explicit recording controls and canonical three-page navigation',()=>{
 for(const id of ['recordButton','stopRecordButton','listenRecording','discardRecording','recordingMeter','recordingFilename','downloadRecording','mobileBottomBar'])assert.ok(html.includes(`id="${id}"`),id);
 for(const target of ['inputCard','reviewCard','outputCard'])assert.ok(html.includes(`data-mobile-page-target="${target}"`),target);
 assert.ok(html.includes('env(safe-area-inset-bottom)'));
});
test('recorded WebM files can be reloaded through common validation',()=>{
 const core=require('../src/audio-core.js');assert.equal(core.validateFile({name:'recording.webm',size:1024,type:'audio/webm'}),null);
});
const vm=require('node:vm');
function harness({confirmResult=true,load=async()=>true,pendingStart=false}={}){
 const elements=new Map(),loads=[],prompts=[];let options;
 const element=id=>{if(!elements.has(id))elements.set(id,{dataset:{},value:'',addEventListener(type,fn){this[type]=fn;},setAttribute(){},append(){},remove(){}});return elements.get(id);};
 let state={status:'idle',elapsedSeconds:0,level:0,error:null,mimeType:'audio/webm',blob:null};
 const emit=patch=>{state={...state,...patch};options.onChange({...state});};
 const fake={snapshot:()=>({...state}),discard:()=>emit({status:'idle',blob:null,error:null}),dispose(){},start:()=>{emit({status:pendingStart?'requesting':'recording'});return pendingStart?new Promise(()=>{}):Promise.resolve(true);},stop:async()=>{emit({status:'recorded'});return state.blob;}};
 const context={AudioMidiRecording:{createRecorder:o=>(options=o,fake)},document:{getElementById:element,createElement:element,body:{append(){}}},location:{protocol:'file:'},File,URL:{createObjectURL:()=>'',revokeObjectURL(){}},setTimeout:()=>0};
 const factory=vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/recording-ui.js'),'utf8')+';AudioMidiRecordingUI',context);
 const ui=factory.create({translate:x=>x,onRecording:file=>{loads.push(file);return load(file);},onChange(){},onStart(){},onDiscard(){},onListen(){},isBusy:()=>false,confirm:async o=>{prompts.push(o);return confirmResult;},toast(){}});
 return {ui,emit,loads,prompts,elements,element};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('recorded blob is decoded once, never automatically analyzed, and uses a reloadable extension',async()=>{
 const h=harness();h.emit({status:'recorded',blob:new Blob(['encoded'],{type:'audio/webm'})});await flush();
 assert.equal(h.loads.length,1);assert.match(h.loads[0].name,/^audio-to-midi-\d{8}-\d{6}\.webm$/);assert.equal(h.ui.snapshot().accepted,true);assert.equal(h.ui.unsaved(),true);
 h.emit({level:.1});await flush();assert.equal(h.loads.length,1);
});
test('discard invalidates a completed-Blob microtask before it can replace the source',async()=>{
 const h=harness();h.emit({status:'recorded',blob:new Blob(['encoded'])});h.ui.clear();await flush();assert.equal(h.loads.length,0);assert.equal(h.ui.hasRecording(),false);
});
test('late decode result cannot resurrect a discarded recording',async()=>{
 let done;const h=harness({load:()=>new Promise(resolve=>done=resolve)});h.emit({status:'recorded',blob:new Blob(['encoded'])});await flush();h.ui.clear();done(true);await flush();assert.equal(h.ui.snapshot().accepted,false);assert.equal(h.ui.hasRecording(),false);
});
test('cancelled replacement preserves the unsaved recording and cancellation during capture keeps the microphone session',async()=>{
 const h=harness({confirmResult:false});h.emit({status:'recorded',blob:new Blob(['encoded'])});await flush();assert.equal(await h.ui.replace(),false);assert.equal(h.ui.hasRecording(),true);
 h.emit({status:'recording'});assert.equal(await h.ui.leave(),false);assert.equal(h.ui.active(),true);assert.equal(h.prompts.length,2);
});
test('failed recorded Blob decoding remains downloadable but cannot be listened to or accepted',async()=>{
 const h=harness({load:async()=>false});h.emit({status:'recorded',blob:new Blob(['encoded'])});await flush();assert.equal(h.ui.snapshot().accepted,false);assert.equal(h.element('listenRecording').disabled,true);assert.equal(h.element('downloadRecording').disabled,false);
});

test('pending microphone permission does not block confirmed file replacement',async()=>{
 const h=harness({pendingStart:true});await h.element('recordButton').click();assert.equal(h.ui.active(),true);
 assert.equal(await h.ui.replace(),true);assert.equal(h.prompts.length,1);assert.equal(h.prompts[0].message,'discardActiveRecordingBody');assert.equal(h.ui.active(),false);
});

test('recording time does not repeatedly announce through a live region',()=>{
 assert.match(html,/<output id="recordingClock" aria-live="off"/);
});
