const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const sandbox={module:{exports:{}},Float32Array};const file=path.join(__dirname,'../src/inference-worker.js');
if(fs.existsSync(file))vm.runInNewContext(fs.readFileSync(file,'utf8'),sandbox);
test('worker exposes disposable official-compatible inference',()=>assert.equal(typeof sandbox.module.exports.runBasicPitch,'function'));
test('worker constants agree with official Basic Pitch 1.0.1 contract',()=>{
 assert.deepEqual(JSON.parse(JSON.stringify(sandbox.module.exports.constants||{})),{sampleRate:22050,window:43844,hop:36164,pad:3840,trim:15,fps:86});
});
