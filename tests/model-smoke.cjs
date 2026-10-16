// Actual model gate. Uses only pinned assets extracted by the standard build.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),cache=path.join(root,'.cache');
const tf=require(path.join(cache,'-tensorflow-tfjs-3.21.0/extracted/package/dist/tf.min.js'));
const Midi=require(path.join(cache,'-tonejs-midi-2.0.28/extracted/package/build/Midi.js'));
const post={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(cache,'-spotify-basic-pitch-1.0.1/extracted/package/cjs/toMidi.js'),'utf8'),{exports:post.exports,require:id=>{assert.equal(id,'@tonejs/midi');return Midi;},Buffer});
const {runBasicPitch}=require('../src/inference-worker.js'),core=require('../src/audio-core.js');
const {parseMidi}=require('midi-file');
// Reproduce the browser's no-eval contract before invoking the model. Merely
// disabling VM WASM code generation misses caught probes that Firefox reports
// as CSP console errors, so also fail on every access to the real WASM API.
const workerContext={self:null,console,TextEncoder,TextDecoder,setTimeout,clearTimeout,performance};workerContext.self=workerContext;
let wasmAccesses=0;
Object.defineProperty(workerContext,'WebAssembly',{get(){wasmAccesses++;throw new Error('Unexpected worker WASM probe');}});
vm.createContext(workerContext,{codeGeneration:{strings:false,wasm:false}});
vm.runInContext(core.buildWorkerSource(fs.readFileSync(path.join(cache,'-tensorflow-tfjs-3.21.0/extracted/package/dist/tf.min.js'),'utf8'),fs.readFileSync(path.join(cache,'-tonejs-midi-2.0.28/extracted/package/build/Midi.js'),'utf8'),fs.readFileSync(path.join(cache,'-spotify-basic-pitch-1.0.1/extracted/package/cjs/toMidi.js'),'utf8'),fs.readFileSync(path.join(root,'src/detection-settings.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'src/inference-worker.js'),'utf8')),workerContext);
assert.equal(wasmAccesses,0,'Pinned worker bootstrap must not probe WASM');
assert.equal(workerContext.tf.version.tfjs,'3.21.0');
assert.equal(typeof workerContext.tf.findBackendFactory('cpu'),'function');
assert.equal(typeof workerContext.Midi,'function');
assert.equal(vm.runInContext('typeof BasicPitchPostprocess.outputToNotesPoly',workerContext),'function');

const modelRoot=path.join(cache,'-spotify-basic-pitch-1.0.1/extracted/package/model');
(async()=>{
 await tf.setBackend('cpu');await tf.ready();
 const json=JSON.parse(fs.readFileSync(path.join(modelRoot,'model.json'),'utf8')),bytes=fs.readFileSync(path.join(modelRoot,'group1-shard1of1.bin'));
 const model=await tf.loadGraphModel({load:async()=>({modelTopology:json.modelTopology,weightSpecs:json.weightsManifest.flatMap(m=>m.weights),weightData:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)})});
 const baseline=tf.memory().numTensors;
 const samples=new Float32Array(22050*2.5);for(let i=0;i<samples.length;i++){const t=i/22050;if(t>=.25&&t<2.25)samples[i]=.6*Math.sin(2*Math.PI*261.625565*t)*Math.min(1,(t-.25)/.015,(2.25-t)/.015);}
 const started=Date.now(),progress=[];
 const raw=await runBasicPitch(tf,post.exports,model,samples,p=>progress.push(p));
 const notes=core.normalizeNotes(raw,2.5);
 assert.ok(notes.some(n=>n.pitchMidi===60),'C4 must be detected');assert.equal(tf.memory().numTensors,baseline,'intermediate tensors released');
 const midi=parseMidi(core.encodeMidi(notes));assert.equal(midi.header.format,1);
 const silence=await runBasicPitch(tf,post.exports,model,new Float32Array(22050),()=>{});assert.equal(silence.length,0);assert.equal(tf.memory().numTensors,baseline);
 const report={date:new Date().toISOString(),node:process.version,backend:tf.getBackend(),model:'@spotify/basic-pitch 1.0.1',tfjs:tf.version.tfjs,elapsedMs:Date.now()-started,baselineTensors:baseline,finalTensors:tf.memory().numTensors,notes,silenceNotes:silence.length,progressEvents:progress.length};
 fs.mkdirSync(path.join(root,'test-results'),{recursive:true});fs.writeFileSync(path.join(root,'test-results/model-smoke.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));model.dispose();assert.equal(tf.memory().numTensors,0);
})().catch(error=>{console.error(error);process.exitCode=1;});
