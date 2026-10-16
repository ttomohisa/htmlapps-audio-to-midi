const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const sourcePath = path.join(__dirname, '../src/recording-engine.js');
const deferred = () => {let resolve, reject; const promise = new Promise((yes, no) => {resolve=yes; reject=no;}); return {promise, resolve, reject};};
const flush = async () => {for (let i=0; i<6; i++) await Promise.resolve();};

// Host media APIs and time are faked; all ownership/state transitions run the real recorder.
function harness(options = {}) {
  let clock = 0, serial = 0;
  const timers = new Map(), contexts = [], media = [], changes = [], requests = [], checks = [];
  class Events {
    constructor() {this.listeners=new Map();}
    addEventListener(name, fn) {if(!this.listeners.has(name)) this.listeners.set(name,new Set()); this.listeners.get(name).add(fn);}
    removeEventListener(name, fn) {this.listeners.get(name)?.delete(fn);}
    emit(name, value={}) {for(const fn of [...(this.listeners.get(name)||[])]) fn(value);}
    listenerCount() {return [...this.listeners.values()].reduce((n, list)=>n+list.size,0);}
  }
  class Track extends Events {
    constructor() {super(); this.readyState='live'; this.kind='audio'; this.stopCalls=0;}
    stop() {this.stopCalls++; this.readyState='ended';}
    lose() {this.readyState='ended'; this.emit('ended');}
  }
  function stream() {const track=new Track(); return {track, getTracks:()=>[track], getAudioTracks:()=>[track]};}
  const defaultStream=stream();
  class Recorder extends Events {
    static isTypeSupported(type) {checks.push(type); return options.supports ? options.supports(type) : type==='audio/webm;codecs=opus';}
    constructor(input, config) {super(); if(options.constructorError) throw options.constructorError; this.stream=input; this.mimeType=options.actualMime||config.mimeType; this.state='inactive'; this.stopCalls=0; this.startCalls=0; media.push(this);}
    start(timeslice) {this.startCalls++; this.timeslice=timeslice; if(options.startError) throw options.startError; this.state='recording'; this.emit('start');}
    stop() {this.stopCalls++; if(options.stopError) throw options.stopError; this.state='inactive';}
    chunk(value) {this.emit('dataavailable',{data:new Blob([value],{type:this.mimeType})});}
    finish(value='') {if(value)this.chunk(value); this.state='inactive'; this.emit('stop');}
  }
  class Node {
    constructor(kind) {this.kind=kind; this.connections=[]; this.disconnectCalls=0; this.fftSize=256;}
    connect(target) {this.connections.push(target);}
    disconnect() {this.connections=[]; this.disconnectCalls++;}
    getFloatTimeDomainData(values) {values.fill(options.amplitude ?? .25);}
  }
  class Context {
    constructor() {this.state='suspended'; this.destination={}; this.nodes=[]; this.closeCalls=0; contexts.push(this);}
    createMediaStreamSource() {const node=new Node('source'); this.nodes.push(node); return node;}
    createAnalyser() {const node=new Node('analyser'); this.nodes.push(node); return node;}
    resume() {if(options.resume) return options.resume(this); this.state='running'; return Promise.resolve();}
    close() {this.closeCalls++; this.state='closed'; return Promise.resolve();}
  }
  const schedule=(fn, delay, repeat)=>{const id=++serial; timers.set(id,{fn, due:clock+delay, repeat:repeat?delay:0}); return id;};
  const injected={
    isSecureContext:true,
    getUserMedia:constraints=>{requests.push(constraints); return options.getUserMedia ? options.getUserMedia(constraints) : Promise.resolve(defaultStream);},
    MediaRecorder:Recorder,
    createContext:()=>new Context(),
    canPlayType:type=>options.canPlayType ? options.canPlayType(type) : 'probably',
    now:()=>clock,
    setTimeout:(fn,ms)=>schedule(fn,ms,false), clearTimeout:id=>timers.delete(id),
    setInterval:(fn,ms)=>schedule(fn,ms,true), clearInterval:id=>timers.delete(id),
    onChange:s=>{changes.push(s); if(options.onChange)options.onChange(s);},
    ...options.inject
  };
  const sandbox={module:{exports:{}}, Blob, Float32Array};
  if(fs.existsSync(sourcePath)) vm.runInNewContext(fs.readFileSync(sourcePath,'utf8'),sandbox);
  assert.equal(typeof sandbox.module.exports.createRecorder,'function','recording factory is exported');
  const recorder=sandbox.module.exports.createRecorder(injected);
  function advance(ms) {
    const target=clock+ms;
    for (;;) {
      const next=[...timers].filter(([,t])=>t.due<=target).sort((a,b)=>a[1].due-b[1].due||a[0]-b[0])[0];
      if(!next)break;
      const [id,t]=next; clock=t.due; if(t.repeat)t.due+=t.repeat; else timers.delete(id); t.fn();
    }
    clock=target;
  }
  return {recorder, contexts, media, changes, requests, checks, timers, stream, defaultStream, advance, api:sandbox.module.exports};
}
function released(h) {
  assert.equal(h.defaultStream.track.readyState,'ended');
  for(const c of h.contexts) {assert.equal(c.state,'closed'); for(const n of c.nodes)assert.equal(n.connections.length,0);}
}

test('construction is silent and exposes an immutable snapshot copy',()=>{
  const h=harness(), s=h.recorder.snapshot();
  assert.deepEqual(JSON.parse(JSON.stringify(s)),{status:'idle',elapsedSeconds:0,level:0,error:null,mimeType:'',blob:null});
  s.status='recording'; assert.equal(h.recorder.snapshot().status,'idle');
  assert.equal(h.requests.length,0); assert.equal(h.contexts.length,0); assert.equal(h.changes.length,0); assert.equal(h.timers.size,0);
});

test('explicit start requests audio only, chooses a playable MIME, and does not monitor to speakers',async()=>{
  const h=harness(); const result=h.recorder.start(); assert.equal(h.requests.length,1);
  assert.deepEqual(JSON.parse(JSON.stringify(h.requests[0])),{audio:true,video:false});
  assert.equal(await result,true); assert.equal(h.recorder.snapshot().status,'recording');
  assert.equal(h.recorder.snapshot().mimeType,'audio/webm;codecs=opus');
  const c=h.contexts[0]; assert.equal(c.nodes.length,2); assert.equal(c.nodes.find(n=>n.kind==='source').connections[0],c.nodes.find(n=>n.kind==='analyser'));
  assert.ok(c.nodes.every(n=>!n.connections.includes(c.destination)));
  h.advance(500); assert.equal(h.recorder.snapshot().elapsedSeconds,.5); assert.ok(Math.abs(h.recorder.snapshot().level-.25)<.0001);
  h.recorder.discard(); released(h); assert.equal(h.timers.size,0);
});

test('stop releases the mic immediately and awaits all final chunks and the stop event',async()=>{
  const h=harness(); await h.recorder.start(); h.media[0].chunk('first'); h.advance(750);
  const pending=h.recorder.stop(); assert.equal(pending,h.recorder.stop()); assert.equal(h.media[0].stopCalls,1);
  released(h); assert.equal(h.recorder.snapshot().status,'stopping'); assert.equal(h.recorder.snapshot().level,0);
  let complete=false; pending.then(()=>{complete=true;}); await flush(); assert.equal(complete,false);
  h.media[0].chunk('-last'); h.media[0].finish(); const blob=await pending;
  assert.equal(await blob.text(),'first-last'); assert.equal(h.recorder.snapshot().blob,blob);
  assert.equal(h.recorder.snapshot().status,'recorded'); assert.equal(h.recorder.snapshot().elapsedSeconds,.75);
  assert.equal(await h.recorder.stop(),blob); assert.equal(h.timers.size,0); assert.equal(h.media[0].listenerCount(),0);
});

for(const action of ['stop','discard','dispose']) {
  test(`${action} invalidates pending permission and immediately settles start; late grant is released`,async()=>{
    const permission=deferred(), h=harness({getUserMedia:()=>permission.promise}); const pending=h.recorder.start();
    assert.equal(pending,h.recorder.start()); assert.equal(h.requests.length,1);
    h.recorder[action](); assert.equal(await pending,false);
    permission.resolve(h.defaultStream); await flush(); released(h);
    assert.equal(h.media.length,0); assert.equal(h.recorder.snapshot().status,action==='dispose'?'disposed':'idle'); assert.equal(h.timers.size,0);
  });
}

test('a late old grant cannot overwrite a newer recording',async()=>{
  const permission=deferred(); let count=0; const h=harness({getUserMedia:()=>++count===1?permission.promise:Promise.resolve(h.defaultStream)});
  const old=h.recorder.start(); h.recorder.discard(); assert.equal(await h.recorder.start(),true);
  const late=h.stream(); permission.resolve(late); await old; await flush();
  assert.equal(late.track.readyState,'ended'); assert.equal(h.defaultStream.track.readyState,'live'); assert.equal(h.recorder.snapshot().status,'recording');
  h.recorder.dispose();
});

for(const [name,code] of [['NotAllowedError','permissionDenied'],['SecurityError','permissionDenied'],['NotFoundError','noMicrophone'],['DevicesNotFoundError','noMicrophone'],['NotReadableError','microphoneBusy'],['TrackStartError','microphoneBusy'],['AbortError','recordingFailed']]) {
  test(`${name} reports ${code} and allows a fresh attempt`,async()=>{
    let fail=true; const h=harness({getUserMedia:()=>fail?(fail=false,Promise.reject({name})):Promise.resolve(h.defaultStream)});
    assert.equal(await h.recorder.start(),false); assert.equal(h.recorder.snapshot().error,code); assert.equal(h.recorder.snapshot().status,'error'); assert.equal(h.timers.size,0);
    assert.equal(await h.recorder.start(),true); assert.equal(h.recorder.snapshot().error,null); h.recorder.dispose();
  });
}

for(const [inject,code] of [[{isSecureContext:false},'insecureContext'],[{getUserMedia:null},'microphoneUnavailable'],[{MediaRecorder:null},'recorderUnavailable'],[{createContext:null},'audioContextUnavailable']]) {
  test(`${code} is reported before any permission request`,async()=>{
    const h=harness({inject}); assert.equal(await h.recorder.start(),false); assert.equal(h.recorder.snapshot().error,code); assert.equal(h.requests.length,0); assert.equal(h.contexts.length,0);
  });
}

test('MIME selection requires recorder and audio playback support and can fall back to MP4',async()=>{
  const h=harness({supports:()=>true,canPlayType:type=>type==='audio/mp4'?'maybe':''});
  assert.equal(await h.recorder.start(),true); assert.equal(h.recorder.snapshot().mimeType,'audio/mp4'); h.recorder.dispose();
  const no=harness({supports:()=>false}); assert.equal(await no.recorder.start(),false); assert.equal(no.recorder.snapshot().error,'recordingUnsupported'); assert.equal(no.requests.length,0);
});

test('the actual recorder MIME is exposed and must also be playable',async()=>{
  const h=harness({actualMime:'audio/webm'}); await h.recorder.start(); assert.equal(h.recorder.snapshot().mimeType,'audio/webm'); h.recorder.discard();
  const bad=harness({actualMime:'audio/unknown',canPlayType:type=>type==='audio/unknown'?'':'probably'});
  assert.equal(await bad.recorder.start(),false); assert.equal(bad.recorder.snapshot().error,'recordingUnsupported'); released(bad);
});

test('recording auto-stops at 59 seconds and preserves the final complete blob',async()=>{
  const h=harness(); await h.recorder.start(); h.media[0].chunk('audio'); h.advance(58999); assert.equal(h.recorder.snapshot().status,'recording');
  h.advance(1); assert.equal(h.recorder.snapshot().status,'stopping'); assert.equal(h.recorder.snapshot().elapsedSeconds,59); released(h);
  h.media[0].finish('-end'); assert.equal(await h.recorder.snapshot().blob.text(),'audio-end'); assert.equal(h.recorder.snapshot().status,'recorded'); assert.equal(h.timers.size,0);
});

test('byte cap stops at the boundary and rejects overflow without exporting truncated audio',async()=>{
  const h=harness({inject:{maxBytes:8}}); await h.recorder.start(); h.media[0].chunk('12345678'); assert.equal(h.recorder.snapshot().status,'stopping'); released(h);
  h.media[0].finish(); assert.equal(h.recorder.snapshot().blob.size,8);
  const overflow=harness({inject:{maxBytes:8}}); await overflow.recorder.start(); overflow.media[0].chunk('12345678');
  const pending=overflow.recorder.stop(); overflow.media[0].finish('9'); assert.equal(await pending,null);
  assert.equal(overflow.recorder.snapshot().error,'recordingTooLarge'); assert.equal(overflow.recorder.snapshot().blob,null); assert.equal(overflow.timers.size,0);
});

test('a missing stop event expires safely with a retryable error',async()=>{
  const h=harness(); await h.recorder.start(); const pending=h.recorder.stop(); released(h);
  h.advance(5000); assert.equal(await pending,null); assert.equal(h.recorder.snapshot().error,'recordingStopTimeout'); assert.equal(h.timers.size,0);
  h.media[0].finish('late'); assert.equal(h.recorder.snapshot().blob,null);
});

test('track loss releases resources and prevents corrupted data from being accepted',async()=>{
  const h=harness(); await h.recorder.start(); h.defaultStream.track.lose(); released(h);
  assert.equal(h.recorder.snapshot().error,'microphoneLost'); assert.equal(h.recorder.snapshot().status,'error');
  h.media[0].finish('stale'); assert.equal(h.recorder.snapshot().blob,null); assert.equal(h.timers.size,0);
});

test('recorder errors clean up both recording and stopping states',async()=>{
  for(const stopping of [false,true]) {
    const h=harness(); await h.recorder.start(); const pending=stopping?h.recorder.stop():null;
    h.media[0].emit('error',{error:{name:'UnknownError'}}); assert.equal(h.recorder.snapshot().error,'recordingFailed'); released(h); assert.equal(h.timers.size,0);
    if(pending)assert.equal(await pending,null); h.media[0].finish('stale'); assert.equal(h.recorder.snapshot().blob,null);
  }
});

test('empty recording is a specific error and retains no empty download',async()=>{
  const h=harness(); await h.recorder.start(); const pending=h.recorder.stop(); h.media[0].chunk(''); h.media[0].finish();
  assert.equal(await pending,null); assert.equal(h.recorder.snapshot().error,'recordingEmpty'); assert.equal(h.recorder.snapshot().blob,null); assert.equal(h.timers.size,0);
});

for(const action of ['discard','dispose']) {
  test(`${action} while stopping settles promises and rejects stale native callbacks`,async()=>{
    const h=harness(); await h.recorder.start(); h.media[0].chunk('old'); const pending=h.recorder.stop(); h.recorder[action]();
    assert.equal(await pending,null); h.media[0].finish('late'); assert.equal(h.recorder.snapshot().blob,null); assert.equal(h.timers.size,0); released(h);
    if(action==='dispose'){assert.equal(await h.recorder.start(),false); h.recorder.discard(); assert.equal(h.recorder.snapshot().status,'disposed');}
  });
}

test('synchronous start, stop and context failures cannot leak tracks',async()=>{
  for(const options of [{startError:new Error('cannot start')},{constructorError:new Error('cannot construct')},{inject:{createContext:()=>{throw new Error('cannot create context');}}}]) {
    const h=harness(options); assert.equal(await h.recorder.start(),false); assert.equal(h.recorder.snapshot().error,'recordingFailed'); released(h); assert.equal(h.timers.size,0);
  }
  const h=harness({stopError:new Error('cannot stop')}); await h.recorder.start(); assert.equal(await h.recorder.stop(),null); assert.equal(h.recorder.snapshot().error,'recordingFailed'); released(h); assert.equal(h.timers.size,0);
});

test('repeated starts while active do not acquire another stream or discard the current chunks',async()=>{
  const h=harness(); const first=h.recorder.start(); await first; h.media[0].chunk('keep');
  assert.equal(h.recorder.start(),first); assert.equal(await h.recorder.start(),true); assert.equal(h.requests.length,1); assert.equal(h.media.length,1);
  const done=h.recorder.stop(); assert.equal(await h.recorder.start(),false); h.media[0].finish(); assert.equal(await (await done).text(),'keep');
});

test('an old permission rejection cannot overwrite a newer recording',async()=>{
  const permission=deferred(); let calls=0; const h=harness({getUserMedia:()=>++calls===1?permission.promise:Promise.resolve(h.defaultStream)});
  const old=h.recorder.start(); h.recorder.discard(); await h.recorder.start(); permission.reject({name:'NotAllowedError'}); await old; await flush();
  assert.equal(h.recorder.snapshot().status,'recording'); assert.equal(h.recorder.snapshot().error,null); h.recorder.dispose();
});

test('recorded data and metadata are fully cleared on discard',async()=>{
  const h=harness(); await h.recorder.start(); h.advance(1500); h.media[0].chunk('clip'); const done=h.recorder.stop(); h.media[0].finish(); await done;
  h.recorder.discard(); assert.deepEqual(JSON.parse(JSON.stringify(h.recorder.snapshot())),{status:'idle',elapsedSeconds:0,level:0,error:null,mimeType:'',blob:null});
  assert.equal(h.timers.size,0); assert.equal(h.media[0].listenerCount(),0); assert.equal(h.defaultStream.track.listenerCount(),0);
});

test('fresh attempts after track loss use a fresh graph and do not retain old listeners',async()=>{
  const streams=[]; const h=harness({getUserMedia:()=>{const stream=h.stream(); streams.push(stream); return Promise.resolve(stream);}});
  for(let i=0;i<10;i++) {
    assert.equal(await h.recorder.start(),true); const old=streams.at(-1); old.track.lose();
    assert.equal(h.recorder.snapshot().error,'microphoneLost'); assert.equal(old.track.listenerCount(),0); assert.equal(h.media.at(-1).listenerCount(),0); assert.equal(h.timers.size,0);
  }
  for(const context of h.contexts) {assert.equal(context.closeCalls,1); assert.ok(context.nodes.every(n=>n.disconnectCalls===1));}
  h.recorder.dispose();
});

test('unrequested native stop is an explicit lost-input error',async()=>{
  const h=harness(); await h.recorder.start(); h.media[0].finish('unexpected');
  assert.equal(h.recorder.snapshot().error,'microphoneLost'); assert.equal(h.recorder.snapshot().blob,null); released(h); assert.equal(h.timers.size,0);
});

test('meter resume refusal does not strand capture or cause speaker playback',async()=>{
  const h=harness({resume:()=>Promise.reject(new Error('autoplay blocked'))});
  assert.equal(await h.recorder.start(),true); await flush(); assert.equal(h.recorder.snapshot().status,'recording');
  assert.ok(h.contexts[0].nodes.every(n=>!n.connections.includes(h.contexts[0].destination))); h.recorder.discard(); released(h);
});

test('unavailable or already ended input tracks report noMicrophone and release the stream',async()=>{
  for(const ended of [false,true]) {
    const h=harness({getUserMedia:()=>{if(ended)h.defaultStream.track.readyState='ended'; else h.defaultStream.getAudioTracks=()=>[]; return Promise.resolve(h.defaultStream);}});
    assert.equal(await h.recorder.start(),false); assert.equal(h.recorder.snapshot().error,'noMicrophone'); released(h); assert.equal(h.timers.size,0);
  }
});

test('observer cancellation while requesting prevents even the initial permission request',async()=>{
  const h=harness({onChange:s=>{if(s.status==='requesting')h.recorder.discard();}});
  assert.equal(await h.recorder.start(),false); assert.equal(h.requests.length,0); assert.equal(h.recorder.snapshot().status,'idle');
});

test('observer cancellation on recording releases all native resources',async()=>{
  const h=harness({onChange:s=>{if(s.status==='recording')h.recorder.discard();}});
  await h.recorder.start(); released(h); assert.equal(h.recorder.snapshot().status,'idle'); assert.equal(h.timers.size,0); assert.equal(h.media[0].listenerCount(),0);
});

test('observer exceptions cannot leak the microphone or break stop completion',async()=>{
  const h=harness({onChange:()=>{throw new Error('UI callback failed');}}); assert.equal(await h.recorder.start(),true);
  const done=h.recorder.stop(); h.media[0].finish('clip'); assert.equal(await (await done).text(),'clip'); released(h); assert.equal(h.timers.size,0);
});

test('browser UMD export performs no media work until start is explicitly called',async()=>{
  let prompts=0, elements=0;
  const sandbox={Blob, Float32Array, isSecureContext:true, navigator:{mediaDevices:{getUserMedia(){prompts++; return Promise.reject({name:'NotAllowedError'});}}}, MediaRecorder:class {static isTypeSupported(){return true;}}, AudioContext:class {}, document:{createElement(name){assert.equal(name,'audio'); elements++; return {canPlayType:()=> 'probably'};}}, setTimeout,clearTimeout,setInterval,clearInterval,performance};
  vm.runInNewContext(fs.readFileSync(sourcePath,'utf8'),sandbox);
  assert.equal(typeof sandbox.AudioMidiRecording.createRecorder,'function');
  const recorder=sandbox.AudioMidiRecording.createRecorder(); assert.equal(prompts,0); assert.equal(elements,0);
  assert.equal(await recorder.start(),false); assert.equal(prompts,1); assert.ok(elements>0); assert.equal(recorder.snapshot().error,'permissionDenied');
});
