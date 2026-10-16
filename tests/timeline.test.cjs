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
