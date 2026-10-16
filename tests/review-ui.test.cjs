const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const timeline=require('../src/timeline-core.js');
const source=fs.readFileSync(path.join(__dirname,'../src/review-ui.js'),'utf8');

function harness(){
 class Element {
  constructor(name='div'){this.name=name;this.attrs={};this.dataset={};this.style={};this.children=[];this.events={};this.value='';this.checked=false;this.clientWidth=900;this.clientHeight=264;this.scrollLeft=0;this.scrollTop=0;this.replacements=0;this.textContent='';this.classList={toggle:(name,enabled)=>{const values=(this.attrs.class||'').split(' ').filter(Boolean).filter(value=>value!==name);if(enabled)values.push(name);this.attrs.class=values.join(' ');}};}
  setAttribute(key,value){this.attrs[key]=String(value);if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(value);}
  getAttribute(key){return this.attrs[key]??null;}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.replacements++;this.children=children;}
  querySelectorAll(selector){const result=[];const matches=el=>selector==='[data-note-id]'?el.dataset.noteId!==undefined:selector==='.playhead'?(el.attrs.class||'').split(' ').includes('playhead'):el.name===selector;const visit=el=>{for(const child of el.children){if(matches(child))result.push(child);visit(child);}};visit(this);return result;}
  querySelector(selector){if(selector==='[value="synth"]')return this.synth||(this.synth=new Element('option'));return this.querySelectorAll(selector)[0]||null;}
  addEventListener(name,callback){(this.events[name]??=[]).push(callback);}
  fire(name,extra={}){for(const callback of this.events[name]||[])callback({target:this,...extra});}
  getBoundingClientRect(){return {left:0};}
 }
 const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
 const svg=get('pianoRoll'),waveform=get('waveform'),piano=get('pianoScroll'),wave=get('waveScroll');
 get('reviewCard').children=[svg,waveform];
 for(const [scroller,content] of [[piano,svg],[wave,waveform]])for(const [axis,dimension,size] of [['scrollLeft','width','clientWidth'],['scrollTop','height','clientHeight']]){
  let value=0;Object.defineProperty(scroller,axis,{get:()=>value,set:next=>{value=Math.max(0,Math.min(Number(next)||0,Math.max(0,Number(content.getAttribute(dimension))-scroller[size])));}});
 }
 const frames=new Map();let nextFrame=0,observerCallback,disconnected=false;
 let playback={duration:0,position:0,mode:'original',status:'empty',activeSources:0},player;
 const sandbox={AudioMidiTimeline:timeline,document:{getElementById:get,createElementNS:(_,name)=>new Element(name),createElement:name=>new Element(name)},requestAnimationFrame:callback=>{const id=++nextFrame;frames.set(id,callback);return id;},cancelAnimationFrame:id=>frames.delete(id),ResizeObserver:class {constructor(callback){observerCallback=callback;}observe(){}disconnect(){disconnected=true;}},AudioMidiPlayback:{createPlayer:({onChange})=>{
  const update=patch=>{Object.assign(playback,patch);onChange();};
  player={snapshot:()=>({...playback}),load:buffer=>update({duration:buffer?.duration||0,position:0,status:buffer?'stopped':'empty'}),setNotes:()=>{},setMode:mode=>update({mode}),seek:position=>update({position}),play:()=>update({status:'playing'}),pause:()=>update({status:'paused'}),stop:()=>update({status:'stopped',position:0}),dispose:()=>update({status:'disposed'})};return player;
 }}};
 const edits=[],selections=[];vm.runInNewContext(source+';this.Review=AudioMidiReview;',sandbox);
 const review=sandbox.Review.create({translate:key=>key,onEdit:action=>edits.push(action),onSelection:id=>selections.push(id)});
 function flush(){const pending=[...frames.values()];frames.clear();for(const callback of pending)callback();}
 return {review,get,svg,waveform,piano,wave,frames,flush,resize:()=>observerCallback(),edits,selections,player:()=>player,disconnected:()=>disconnected};
}
function fixture(duration=300){
 const notes=Array.from({length:12000},(_,i)=>({id:String(i),pitchMidi:21+i%88,startSeconds:i*(duration-1)/12000,endSeconds:i*(duration-1)/12000+.03,velocity:96,origin:'detected'}));
 notes.push({id:'sustain',pitchMidi:60,startSeconds:0,endSeconds:duration,velocity:96,origin:'detected'},{id:'last',pitchMidi:127,startSeconds:duration-.2,endSeconds:duration,velocity:96,origin:'manual'});
 return {buffer:{duration,numberOfChannels:1,getChannelData:()=>new Float32Array(2400)},notes:Object.freeze(notes.map(Object.freeze))};
}

test('review renders bounded note/axis/wave content, coalesces scroll and reveals offscreen selection',()=>{
 const h=harness(),{buffer,notes}=fixture(),before=JSON.stringify(notes);h.review.setSession(buffer,notes);h.flush();
 assert.equal(+h.svg.getAttribute('width'),24000);assert.equal(+h.svg.getAttribute('height'),2816);assert.equal(h.get('notePicker').children.length,notes.length);
 assert.ok(h.svg.querySelectorAll('[data-note-id]').length<300);assert.ok(h.get('pitchLabels').children.length<20);
 assert.ok((h.waveform.querySelector('path').getAttribute('d').match(/M/g)||[]).length<80);
 const redraws=h.svg.replacements;h.piano.scrollLeft=150*80;h.piano.scrollTop=(127-60)*22-100;for(let i=0;i<20;i++)h.piano.fire('scroll');
 assert.equal(h.frames.size,1);assert.equal(h.svg.replacements,redraws);h.flush();assert.equal(h.svg.replacements,redraws+1);assert.equal(h.wave.scrollLeft,h.piano.scrollLeft);
 assert.ok(h.svg.querySelectorAll('[data-note-id]').some(n=>n.dataset.noteId==='sustain'));
 assert.ok(!h.svg.querySelectorAll('[data-note-id]').some(n=>n.dataset.noteId==='last'));
 h.get('notePicker').value='last';h.get('notePicker').fire('change');
 let selected=h.svg.querySelectorAll('[data-note-id]').find(n=>n.dataset.noteId==='last');assert.ok(selected);assert.match(selected.getAttribute('class'),/selected/);assert.equal(+selected.getAttribute('x'),299.8*80);assert.equal(h.piano.scrollTop,0);assert.ok(h.piano.scrollLeft>23000);
 const center=(h.piano.scrollLeft+h.piano.clientWidth/2)/80;h.get('zoomIn').fire('click');assert.equal((h.piano.scrollLeft+h.piano.clientWidth/2)/160,center);h.review.select('last');selected=h.svg.querySelectorAll('[data-note-id]').find(n=>n.dataset.noteId==='last');assert.ok(selected);assert.equal(+h.svg.getAttribute('width'),48000);assert.equal(+selected.getAttribute('x'),299.8*160);assert.equal(h.wave.scrollLeft,h.piano.scrollLeft);
 assert.equal(JSON.stringify(notes),before);
});

test('ordinary progress renders preserve editor drafts and exact model; playback scroll updates synchronized playheads',()=>{
 const h=harness(),{buffer,notes}=fixture();h.review.setSession(buffer,notes);h.review.setEditing({enabled:true});h.flush();
 const redraws=h.svg.replacements;h.get('editStart').value='0.0123456789';h.get('splitSeconds').value='0.02';
 for(let i=0;i<20;i++){h.review.setSession(buffer,notes);h.review.setEditing({enabled:true});h.review.render();}
 assert.equal(h.svg.replacements,redraws);assert.equal(h.get('editStart').value,'0.0123456789');assert.equal(h.get('splitSeconds').value,'0.02');
 h.get('applyNoteButton').fire('click');assert.equal(h.edits[0].patch.startSeconds,.0123456789);assert.equal(notes[0].startSeconds,0);
 h.player().seek(200);h.player().play();assert.ok(h.piano.scrollLeft>=15900);h.flush();assert.equal(h.wave.scrollLeft,h.piano.scrollLeft);
 const heads=h.get('reviewCard').querySelectorAll('.playhead');assert.equal(heads.length,2);for(const head of heads)assert.equal(+head.getAttribute('x1'),16000);
});

test('hidden/mobile resize, note replacement, reset and dispose reject stale visible content',()=>{
 const h=harness(),{buffer,notes}=fixture();h.piano.clientWidth=0;h.piano.clientHeight=0;h.review.setSession(buffer,notes);assert.equal(h.svg.children.length,0);
 h.piano.clientWidth=260;h.piano.clientHeight=264;h.review.reveal();h.flush();assert.ok(h.svg.children.length>0);assert.ok(h.piano.scrollTop>0);
 h.review.select('last');const changed=notes.map(n=>n.id==='last'?Object.freeze({...n,pitchMidi:0,startSeconds:40,endSeconds:41}):n);h.review.setSession(buffer,changed);h.flush();
 const selected=h.svg.querySelectorAll('[data-note-id]').find(n=>n.dataset.noteId==='last');assert.ok(selected);assert.equal(selected.dataset.pitch,'0');assert.equal(h.get('editStart').value,'40');assert.ok(h.piano.scrollTop>2500);
 h.piano.fire('scroll');assert.equal(h.frames.size,1);h.review.setSession(null,[]);assert.equal(h.frames.size,0);h.flush();assert.equal(h.svg.children.length,0);assert.equal(h.waveform.children.length,0);
 h.review.setSession(buffer,notes);h.piano.fire('scroll');h.review.dispose();assert.equal(h.frames.size,0);assert.equal(h.disconnected(),true);
});
