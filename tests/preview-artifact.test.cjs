const test = require('node:test'), assert = require('node:assert/strict');
const {buildArtifactDigest} = require('./browser/build-artifact-digest.cjs');
const fixture = '{"version":"1.0.0","generatedAtUtc":"2026-10-23T12:00:00.1234567Z","dependencies":[{"sha256":"fixed-runtime-pin"}]}<script>unchanged source</script>';
test('preview identity permits only the official build timestamp to differ', () => {
  assert.equal(buildArtifactDigest(Buffer.from(fixture)), buildArtifactDigest(Buffer.from(fixture.replace('12:00:00.1234567Z','13:00:01.2345678Z'))));
});
test('all remaining artifact bytes retain strict identity', () => {
  for (const changed of [fixture.replace('1.0.0','1.0.1'), fixture.replace('fixed-runtime-pin','other-runtime-pin'), fixture.replace('unchanged source','changed source'), fixture+' ', fixture.replace(':"1.0.0"', ': "1.0.0"')]) {
    assert.notEqual(buildArtifactDigest(Buffer.from(changed)), buildArtifactDigest(Buffer.from(fixture)));
  }
});
test('missing, duplicated or malformed timestamp cannot be normalized', () => {
  for (const changed of [fixture.replace('generatedAtUtc','other'), fixture+fixture, fixture.replace('2026-10-23T12:00:00.1234567Z','invalid')]) assert.throws(()=>buildArtifactDigest(Buffer.from(changed)));
});
test('invalid UTF-8 cannot silently change bytes during normalization', () => {
  assert.throws(()=>buildArtifactDigest(Buffer.concat([Buffer.from(fixture),Buffer.from([0xff])])));
});
