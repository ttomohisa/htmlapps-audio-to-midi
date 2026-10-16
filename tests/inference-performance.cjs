// Reproducible actual-model performance / stability gate. No browser or network.
// Run: node tests/inference-performance.cjs
// Reads only the same version-pinned assets extracted by the standard build.
// Reports TF.js tracked tensor bytes separately from process RSS/heap samples;
// none of these are a physical browser/device memory measurement.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const os = require('node:os');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const root = path.join(__dirname, '..');
const cache = path.join(root, '.cache');
const tf = require(path.join(cache, '-tensorflow-tfjs-3.21.0/extracted/package/dist/tf.min.js'));
const Midi = require(path.join(cache, '-tonejs-midi-2.0.28/extracted/package/build/Midi.js'));
const post = {exports: {}};
vm.runInNewContext(fs.readFileSync(path.join(cache, '-spotify-basic-pitch-1.0.1/extracted/package/cjs/toMidi.js'), 'utf8'), {
  exports: post.exports, require(id) { assert.equal(id, '@tonejs/midi'); return Midi; }, Buffer,
});
const {runBasicPitch, constants} = require('../src/inference-worker.js');
const {runEagerReference} = require('./fixtures/inference-reference.cjs');
const directory = path.join(root, 'test-results');
const reportFile = path.join(directory, 'inference-performance.json');
const progressFile = path.join(directory, 'inference-performance-progress.jsonl');
const plain = value => JSON.parse(JSON.stringify(value));
function samplesFor(duration) {
  const samples = new Float32Array(Math.round(constants.sampleRate * duration));
  const pitches = [60, 64, 67, 62, 69];
  for (let index = 0; index < samples.length; index++) {
    const time = index / constants.sampleRate;
    const segment = Math.floor(time / 2.3);
    const start = segment * 2.3 + .08;
    const end = Math.min(duration - .06, (segment + 1) * 2.3 - .08);
    if (time >= start && time < end) {
      const attackRelease = Math.min(1, (time - start) / .015, (end - time) / .015);
      samples[index] = .6 * Math.sin(2 * Math.PI * 440 * Math.pow(2, (pitches[segment % pitches.length] - 69) / 12) * time) * attackRelease;
    }
  }
  return samples;
}
function hashRows(frames, onsets) {
  const hash = crypto.createHash('sha256');
  for (const values of [frames, onsets]) for (const row of values) {
    const floats = Float32Array.from(row);
    hash.update(Buffer.from(floats.buffer));
  }
  return hash.digest('hex');
}
function checkpoint(value) {
  const item = {at: new Date().toISOString(), ...value};
  fs.appendFileSync(progressFile, JSON.stringify(item) + '\n');
  console.log(JSON.stringify(item));
}
function snapshot() {
  const memory = tf.memory(), processMemory = process.memoryUsage();
  return {tensors: memory.numTensors, dataBuffers: memory.numDataBuffers, tensorBytes: memory.numBytes,
    tfMemoryUnreliable: memory.unreliable, tfMemoryReasons: memory.reasons,
    rssBytes: processMemory.rss, heapUsedBytes: processMemory.heapUsed, arrayBufferBytes: processMemory.arrayBuffers};
}
async function benchmark(label, runner, model, samples) {
  const before = snapshot();
  const started = performance.now();
  let frameHash = '', outputFrames = 0, windows = 0, maximumBoundaryRssBytes = before.rssBytes;
  const observer = {...post.exports, outputToNotesPoly(frames, onsets, ...options) {
    outputFrames = frames.length;
    frameHash = hashRows(frames, onsets);
    return post.exports.outputToNotesPoly(frames, onsets, ...options);
  }};
  const profile = await tf.profile(() => runner(tf, observer, model, samples, value => {
    if (value.phase === 'analyzing') windows++;
    maximumBoundaryRssBytes = Math.max(maximumBoundaryRssBytes, process.memoryUsage().rss);
  }));
  const elapsedMs = performance.now() - started;
  const after = snapshot();
  assert.equal(after.tensors, before.tensors, `${label} tensor count`);
  assert.equal(after.tensorBytes, before.tensorBytes, `${label} tracked tensor bytes`);
  const result = {implementation: label, seconds: samples.length / constants.sampleRate, elapsedMs,
    windows, outputFrames, noteCount: profile.result.length, frameOnsetSha256: frameHash,
    noteSha256: crypto.createHash('sha256').update(JSON.stringify(profile.result)).digest('hex'),
    tfProfilePeakBytes: profile.peakBytes, tfProfileNewBytes: profile.newBytes,
    tfProfileNewTensors: profile.newTensors, maximumBoundaryRssBytes, before, after};
  checkpoint({type: 'benchmark', ...result});
  return {summary: result, notes: plain(profile.result)};
}
(async () => {
  fs.mkdirSync(directory, {recursive: true});
  fs.writeFileSync(progressFile, '');
  const report = {date: new Date().toISOString(), node: process.version, browser: null,
    platform: process.platform, arch: process.arch, os: os.release(), cpu: os.cpus()[0]?.model,
    model: '@spotify/basic-pitch 1.0.1', tfjs: tf.version.tfjs, backend: 'cpu',
    sourceSha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'src/inference-worker.js'))).digest('hex'),
    measurementNotes: [
      'Synthetic deterministic mono PCM; same model/settings/input for reference and bounded runs.',
      'Warmup is the first model inference; all duration pairs run eager first, bounded second on the reused model.',
      'TF.js profile peak is tracked tensor memory, not process, browser, GPU, or physical-device peak memory.',
      'RSS values are samples at window boundaries and can miss transient allocations; TF.js profiling also allocates diagnostic kernel records.',
      'Stress uses 100 actual model invocations: 50 completed 0.5-second jobs and 50 2.5-second jobs cancelled after their first window.',
      'The cancellation callback is a runtime test seam; the browser UI cancels by terminating the worker.',
      'No physical low-memory/mobile browser or audible quality claim is made.',
    ], benchmarks: [], stress: {requestedJobs: 100, complete: 0, cancelled: 0, observations: []}};
  try { report.commit = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim(); } catch { report.commit = null; }
  await tf.setBackend('cpu'); await tf.ready();
  const modelRoot = path.join(cache, '-spotify-basic-pitch-1.0.1/extracted/package/model');
  const json = JSON.parse(fs.readFileSync(path.join(modelRoot, 'model.json'), 'utf8'));
  const weights = fs.readFileSync(path.join(modelRoot, 'group1-shard1of1.bin'));
  const loadStarted = performance.now();
  const model = await tf.loadGraphModel({load: async () => ({modelTopology: json.modelTopology,
    format: json.format, generatedBy: json.generatedBy, convertedBy: json.convertedBy,
    weightSpecs: json.weightsManifest.flatMap(manifest => manifest.weights),
    weightData: weights.buffer.slice(weights.byteOffset, weights.byteOffset + weights.byteLength)})});
  report.modelLoadMs = performance.now() - loadStarted;
  report.modelBaseline = snapshot();
  checkpoint({type: 'model-ready', modelLoadMs: report.modelLoadMs, baseline: report.modelBaseline});
  try {
    report.firstInference = (await benchmark('bounded-first-inference', runBasicPitch, model, samplesFor(.5))).summary;
    for (const duration of [10, 30, 60]) {
      const samples = samplesFor(duration);
      const reference = await benchmark('eager-v0.6', runEagerReference, model, samples);
      const bounded = await benchmark('bounded-v0.7', runBasicPitch, model, samples);
      assert.equal(bounded.summary.frameOnsetSha256, reference.summary.frameOnsetSha256, `${duration}s exact frame/onset equality`);
      assert.deepEqual(bounded.notes, reference.notes, `${duration}s exact final-note equality`);
      report.benchmarks.push({seconds: duration, exactFrameOnsetMatch: true, exactNoteMatch: true,
        reference: reference.summary, bounded: bounded.summary});
      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    }
    const stressStarted = performance.now();
    const baseline = snapshot();
    const shortSamples = samplesFor(.5), cancelSamples = samplesFor(2.5);
    for (let index = 0; index < 100; index++) {
      const cancelJob = index % 2 === 1;
      let cancelled = false, analyzedWindows = 0, postprocessed = false;
      const jobStarted = performance.now();
      const job = runBasicPitch(tf, post.exports, model, cancelJob ? cancelSamples : shortSamples, phase => {
        if (phase.phase === 'analyzing') { analyzedWindows++; if (cancelJob) cancelled = true; }
        if (phase.phase === 'postprocessing') postprocessed = true;
      }, undefined, () => cancelled);
      if (cancelJob) {
        await assert.rejects(job, {name: 'AbortError'});
        assert.equal(postprocessed, false);
        report.stress.cancelled++;
      } else {
        const notes = await job;
        assert.ok(notes.some(note => note.pitchMidi === 60), 'short actual model run detects C4');
        assert.equal(postprocessed, true);
        report.stress.complete++;
      }
      assert.equal(analyzedWindows, 1);
      const after = snapshot();
      assert.equal(after.tensors, baseline.tensors, `stress job ${index + 1} tensor count`);
      assert.equal(after.tensorBytes, baseline.tensorBytes, `stress job ${index + 1} tracked tensor bytes`);
      report.stress.observations.push({job: index + 1, outcome: cancelJob ? 'cancelled' : 'complete',
        elapsedMs: performance.now() - jobStarted, ...after});
      if ((index + 1) % 10 === 0) {
        checkpoint({type: 'stress-progress', jobs: index + 1, complete: report.stress.complete,
          cancelled: report.stress.cancelled, elapsedMs: performance.now() - stressStarted, memory: after});
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
      }
    }
    report.stress.elapsedMs = performance.now() - stressStarted;
    // Throw after the real model has allocated outputs, inside the production
    // tidy scope; the same loaded model must remain usable afterward.
    await assert.rejects(runBasicPitch(tf, post.exports, {execute(...arguments_) {
      model.execute(...arguments_); throw new Error('injected failure after actual inference');
    }}, shortSamples), /injected failure after actual inference/);
    assert.equal(tf.memory().numTensors, baseline.tensors);
    assert.equal(tf.memory().numBytes, baseline.tensorBytes);
    const retry = await runBasicPitch(tf, post.exports, model, shortSamples);
    assert.ok(retry.some(note => note.pitchMidi === 60));
    assert.equal(tf.memory().numTensors, baseline.tensors);
    assert.equal(tf.memory().numBytes, baseline.tensorBytes);
    report.errorRecovery = {actualModelFailureThenSuccessfulRetry: true, after: snapshot()};
    report.status = 'PASS';
  } finally {
    model.dispose();
    report.afterModelDispose = snapshot();
    assert.equal(report.afterModelDispose.tensors, 0);
    assert.equal(report.afterModelDispose.tensorBytes, 0);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  }
  checkpoint({type: 'complete', status: report.status, report: path.relative(root, reportFile),
    completedStressJobs: report.stress.complete, cancelledStressJobs: report.stress.cancelled,
    afterModelDispose: report.afterModelDispose});
})().catch(error => {
  checkpoint({type: 'failed', message: error.message, stack: error.stack});
  process.exitCode = 1;
});
