const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
test('characterization setup failure invalidates an earlier completed report',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'audio-midi-noise-report-'));
 try{
  fs.mkdirSync(path.join(root,'tests'));fs.mkdirSync(path.join(root,'test-results'));
  fs.copyFileSync(path.join(__dirname,'noise-characterization.cjs'),path.join(root,'tests/noise-characterization.cjs'));
  const output=path.join(root,'test-results/noise-characterization.json');
  fs.writeFileSync(output,JSON.stringify({completed:true,cases:[{stale:true}]}));
  // No pinned build cache exists here. This must fail before inference, without
  // permitting the previous report to masquerade as a successful current run.
  const run=spawnSync(process.execPath,[path.join(root,'tests/noise-characterization.cjs')],{encoding:'utf8'});
  assert.equal(run.status,1);
  const report=JSON.parse(fs.readFileSync(output,'utf8'));
  assert.equal(report.completed,false);assert.deepEqual(report.cases,[]);
  assert.match(report.error,/Cannot find module/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
