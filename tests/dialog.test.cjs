const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function harness(){
 const source=fs.readFileSync(require('node:path').join(__dirname,'../src/ui-components.js'),'utf8').split('// Reusable Promise-based confirmation API.')[0];
 function style(initial={}){const values=new Map(Object.entries(initial).map(([k,v])=>[k,[v,'']]));return {getPropertyValue:k=>values.get(k)?.[0]||'',getPropertyPriority:k=>values.get(k)?.[1]||'',setProperty:(k,v,p='')=>values.set(k,[v,p]),removeProperty:k=>values.delete(k)};}
 const body={style:style({'padding-right':'7px',color:'red'})},root={style:style({'scroll-behavior':'smooth'}),clientWidth:980};body.style.setProperty('overflow','clip','important');
 const calls=[],window={scrollX:4,scrollY:320,innerWidth:1000,scrollTo:value=>calls.push(value)};
 const document={body,documentElement:root};const api=vm.runInNewContext(source+';typeof AppDialog === "undefined" ? null : AppDialog',{document,window,getComputedStyle:()=>({paddingRight:'7px'})});
 function dialog(fails=false){const listeners={};return {open:false,showModal(){if(fails)throw Error('cannot open');this.open=true;},close(){this.open=false;},addEventListener:(type,fn)=>listeners[type]=fn,emit:type=>listeners[type]?.()};}
 return {api,body,root,calls,dialog};
}
test('modal freezes the page and restores prior styles and scroll position',()=>{
 const h=harness();assert.ok(h.api,'dialog scroll-lock API is required');const d=h.dialog();h.api.watch(d);h.api.open(d);
 assert.equal(h.body.style.getPropertyValue('position'),'fixed');assert.equal(h.body.style.getPropertyValue('top'),'-320px');assert.equal(h.body.style.getPropertyValue('padding-right'),'27px');
 h.api.close(d);assert.equal(h.body.style.getPropertyValue('position'),'');assert.equal(h.body.style.getPropertyValue('overflow'),'clip');assert.equal(h.body.style.getPropertyPriority('overflow'),'important');assert.equal(h.body.style.getPropertyValue('color'),'red');
 assert.equal(h.root.style.getPropertyValue('scroll-behavior'),'smooth');assert.deepEqual(JSON.parse(JSON.stringify(h.calls)),[{left:4,top:320,behavior:'instant'}]);
});
test('native close, repeated open and nested confirmation release only the last lock',()=>{
 const h=harness();assert.ok(h.api);const a=h.dialog(),b=h.dialog();h.api.watch(a);h.api.watch(b);h.api.open(a);h.api.open(a);h.api.open(b);h.api.close(a);a.emit('close');assert.equal(h.body.style.getPropertyValue('position'),'fixed');
 b.close();b.emit('close');assert.equal(h.body.style.getPropertyValue('position'),'');assert.equal(h.calls.length,1);
 h.api.open(a);h.api.close(a);h.api.open(a);a.emit('close');assert.equal(h.body.style.getPropertyValue('position'),'fixed');h.api.close(a);
});
test('showModal failure never leaves page locked, including with another modal open',()=>{
 const h=harness();assert.ok(h.api);const bad=h.dialog(true);assert.throws(()=>h.api.open(bad),/cannot open/);assert.equal(h.body.style.getPropertyValue('position'),'');
 const good=h.dialog();h.api.open(good);assert.throws(()=>h.api.open(bad),/cannot open/);assert.equal(h.body.style.getPropertyValue('position'),'fixed');h.api.close(good);assert.equal(h.body.style.getPropertyValue('position'),'');
});
