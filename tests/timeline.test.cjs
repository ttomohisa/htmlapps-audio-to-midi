const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const file=path.join(__dirname,'../src/timeline-core.js');
const api=()=>{assert.ok(fs.existsSync(file),'timeline core must exist');return require(file);};
test('timeline positions use source seconds and MIDI 60 means C4',()=>{
 const t=api(),view=t.geometry(10,80,500),note={pitchMidi:60,startSeconds:1.25,endSeconds:2.75};const original=JSON.stringify(note),r=t.noteRect(note,view);
 assert.equal(r.x,100);assert.equal(r.width,120);assert.equal(r.y,(127-60)*22+2);assert.equal(t.pitchName(60),'C4');assert.equal(t.xToTime(100,view),1.25);
 const zoom=t.geometry(10,160,500);assert.equal(t.noteRect(note,zoom).x,200);assert.equal(JSON.stringify(note),original);
});
test('timeline clamps seeks, fits short clips and bounds pitches without changing notes',()=>{
 const t=api(),view=t.geometry(.5,80,400);assert.equal(view.width,400);assert.equal(t.xToTime(-5,view),0);assert.equal(t.xToTime(999,view),.5);assert.equal(t.noteRect({pitchMidi:127,startSeconds:0,endSeconds:.5},view).y,2);
 assert.ok(t.ticks(view).length>1);for(const tick of t.ticks(view)){assert.ok(tick.seconds>=0&&tick.seconds<=.5);assert.equal(tick.x,tick.seconds*view.pixelsPerSecond);}
});
test('waveform keeps stereo energy and returns bounded min/max bins without mutating PCM',()=>{
 const t=api(),a=Float32Array.from([0,.8,-.4,0]),b=Float32Array.from([0,-.8,.4,0]);const wave=t.waveformPeaks([a,b],2);assert.equal(wave.length,2);assert.deepEqual(wave,[{min:-.800000011920929,max:.800000011920929},{min:-.4000000059604645,max:.4000000059604645}]);assert.equal(a[1],Math.fround(.8));assert.deepEqual(t.waveformPeaks([],20),[]);
});
test('short clips can zoom beyond their fitted viewport scale',()=>{const t=api(),fit=t.geometry(.5,80,400),zoom=t.geometry(.5,fit.pixelsPerSecond*2,400);assert.equal(zoom.width,fit.width*2);});

test('visible timeline bounds rows, ticks and waveform work while keeping full scroll geometry',()=>{
 const t=api(),view=t.geometry(300,320,900),peaks=Array.from({length:1200},()=>({min:-1,max:1}));
 const range=t.visibleRange(view,{scrollLeft:48000,scrollTop:1200,width:900,height:264});
 assert.equal(view.width,96000);assert.equal(view.height,2816);
 assert.equal(range.left,47840);assert.equal(range.right,49060);assert.equal(range.top,1156);assert.equal(range.bottom,1508);
 assert.equal(range.startSeconds,149.5);assert.equal(range.endSeconds,153.3125);
 assert.ok(range.maxPitch-range.minPitch<=17);assert.ok(t.ticks(view,range).length<20);
 const bins=t.waveformRange(peaks,view,range);assert.ok(bins.end-bins.start<20);assert.ok(bins.start>0&&bins.end<peaks.length);
 for(const position of [{scrollLeft:0,scrollTop:0},{scrollLeft:view.width-900,scrollTop:view.height-264}]){
  const edge=t.visibleRange(view,{...position,width:900,height:264});assert.ok(edge.left>=0&&edge.right<=view.width);assert.ok(edge.top>=0&&edge.bottom<=view.height);assert.ok(edge.minPitch>=0&&edge.maxPitch<=127);
  const edgeBins=t.waveformRange(peaks,view,edge);assert.ok(edgeBins.start>=0&&edgeBins.end<=peaks.length);
 }
 assert.deepEqual(t.waveformRange([],view,range),{start:0,end:0});
});

test('indexed visible notes include crossing sustains, edge pitches and original overlap order',()=>{
 const t=api(),notes=Object.freeze([
  Object.freeze({id:'later',pitchMidi:60,startSeconds:149,endSeconds:151}),
  Object.freeze({id:'sustain',pitchMidi:60,startSeconds:0,endSeconds:300}),
  Object.freeze({id:'expired',pitchMidi:60,startSeconds:1,endSeconds:2}),
  Object.freeze({id:'high',pitchMidi:127,startSeconds:150,endSeconds:151}),
  Object.freeze({id:'low',pitchMidi:0,startSeconds:150,endSeconds:151}),
  Object.freeze({id:'future',pitchMidi:60,startSeconds:160,endSeconds:161})
 ]),index=t.createNoteIndex(notes);
 const range={startSeconds:150,endSeconds:152,minPitch:60,maxPitch:60};
 assert.deepEqual(index.query(range),[notes[0],notes[1]]);assert.equal(index.get('sustain'),notes[1]);assert.equal(index.get('missing'),undefined);
 assert.deepEqual(index.query({...range,minPitch:127,maxPitch:127}),[notes[3]]);assert.deepEqual(index.query({...range,minPitch:0,maxPitch:0}),[notes[4]]);
 assert.deepEqual(index.query({...range,startSeconds:301,endSeconds:302}),[]);
});

test('dense visible-range queries equal a brute-force reference without changing model seconds or order',()=>{
 const t=api();let seed=1729;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 const notes=Object.freeze(Array.from({length:20000},(_,i)=>{const start=random()*299;return Object.freeze({id:String(i),pitchMidi:Math.floor(random()*128),startSeconds:start,endSeconds:Math.min(300,start+(i%59===0?150:.03+random()*3))});}));
 const original=JSON.stringify(notes),index=t.createNoteIndex(notes);
 for(const scale of [20,80,320])for(let i=0;i<20;i++){
  const view=t.geometry(300,scale,900),range=t.visibleRange(view,{scrollLeft:random()*(view.width-900),scrollTop:random()*(view.height-264),width:900,height:264});
  const expected=notes.filter(n=>n.pitchMidi>=range.minPitch&&n.pitchMidi<=range.maxPitch&&n.startSeconds<=range.endSeconds&&n.endSeconds>=range.startSeconds);
  assert.deepEqual(index.query(range),expected);assert.ok(expected.length<notes.length/10);
 }
 assert.equal(JSON.stringify(notes),original);
});
