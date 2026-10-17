// Opt-in milestone measurement, intentionally excluded from normal CI/npm test.
// Synthetic PCM only; no microphone, human recordings, browser, or network.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict'),crypto=require('node:crypto'),os=require('node:os');
const {execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..'),cache=path.join(root,'.cache');
const report={schemaVersion:1,date:new Date().toISOString(),cases:[],completed:false};
const output=path.join(root,'test-results/noise-characterization.json');
function save(){fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}
// Invalidate stale success before loading dependencies, reading model files, or
// starting inference. If setup fails or the process stops, it stays incomplete.
save();
(async()=>{
 let model;
 try{
const tf=require(path.join(cache,'-tensorflow-tfjs-3.21.0/extracted/package/dist/tf.min.js'));
const Midi=require(path.join(cache,'-tonejs-midi-2.0.28/extracted/package/build/Midi.js'));
const post={exports:{}};
const postFile=path.join(cache,'-spotify-basic-pitch-1.0.1/extracted/package/cjs/toMidi.js');
vm.runInNewContext(fs.readFileSync(postFile,'utf8'),{exports:post.exports,require:id=>{assert.equal(id,'@tonejs/midi');return Midi;},Buffer});
const {runBasicPitch}=require('../src/inference-worker.js');
const core=require('../src/audio-core.js'),{presets}=require('../src/detection-settings.js');
const {makeWav}=require('./fixtures.cjs');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const duration=2.5,sampleRate=22050;
// Decode only our known PCM16 mono generator, not arbitrary audio input.
function generatedPcm(noise){const wav=makeWav({duration,sampleRate,noise,notes:noise?[]:[{pitch:60,start:.25,end:2.25}]});const samples=new Float32Array((wav.length-44)/2);for(let i=0;i<samples.length;i++)samples[i]=wav.readInt16LE(44+2*i)/32768;return samples;}
const noise=generatedPcm(true),tone=generatedPcm(false);
const fixtures=[
 {id:'silence',samples:new Float32Array(sampleRate*duration),description:'Exact digital zero',reference:'no intentional pitched notes'},
 {id:'noise-1729',samples:noise,description:'Existing makeWav F-09 uniform seeded LCG noise, seed 1729, peak parameter 0.3, PCM16 quantized',reference:'no intentional pitched notes'},
 {id:'near-silence-noise-1729',samples:Float32Array.from(noise,x=>x/10000),description:'Same quantized noise scaled by 1e-4 in Float32 PCM (not requantized)',reference:'no intentional pitched notes'},
 {id:'near-silence-c4',samples:Float32Array.from(tone,x=>x/10000),description:'PCM16 synthetic C4 scaled by 1e-4, no noise; intentional 0.25–2.25s C4',reference:'quiet intentional C4; detection is descriptive, not a required sensitivity threshold'},
 {id:'c4-positive-control',samples:tone,description:'Existing F-01 PCM16 synthetic C4 at amplitude parameter 0.6, 0.25–2.25s',reference:'C4 must be detected at each preset'},
];
Object.assign(report,{schemaVersion:1,date:new Date().toISOString(),gitHead:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),environment:{node:process.version,platform:os.platform(),release:os.release(),arch:os.arch(),cpu:os.cpus()[0]?.model},model:'@spotify/basic-pitch 1.0.1',tfjs:tf.version.tfjs,sampleRate,duration,scope:'Node CPU synthetic characterization; no browser/UI/device/real audio/DAW acceptance',criteria:'All cases complete, normalized notes obey the app contract, tensors return to baseline; exact silence has zero notes; C4 control detects MIDI60. Noise and quiet-tone note counts are observations, not pass/fail accuracy targets.',sourceHashes:{},cases:[],completed:false});
for(const name of ['src/inference-worker.js','src/audio-core.js','src/detection-settings.js','tests/fixtures.cjs','tests/noise-characterization.cjs','dependencies.lock.json'])report.sourceHashes[name]=hash(fs.readFileSync(path.join(root,name)));
const modelRoot=path.join(cache,'-spotify-basic-pitch-1.0.1/extracted/package/model');
const modelBytes=fs.readFileSync(path.join(modelRoot,'group1-shard1of1.bin'));
report.sourceHashes.modelWeights=hash(modelBytes);report.sourceHashes.modelJson=hash(fs.readFileSync(path.join(modelRoot,'model.json')));report.sourceHashes.postprocess=hash(fs.readFileSync(postFile));
  await tf.setBackend('cpu');await tf.ready();report.backend=tf.getBackend();
  const json=JSON.parse(fs.readFileSync(path.join(modelRoot,'model.json'),'utf8'));
  model=await tf.loadGraphModel({load:async()=>({modelTopology:json.modelTopology,weightSpecs:json.weightsManifest.flatMap(m=>m.weights),weightData:modelBytes.buffer.slice(modelBytes.byteOffset,modelBytes.byteOffset+modelBytes.byteLength)})});
  const baseline=tf.memory().numTensors;report.baselineTensors=baseline;
  for(const fixture of fixtures){
   let peak=0,power=0;for(const x of fixture.samples){peak=Math.max(peak,Math.abs(x));power+=x*x;}const rms=Math.sqrt(power/fixture.samples.length);
   for(const [preset,settings] of Object.entries(presets)){
    const started=performance.now(),raw=await runBasicPitch(tf,post.exports,model,fixture.samples,()=>{},settings),notes=core.normalizeNotes(raw,duration);
    assert.equal(tf.memory().numTensors,baseline,'Intermediate tensors must be released');
    for(const n of notes){assert.ok(Number.isInteger(n.pitchMidi)&&n.pitchMidi>=21&&n.pitchMidi<=108);assert.ok(Number.isFinite(n.startSeconds)&&Number.isFinite(n.endSeconds)&&n.startSeconds>=0&&n.startSeconds<n.endSeconds&&n.endSeconds<=duration);}
    if(fixture.id==='silence')assert.equal(notes.length,0,'Exact digital silence must remain empty');
    if(fixture.id==='c4-positive-control')assert.ok(notes.some(n=>n.pitchMidi===60),'Positive control must detect C4');
    const result={id:fixture.id,description:fixture.description,reference:fixture.reference,pcmSha256:hash(Buffer.from(fixture.samples.buffer)),sampleEncoding:'Float32 native-endian PCM',endianness:os.endianness(),peak,rms,rmsDbfs:rms?20*Math.log10(rms):null,preset,settings,elapsedMs:performance.now()-started,rawNoteCount:raw.length,noteCount:notes.length,notes,tensorsAfter:tf.memory().numTensors};
    report.cases.push(result);save();console.log(JSON.stringify({id:result.id,preset,noteCount:notes.length,elapsedMs:result.elapsedMs}));
   }
  }
  model.dispose();model=null;report.tensorsAfterDispose=tf.memory().numTensors;assert.equal(report.tensorsAfterDispose,0);report.completed=true;save();
 }finally{if(model)model.dispose();}
})().catch(error=>{report.error=String(error);save();console.error(error);process.exitCode=1;});
