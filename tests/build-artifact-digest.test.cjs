'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const {gzipSync} = require('node:zlib');
const {buildArtifactDigest} = require('./browser/build-artifact-digest.cjs');

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function makeHtml({raw,level=6,time='2026-11-13T16:41:40.1234567Z',body='unchanged',hash=sha256(raw)}) {
  const stored=gzipSync(raw,{level});
  const manifest={
    schemaVersion:2,generatedAtUtc:time,dependencies:[{
      id:'fixture',package:'fixture-package',version:'1.0.0',assets:[{
        key:'model',mime:'application/octet-stream',compression:'gzip',
        bytes:raw.length,storedBytes:stored.length,sha256:hash
      }]
    }]
  };
  const bundle={
    schemaVersion:2,dependencies:{fixture:{package:'fixture-package',version:'1.0.0',
      assets:{model:{mime:'application/octet-stream',compression:'gzip',
        originalBytes:raw.length,storedBytes:stored.length,base64:stored.toString('base64')}}}}
  };
  return Buffer.from(`<!doctype html>\n<script>\nconst BUILD_MANIFEST = ${JSON.stringify(manifest)};\nconst assetBundle = ${JSON.stringify(bundle)};\nconst message = "${body}";\n</script>\n`);
}

test('identical uncompressed assets and application code match across gzip levels and timestamps',()=>{
  const raw=Buffer.from('piano-notes,'.repeat(4096));
  const a=makeHtml({raw,level:1,time:'2026-11-13T16:41:40.1234567Z'});
  const b=makeHtml({raw,level:9,time:'2026-11-14T01:23:45.1000000Z'});
  assert.notDeepEqual(a,b);
  assert.equal(buildArtifactDigest(a),buildArtifactDigest(b));
});

test('changing application code changes the canonical digest',()=>{
  const raw=Buffer.from('audio-model-weights');
  assert.notEqual(buildArtifactDigest(makeHtml({raw})),
    buildArtifactDigest(makeHtml({raw,body:'modified'})));
});

test('uncompressed asset mismatch is rejected even when metadata claims the original SHA',()=>{
  const raw=Buffer.from('original model asset');
  const modified=Buffer.from('different model asset');
  assert.throws(()=>buildArtifactDigest(makeHtml({raw:modified,hash:sha256(raw)})),
    /Corrupt bundled asset/);
});

test('missing or malformed UTC build timestamp is rejected',()=>{
  const raw=Buffer.from('payload');
  assert.throws(()=>buildArtifactDigest(makeHtml({raw,time:'yesterday'})),
    /Expected the official UTC build timestamp/);
});
