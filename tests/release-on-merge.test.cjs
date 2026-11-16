'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const readJson=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const flow=fs.readFileSync(path.join(root,'.github/workflows/release-on-merge.yml'),'utf8');

test('patch release version is consistent in app and npm manifests',()=>{
 const app=readJson('app.config.json'),pkg=readJson('package.json'),lock=readJson('package-lock.json');
 assert.equal(pkg.version,app.version);
 assert.equal(lock.version,app.version);
 assert.equal(lock.packages[''].version,app.version);
 assert.match(app.version,/^\d+\.\d+\.\d+$/);
});

test('only a merged PR on main may create the tag and GitHub release',()=>{
 assert.match(flow,/push:\s*\n\s*branches: \[main\]/);
 assert.doesNotMatch(flow,/pull_request_target/);
 assert.match(flow,/\/commits\/\$env:MERGED_SHA\/pulls/);
 assert.match(flow,/\$_.merged_at -and \$_.base.ref -eq 'main' -and \$_.merge_commit_sha -eq \$env:MERGED_SHA/);
 assert.match(flow,/persist-credentials: false/);
 assert.match(flow,/pull-requests: read/);
 assert.match(flow,/contents: write/);
 assert.match(flow,/ref: \$\{\{ github.sha \}\}/);
 assert.match(flow,/--target \$env:MERGED_SHA/);
 assert.match(flow,/gh release create/);
 assert.match(flow,/releases\/tags\/\$tag/);
 assert.match(flow,/publish=false/);
 assert.match(flow,/Version mismatch between app\.config\.json, package\.json and package-lock\.json/);
 assert.match(flow,/package-lock\.json \| ConvertFrom-Json -AsHashtable/);
 assert.match(flow,/\$lock\['packages'\]\[''\]/);
});

test('tag and release are gated by fresh build, contract, model and browser tests',()=>{
 for(const command of ['./scripts/check-repository.ps1','npm ci --ignore-scripts --no-audit --no-fund','npm test','npm run test:model','npx playwright install chromium','npm run test:browser'])assert.ok(flow.includes(command),command);
 for(const asset of ['dist/index.html','dist/index.self-extract.html','audio-to-midi.html','dist/dependency-manifest.json','dist/self-extract-manifest.json'])assert.ok(flow.includes("'"+asset+"'"),asset);
 assert.match(flow,/--generate-notes/);
 assert.match(flow,/if: steps\.version\.outputs\.publish == 'true'/);
});
