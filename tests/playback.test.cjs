const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const sourcePath = path.join(__dirname, '../src/playback-engine.js');
const note = (pitch, start, end) => ({id:`${pitch}-${start}`, pitchMidi:pitch, startSeconds:start, endSeconds:end, velocity:96, origin:'detected'});
const buffer = (duration = 4) => ({duration, sampleRate:48000, numberOfChannels:2});
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => {resolve=yes; reject=no;}); return {promise,resolve,reject}; };

// Only Web Audio and the host clock are faked; every transport operation runs the real module.
function harness(options = {}) {
  const contexts = [], changes = [], timers = new Set();
  class Param {
    constructor() {this.value=1; this.events=[];}
    setValueAtTime(value,time) {this.value=value; this.events.push(['set',value,time]);}
    linearRampToValueAtTime(value,time) {this.value=value; this.events.push(['ramp',value,time]);}
    setTargetAtTime(value,time,constant) {this.value=value; this.events.push(['target',value,time,constant]);}
  }
  class Node {
    constructor(context,kind) {this.context=context; this.kind=kind; this.connections=[]; this.disconnectCount=0; this.gain=new Param(); this.frequency=new Param(); this.stopCalls=[];}
    connect(target) {this.connections.push(target); return target;}
    disconnect() {this.connections=[]; this.disconnectCount++;}
    start(when=0,offset=0) {if(this.started) throw new Error('Source reused'); this.started=true; this.when=when; this.offset=offset; if(this.kind==='buffer') this.endAt=when+this.buffer.duration-offset;}
    stop(when=this.context.currentTime) {this.stopCalls.push(when); this.endAt=when;}
    end() {if(this.ended)return; this.ended=true; if(this.onended)this.onended();}
  }
  class Context {
    constructor() {this.currentTime=0; this.state='suspended'; this.destination={}; this.nodes=[]; this.closeCalls=0; this.resumeCalls=0; contexts.push(this);}
    createBufferSource() {return this.create('buffer');}
    createOscillator() {return this.create('oscillator');}
    createGain() {return this.create('gain');}
    create(kind) {const n=new Node(this,kind); this.nodes.push(n); return n;}
    resume() {this.resumeCalls++; if(options.resume)return options.resume(this); this.state='running'; return Promise.resolve();}
    close() {this.closeCalls++; this.state='closed'; return Promise.resolve();}
    advance(seconds) {this.currentTime+=seconds; for(const n of this.nodes) if(n.started && n.endAt<=this.currentTime) n.end();}
    sources(kind) {return this.nodes.filter(n=>n.started && (!kind||n.kind===kind));}
  }
  const sandbox = {
    module:{exports:{}},
    setInterval:fn=>{timers.add(fn);return fn;}, clearInterval:fn=>timers.delete(fn)
  };
  if(fs.existsSync(sourcePath))vm.runInNewContext(fs.readFileSync(sourcePath,'utf8'),sandbox);
  assert.equal(typeof sandbox.module.exports.createPlayer,'function','playback factory is exported');
  const player=sandbox.module.exports.createPlayer({createContext:options.createContext||(()=>new Context()),onChange:s=>changes.push(s)});
  return {player,contexts,changes,timers,advance(seconds) {for(const c of contexts)if(c.state==='running')c.advance(seconds); for(const tick of [...timers])tick(); for(const c of contexts)if(c.state==='running')c.advance(0);}};
}

function near(actual,expected) {assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);}
function released(context) {assert.equal(context.closeCalls,1); for(const node of context.nodes)assert.ok(node.disconnectCount>0,`${node.kind} was not disconnected`);}

test('module exports the same factory in CommonJS and a browser global',()=>{
  assert.ok(fs.existsSync(sourcePath),'playback source exists');
  const source=fs.readFileSync(sourcePath,'utf8'), common={module:{exports:{}}}, browser={};
  vm.runInNewContext(source,common); vm.runInNewContext(source,browser);
  assert.equal(typeof common.module.exports.createPlayer,'function');
  assert.equal(typeof browser.AudioMidiPlayback.createPlayer,'function');
});

test('loading keeps original stereo/native-rate buffer and never autoplays',async()=>{
  const h=harness(), b=buffer(); h.player.load(b,[note(60,0,1)]);
  assert.equal(h.player.snapshot().status,'stopped'); assert.equal(h.contexts.length,0);
  await h.player.play(); const source=h.contexts[0].sources('buffer')[0];
  assert.equal(source.buffer,b); assert.equal(source.buffer.sampleRate,48000); assert.equal(source.buffer.numberOfChannels,2);
  assert.equal(source.offset,0); assert.equal(h.player.snapshot().activeSources,1); h.player.dispose();
});

test('pause freezes AudioContext-based time, resume retains it, stop resets it',async()=>{
  const h=harness(); h.player.load(buffer()); await h.player.play(); h.advance(1.25);
  near(h.player.snapshot().position,1.25); h.player.pause(); const old=h.contexts[0]; released(old);
  assert.equal(h.player.snapshot().status,'paused'); h.advance(10); near(h.player.snapshot().position,1.25);
  await h.player.play(); near(h.contexts[1].sources('buffer')[0].offset,1.25); h.advance(.5);
  h.player.stop(); assert.equal(h.player.snapshot().position,0); assert.equal(h.player.snapshot().status,'stopped');
  assert.equal(h.player.snapshot().activeSources,0); released(h.contexts[1]); assert.equal(h.timers.size,0);
});

test('synth uses exact note pitch and seconds and permits overlapping notes',async()=>{
  const h=harness(); h.player.load(buffer(),[note(69,0,1),note(72,.1,.5),note(60,2,3)]); h.player.setMode('synth');
  await h.player.play(); const ctx=h.contexts[0], voices=ctx.sources('oscillator');
  assert.equal(voices.length,2,'only nearby notes are allocated'); near(voices[0].frequency.value,440); near(voices[1].frequency.value,523.2511306011972);
  near(voices[0].when,0); near(voices[0].endAt,1); near(voices[1].when,.1); near(voices[1].endAt,.5);
  assert.equal(ctx.sources('buffer').length,0);
  const envelope=voices[0].connections[0].gain.events;
  assert.equal(envelope[0][1],0); assert.ok(envelope.some(e=>e[0]==='ramp'&&e[1]>0&&e[1]<=.2));
  assert.equal(envelope.at(-1)[1],0); near(envelope.at(-1)[2],1); h.player.dispose();
});

test('lookahead advances without allocating sixty seconds of future voices',async()=>{
  const h=harness(); h.player.load(buffer(60),Array.from({length:60},(_,i)=>note(60,i,i+.5))); h.player.setMode('synth');
  await h.player.play(); const ctx=h.contexts[0]; assert.equal(ctx.sources('oscillator').length,1);
  h.advance(.9); assert.equal(ctx.sources('oscillator').length,2); near(ctx.sources('oscillator')[1].when,1);
  assert.equal(ctx.sources('oscillator')[0].disconnectCount,1); assert.equal(h.player.snapshot().activeSources,1);
  h.advance(20); assert.ok(ctx.sources('oscillator').length<=3,'missed expired notes are not played late'); h.player.dispose();
});

test('seek restarts a note spanning the cursor and preserves exact end time',async()=>{
  const h=harness(); h.player.load(buffer(),[note(60,0,3),note(64,0,.5),note(67,2,3)]); h.player.setMode('synth'); h.player.seek(1.5);
  assert.equal(h.contexts.length,0); await h.player.play(); const ctx=h.contexts[0], voice=ctx.sources('oscillator')[0];
  assert.equal(ctx.sources('oscillator').length,1); near(voice.when,0); near(voice.endAt,1.5);
  h.advance(.25); h.player.seek(.25); assert.ok(voice.stopCalls.includes(.25)); assert.equal(voice.disconnectCount,1);
  assert.equal(h.player.snapshot().status,'playing'); near(h.player.snapshot().position,.25); assert.equal(ctx.sources('oscillator').length,3);
  h.player.dispose();
});

test('switching original and synth preserves position and has only one active mode',async()=>{
  const h=harness(); h.player.load(buffer(),[note(60,0,4)]); await h.player.play(); h.advance(.7);
  const ctx=h.contexts[0], original=ctx.sources('buffer')[0]; h.player.setMode('synth');
  assert.equal(original.disconnectCount,1); assert.ok(original.stopCalls.includes(.7)); near(h.player.snapshot().position,.7);
  assert.equal(h.player.snapshot().activeSources,1); const voice=ctx.sources('oscillator')[0]; h.advance(.2); h.player.setMode('original');
  assert.equal(voice.disconnectCount,1); near(ctx.sources('buffer')[1].offset,.9); near(h.player.snapshot().position,.9);
  assert.equal(h.contexts.length,1); h.player.dispose();
});

test('repeated play while starting or playing never creates duplicate sources',async()=>{
  const waiting=deferred(), h=harness({resume:ctx=>waiting.promise.then(()=>{ctx.state='running';})}); h.player.load(buffer());
  const first=h.player.play(), second=h.player.play(); assert.equal(h.contexts.length,1); assert.equal(h.contexts[0].resumeCalls,1);
  assert.equal(h.player.snapshot().status,'starting'); waiting.resolve(); await Promise.all([first,second]); await h.player.play();
  assert.equal(h.contexts[0].sources().length,1); assert.equal(h.player.snapshot().activeSources,1); h.player.dispose();
});

for(const action of ['load','stop','pause','seek','setMode','setNotes','dispose']) {
  test(`${action} invalidates delayed resume and cannot start stale audio`,async()=>{
    const waiting=deferred(), h=harness({resume:ctx=>waiting.promise.then(()=>{if(ctx.state!=='closed')ctx.state='running';})}); h.player.load(buffer(),[note(60,0,1)]);
    const pending=h.player.play();
    if(action==='load')h.player.load(buffer(2),[]); else if(action==='seek')h.player.seek(1); else if(action==='setMode')h.player.setMode('synth'); else if(action==='setNotes')h.player.setNotes([]); else h.player[action]();
    waiting.resolve(); assert.equal(await pending,false); assert.equal(h.contexts[0].sources().length,0);
    assert.equal(h.player.snapshot().activeSources,0); assert.notEqual(h.player.snapshot().status,'playing'); h.player.dispose();
  });
}

test('an old resume completion cannot change a newer playing input',async()=>{
  const waiting=deferred(); let calls=0;
  const h=harness({resume:ctx=>++calls===1?waiting.promise.then(()=>{}):(ctx.state='running',Promise.resolve())});
  h.player.load(buffer(4)); const old=h.player.play(); h.player.load(buffer(2)); await h.player.play();
  waiting.resolve(); assert.equal(await old,false); assert.equal(h.player.snapshot().status,'playing');
  assert.equal(h.player.snapshot().duration,2); assert.equal(h.contexts[1].sources('buffer').length,1); h.player.dispose();
});

test('resume rejection closes resources and leaves a retryable paused state',async()=>{
  let fail=true; const h=harness({resume:ctx=>{if(fail){fail=false;return Promise.reject(new Error('Resume denied'));}ctx.state='running';return Promise.resolve();}});
  h.player.load(buffer()); await assert.rejects(h.player.play(),/Resume denied/); released(h.contexts[0]);
  assert.equal(h.player.snapshot().status,'paused'); assert.equal(h.player.snapshot().activeSources,0);
  await h.player.play(); assert.equal(h.player.snapshot().status,'playing'); h.player.dispose();
});

test('a stale resume rejection is ignored after input replacement',async()=>{
  const waiting=deferred(),h=harness({resume:()=>waiting.promise}); h.player.load(buffer()); const old=h.player.play();
  h.player.load(buffer(2)); waiting.reject(new Error('Old error')); assert.equal(await old,false);
  assert.equal(h.player.snapshot().status,'stopped'); assert.equal(h.player.snapshot().duration,2); h.player.dispose();
});

for(const mode of ['original','synth']) {
  test(`${mode} natural end reaches duration and releases every source, gain and context`,async()=>{
    const h=harness(); h.player.load(buffer(1),[note(60,0,.4),note(64,.5,.9)]); h.player.setMode(mode); await h.player.play();
    h.advance(.4); h.advance(.1); h.advance(.5); const ended=h.player.snapshot();
    assert.equal(ended.status,'ended'); assert.equal(ended.position,1); assert.equal(ended.activeSources,0); assert.equal(h.timers.size,0); released(h.contexts[0]);
    await h.player.play(); assert.equal(h.player.snapshot().position,0); assert.equal(h.player.snapshot().status,'playing'); h.player.dispose();
  });
}

test('playing note replacement stops old voices and uses the current notes at the current cursor',async()=>{
  const h=harness();h.player.load(buffer(),[note(60,0,4)]);h.player.setMode('synth');await h.player.play();h.advance(1);
  const ctx=h.contexts[0],old=ctx.sources('oscillator')[0];h.player.setNotes([note(69,.5,3)]);
  assert.equal(old.disconnectCount,1);near(ctx.sources('oscillator')[1].frequency.value,440);near(h.player.snapshot().position,1);h.player.dispose();
});

test('seek is bounded, endpoint ends playback, and empty/disposed players stay silent',async()=>{
  const h=harness();assert.equal(await h.player.play(),false);h.player.load(buffer());h.player.seek(-20);assert.equal(h.player.snapshot().position,0);
  h.player.seek(Infinity);assert.equal(h.player.snapshot().position,0);await h.player.play();h.player.seek(99);
  assert.equal(h.player.snapshot().position,4);assert.equal(h.player.snapshot().status,'ended');released(h.contexts[0]);
  h.player.load(null,[]);assert.equal(h.player.snapshot().status,'empty');assert.equal(h.player.snapshot().duration,0);
  h.player.dispose();h.player.dispose();assert.equal(await h.player.play(),false);assert.equal(h.player.snapshot().status,'disposed');
});

test('invalid notes and mode do not alter timing, pitch or the caller-owned notes',async()=>{
  const h=harness(),notes=[note(69,.1,.2),note(60,0,1)],before=JSON.stringify(notes);h.player.load(buffer(),notes);h.player.setMode('synth');await h.player.play();
  assert.equal(JSON.stringify(notes),before);assert.throws(()=>h.player.setMode('both'));
  for(const invalid of [note(60,NaN,1),note(200,0,1),note(60,1,1),note(60,0,5)])assert.throws(()=>h.player.setNotes([invalid]));
  h.player.dispose();
});

test('volume changes use the existing master gain and never add sources',async()=>{
  const h=harness();h.player.load(buffer());h.player.setVolume(.25);await h.player.play();const ctx=h.contexts[0],source=ctx.sources()[0],master=source.connections[0];
  near(master.gain.value,.25);h.player.setVolume(.6);near(master.gain.value,.6);assert.equal(ctx.sources().length,1);h.player.dispose();
});

test('synchronous context/resume failures are retryable and clean up allocated resources',async()=>{
  const unavailable=harness({createContext:()=>{throw new Error('No device');}}); unavailable.player.load(buffer());
  await assert.rejects(unavailable.player.play(),/No device/);assert.equal(unavailable.player.snapshot().status,'paused');unavailable.player.dispose();
  const refused=harness({resume:()=>{throw new Error('Device refused');}});refused.player.load(buffer());
  await assert.rejects(refused.player.play(),/Device refused/);released(refused.contexts[0]);refused.player.dispose();
});

test('repeated replacements disconnect every graph and release the old original buffer',async()=>{
  const h=harness();for(let i=0;i<20;i++){
    h.player.load(buffer(2),[note(60,0,2)]);h.player.setMode(i%2?'original':'synth');await h.player.play();h.advance(.2);
  }
  h.player.load(null,[]);assert.equal(h.player.snapshot().activeSources,0);assert.equal(h.player.snapshot().duration,0);
  for(const ctx of h.contexts)released(ctx);assert.equal(h.timers.size,0);h.player.dispose();
});

test('scheduled future notes are stopped and disconnected on pause',async()=>{
  const h=harness();h.player.load(buffer(),[note(60,.1,1)]);h.player.setMode('synth');await h.player.play();
  const ctx=h.contexts[0],future=ctx.sources('oscillator')[0];near(future.when,.1);h.player.pause();
  assert.ok(future.stopCalls.includes(0));released(ctx);assert.equal(h.player.snapshot().activeSources,0);h.player.dispose();
});

test('synth with no notes still advances and closes its silent graph at clip end',async()=>{
  const h=harness();h.player.load(buffer(1),[]);h.player.setMode('synth');await h.player.play();h.advance(.5);
  near(h.player.snapshot().position,.5);assert.equal(h.player.snapshot().activeSources,0);h.advance(.5);
  assert.equal(h.player.snapshot().status,'ended');released(h.contexts[0]);h.player.dispose();
});

test('sub-millisecond notes use a finite monotonic envelope and exact end without dropping overlap',async()=>{
  const h=harness();h.player.load(buffer(),[note(60,0,.0001),note(60,0,.0001)]);h.player.setMode('synth');await h.player.play();
  const voices=h.contexts[0].sources('oscillator');assert.equal(voices.length,2);
  for(const voice of voices){const events=voice.connections[0].gain.events;for(let i=0;i<events.length;i++){assert.ok(Number.isFinite(events[i][1]));assert.ok(Number.isFinite(events[i][2]));if(i)assert.ok(events[i][2]>=events[i-1][2]);}near(voice.endAt,.0001);}
  h.player.dispose();
});

test('changing mode, notes and cursor before first play preserves stopped state',()=>{
  const h=harness();h.player.load(buffer());h.player.setMode('synth');h.player.setNotes([note(60,0,1)]);h.player.seek(.5);
  assert.equal(h.player.snapshot().status,'stopped');assert.equal(h.contexts.length,0);h.player.dispose();
});
