'use strict';
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
// The isolated public verifier checks out the tracked official root artifact,
// not dist/. Separate official builds differ only in this one timestamp value.
function buildArtifactDigest(bytes) {
  assert.ok(Buffer.isBuffer(bytes), 'Artifact must be exact bytes.');
  const html = bytes.toString('utf8');
  assert.ok(Buffer.from(html, 'utf8').equals(bytes), 'Artifact must be valid UTF-8.');
  const matches = [...html.matchAll(/("generatedAtUtc"\s*:\s*")([^"\r\n]*)(")/g)];
  assert.equal(matches.length, 1, 'Expected exactly one build timestamp.');
  const match = matches[0];
  assert.match(match[2], /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?Z$/, 'Expected the official UTC build timestamp.');
  const start = match.index + match[1].length;
  const normalized = html.slice(0, start) + '<official-build-timestamp>' + html.slice(start + match[2].length);
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}
module.exports = {buildArtifactDigest};
