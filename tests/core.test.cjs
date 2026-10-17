const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const sandbox = {module:{exports:{}}, TextEncoder, Uint8Array, Float32Array, DataView};
const sourcePath = path.join(__dirname,'../src/audio-core.js');
if(fs.existsSync(sourcePath)) vm.runInNewContext(fs.readFileSync(sourcePath,'utf8'),sandbox);
const core=sandbox.module.exports;
test('pure audio/MIDI contract is exported',()=>assert.equal(typeof core.encodeMidi,'function'));
const {parseMidi}=require('midi-file');
const note=(pitch,start,end)=>({pitchMidi:pitch,startSeconds:start,endSeconds:end,velocity:96,origin:'detected'});
test('file boundaries and formats reject before reading',()=>{
 assert.equal(core.validateFile({name:'take.WAV',size:50*1024*1024}),null);
 assert.equal(core.validateFile({name:'take.wav',size:50*1024*1024+1}),'fileTooLarge');
 assert.equal(core.validateFile({name:'take.txt',size:10}),'unsupportedFormat');
 assert.equal(core.validateFile({name:'take.wav',size:0}),'emptyFile');
 for (const duration of [0.5,60]) assert.equal(core.validateDuration(duration),null);
 for (const duration of [0,0.4,60.1,NaN,Infinity]) assert.equal(core.validateDuration(duration),'invalidDuration');
});
test('mono averages both channels and rejects malformed PCM',()=>{
 assert.deepEqual(Array.from(core.mixChannels([new Float32Array([1,0,-1]),new Float32Array([-1,1,0])])),[0,.5,-.5]);
 assert.throws(()=>core.mixChannels([]));
 assert.throws(()=>core.mixChannels([new Float32Array([NaN])]));
});
test('invalid notes are excluded and source is not mutated',()=>{
 const rows=[note(60,0,1),note(200,0,1),note(60,-1,1),note(60,NaN,1),note(60,1,1),note(60,1,Infinity),note(61,1,3)];
 const normalized=core.normalizeNotes(rows,2);
 assert.equal(normalized.length,2); assert.equal(normalized[1].endSeconds,2); assert.equal(rows[6].endSeconds,3);
 assert.equal(normalized[0].velocity,96); assert.equal(new Set(normalized.map(n=>n.id)).size,2);
});
test('generation rejects old completions after cancel and source replacement',()=>{
 const guard=core.createGeneration(); const a=guard.next();assert.equal(guard.isCurrent(a),true);
 const b=guard.next();assert.equal(guard.isCurrent(a),false);assert.equal(guard.isCurrent(b),true);
 guard.next(); assert.equal(guard.isCurrent(b),false);
});
test('filename is editable, Japanese-safe, and has exactly one .mid extension',()=>{
 assert.equal(core.safeMidiName('鼻歌 / take.mid.mid'),'鼻歌  take.mid');
 assert.equal(core.safeMidiName(' \u0000/\\:*?"<>|. '),'audio-to-midi-notes.mid');
 assert.equal(core.defaultMidiName('song.MP3'),'song-notes.mid');
 assert.equal(core.safeMidiName('CON'),'_CON.mid');
});
test('independent MIDI parser verifies exact pitches, channel, velocity, timing and format',()=>{
 const source=[note(60,0,.5),note(60,.5,1.0001),note(64,.125,.875),note(67,.125,.875),note(127,1.2,1.20001)];
 const encoded=core.encodeMidi(source); const midi=parseMidi(encoded);
 assert.equal(midi.header.format,1);assert.equal(midi.header.numTracks,2);assert.equal(midi.header.ticksPerBeat,480);
 assert.equal(midi.tracks[0].find(e=>e.type==='setTempo').microsecondsPerBeat,500000);
 assert.equal(midi.tracks[1].find(e=>e.type==='programChange').programNumber,0);
 let tick=0; const pending=new Map(), decoded=[];
 for(const e of midi.tracks[1]){
  tick+=e.deltaTime;
  if(e.type==='noteOn'){assert.equal(e.channel,0);assert.equal(e.velocity,96); if(!pending.has(e.noteNumber)) pending.set(e.noteNumber,[]);pending.get(e.noteNumber).push(tick);}
  if(e.type==='noteOff'){assert.equal(e.channel,0);const start=pending.get(e.noteNumber).shift();assert.notEqual(start,undefined);decoded.push(note(e.noteNumber,start/960,tick/960));}
 }
 assert.equal(decoded.length,source.length);assert.equal([...pending.values()].flat().length,0);
 for(const n of source){const actual=decoded.find(x=>x.pitchMidi===n.pitchMidi&&Math.abs(x.startSeconds-n.startSeconds)<.001);assert.ok(actual);assert.ok(Math.abs(actual.endSeconds-n.endSeconds)<.002);assert.ok(actual.endSeconds>actual.startSeconds);}
 const atBoundary=midi.tracks[1].filter(e=>['noteOn','noteOff'].includes(e.type)&&e.noteNumber===60);
 assert.deepEqual(atBoundary.map(e=>e.type),['noteOn','noteOff','noteOn','noteOff']);
});
test('MIDI rejects empty or invalid rows rather than emitting corrupt output',()=>{
 assert.equal(typeof core.encodeMidi,'function'); assert.throws(()=>core.encodeMidi([]));assert.throws(()=>core.encodeMidi([note(60,NaN,1)]));assert.throws(()=>core.encodeMidi([note(1,.3,.2)]));
});
test('opening then cancelling a confirmation does not invalidate active work',()=>{
 const guard=core.createGeneration();const active=guard.next();
 assert.equal(typeof guard.capture,'function');const confirmation=guard.capture();assert.equal(guard.isCurrent(active),true);assert.equal(confirmation,active);
 guard.next();assert.equal(guard.isCurrent(confirmation),false);
});
test('overlapping same-pitch notes retain balanced events without deduplication',()=>{
 const notes=[note(60,0,1),note(60,.25,1.25),note(64,.1,.9)];const midi=parseMidi(core.encodeMidi(notes));
 const events=midi.tracks[1].filter(e=>e.type==='noteOn'||e.type==='noteOff');
 assert.equal(events.filter(e=>e.type==='noteOn').length,3);assert.equal(events.filter(e=>e.type==='noteOff').length,3);
 let tick=0;const on=[],off=[];for(const event of midi.tracks[1]){tick+=event.deltaTime;if(event.noteNumber===60){if(event.type==='noteOn')on.push(tick);if(event.type==='noteOff')off.push(tick);}}
 assert.deepEqual(on,[0,240]);assert.deepEqual(off,[960,1200]);
});

test('worker bootstrap declares legacy runtime without permitting string evaluation',()=>{const source=core.buildWorkerSource('/* tf */','/* midi */','exports.ok=true;','/* worker */');assert.ok(source.startsWith('var regeneratorRuntime;\n'));assert.ok(source.includes('return {Midi:self.Midi}'));});
test('worker bootstrap disables the optional TF WASM probe without changing other worker globals',()=>{
 let wasmAccesses=0;
 const worker={self:null,expectedWasm:{},WebAssembly:null};worker.self=worker;
 Object.defineProperty(worker,'WebAssembly',{get(){wasmAccesses++;throw new Error('WASM must not be probed');},configurable:true});
 vm.createContext(worker,{codeGeneration:{strings:false,wasm:false}});
 // Match the pinned bundle's strict legacy assignment, UMD this binding, and
 // caught long.js optimization attempt. Throwing alone cannot detect a probe.
 const tf='(function(root){"use strict";regeneratorRuntime={};try{new WebAssembly.Module(new Uint8Array());}catch(error){}root.tf={cpu:true};})(this);';
 const midi='self.Midi=function Midi(){};';
 const post='exports.midi=require("@tonejs/midi").Midi;';
 const inference='self.bootstrapReady=tf.cpu && BasicPitchPostprocess.midi===self.Midi;';
 vm.runInContext(core.buildWorkerSource(tf,midi,post,inference),worker);
 assert.equal(wasmAccesses,0,'TF must never access the real WASM API');
 assert.equal(worker.bootstrapReady,true);
 // The shadow is limited to the TF source, not a replacement of the global API.
 Object.defineProperty(worker,'WebAssembly',{value:worker.expectedWasm,configurable:true});
 assert.equal(vm.runInContext('WebAssembly===self.expectedWasm',worker),true);
});
