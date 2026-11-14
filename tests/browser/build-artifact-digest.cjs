'use strict';
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const {gunzipSync} = require('node:zlib');

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function readLiteral(html, name) {
  const prefix = `const ${name} = `;
  const marker = html.indexOf(prefix);
  assert.ok(marker >= 0, `Missing ${name}`);
  assert.equal(html.indexOf(prefix, marker + prefix.length), -1, `Duplicate ${name}`);
  const start = marker + prefix.length;
  const end = html.indexOf('\n', start);
  assert.ok(end > start, `Missing end of ${name}`);
  const line = html.slice(start, end).trim();
  assert.ok(line.startsWith('{') && line.endsWith('};'), `Unexpected ${name} literal`);
  return {value: JSON.parse(line.slice(0, -1)), start, end};
}

// A root HTML committed on one machine and the preview built on another may
// have identical decoded assets but different .NET gzip byte streams.
// Normalize ONLY the validated build timestamp and compressed asset storage;
// keep all application code, dependency versions, and decoded asset hashes.
function buildArtifactDigest(bytes) {
  assert.ok(Buffer.isBuffer(bytes), 'Artifact must be exact bytes.');
  const html = bytes.toString('utf8');
  assert.ok(Buffer.from(html, 'utf8').equals(bytes), 'Artifact must be valid UTF-8.');

  const manifestLiteral = readLiteral(html, 'BUILD_MANIFEST');
  const bundleLiteral = readLiteral(html, 'assetBundle');
  const manifest = manifestLiteral.value;
  const bundle = bundleLiteral.value;

  assert.equal(manifest.schemaVersion, 2);
  assert.equal(bundle.schemaVersion, 2);
  assert.match(manifest.generatedAtUtc,
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?Z$/,
    'Expected the official UTC build timestamp.');
  manifest.generatedAtUtc = '<official-build-timestamp>';

  assert.equal(Object.keys(bundle.dependencies).length, manifest.dependencies.length);
  for (const dependency of manifest.dependencies) {
    const bundled = bundle.dependencies[dependency.id];
    assert.ok(bundled, `Missing bundled dependency ${dependency.id}`);
    assert.equal(bundled.package, dependency.package);
    assert.equal(bundled.version, dependency.version);
    assert.equal(Object.keys(bundled.assets).length, dependency.assets.length);

    for (const meta of dependency.assets) {
      const asset = bundled.assets[meta.key];
      assert.ok(asset, `Missing bundled asset ${dependency.id}/${meta.key}`);
      assert.equal(asset.mime, meta.mime);
      assert.equal(asset.compression, meta.compression);
      const stored = Buffer.from(asset.base64, 'base64');
      assert.equal(stored.length, asset.storedBytes);
      const original = asset.compression === 'gzip' ? gunzipSync(stored) : stored;
      assert.ok(asset.compression === 'gzip' || asset.compression === 'none',
        'Unrecognized asset compression');
      assert.equal(original.length, asset.originalBytes);
      assert.equal(original.length, meta.bytes);
      const originalSha = sha256(original);
      assert.equal(originalSha, meta.sha256, `Corrupt bundled asset ${dependency.id}/${meta.key}`);
      // Storage encoding and compressed size are machine-dependent.
      asset.base64 = `sha256:${originalSha}`;
      asset.storedBytes = 0;
      meta.storedBytes = 0;
    }
  }

  // Rewrite only the two known JSON literals, leaving every other byte intact.
  const changes = [
    {literal: manifestLiteral, json: JSON.stringify(manifest)},
    {literal: bundleLiteral, json: JSON.stringify(bundle)}
  ].sort((a,b) => b.literal.start - a.literal.start);
  let normalized = html;
  for (const change of changes) {
    normalized = normalized.slice(0, change.literal.start) +
      change.json + ';' + normalized.slice(change.literal.end);
  }
  return sha256(Buffer.from(normalized, 'utf8'));
}

module.exports = {buildArtifactDigest};
