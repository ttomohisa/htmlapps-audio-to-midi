const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const runtime = require('../src/inference-worker.js');
const {constants, runEagerReference} = require('./fixtures/inference-reference.cjs');
const cache = path.join(__dirname, '../.cache');
const tf = require(path.join(cache, '-tensorflow-tfjs-3.21.0/extracted/package/dist/tf.min.js'));
const Midi = require(path.join(cache, '-tonejs-midi-2.0.28/extracted/package/build/Midi.js'));
const post = {exports: {}};
vm.runInNewContext(fs.readFileSync(path.join(cache, '-spotify-basic-pitch-1.0.1/extracted/package/cjs/toMidi.js'), 'utf8'), {
  exports: post.exports, require(id) { assert.equal(id, '@tonejs/midi'); return Midi; }, Buffer,
});
const plain = value => JSON.parse(JSON.stringify(value));
const file = path.join(__dirname, '../src/inference-worker.js');

function samplesOfLength(length) {
  // Exactly reproducible Float32 samples, including signed values and edge data.
  return Float32Array.from({length}, (_, index) => ((index * 73 + 19) % 997 - 498) / 512);
}
function emptyPostprocess(observe = () => {}) {
  return {outputToNotesPoly(frames, onsets) { observe(frames, onsets); return []; }, noteFramesToTime: rows => rows};
}
function zeroModel(observe = () => {}) {
  let calls = 0;
  return {execute(input, names) {
    observe(input, calls++);
    assert.deepEqual(Array.from(names), ['Identity_1', 'Identity_2']);
    return [tf.zeros([1, 172, 1]), tf.zeros([1, 172, 1])];
  }};
}
function fixtureModel() {
  let windowIndex = 0;
  // First two notes straddle the 142-frame retained-window boundaries; the
  // third begins exactly there, and the last reaches the final partial window.
  const notes = [
    {pitch: 60, start: 130, end: 164},
    {pitch: 64, start: 270, end: 302},
    {pitch: 67, start: 284, end: 340},
    {pitch: 72, start: 399, end: 430},
  ];
  return {execute(input) {
    const start = windowIndex++ * 142;
    const frames = new Float32Array(172 * 88), onsets = new Float32Array(172 * 88);
    for (let row = 0; row < 172; row++) {
      const globalRow = start + row - constants.trim;
      for (const note of notes) {
        const offset = row * 88 + note.pitch - 21;
        if (globalRow >= note.start && globalRow < note.end) frames[offset] = .8;
        if (globalRow === note.start) onsets[offset] = .9;
      }
    }
    return [tf.tensor3d(frames, [1, 172, 88]), tf.tensor3d(onsets, [1, 172, 88])];
  }};
}

test('worker constants agree with official Basic Pitch 1.0.1 contract', () => {
  assert.equal(typeof runtime.runBasicPitch, 'function');
  assert.deepEqual(runtime.constants, constants);
});

test('bounded input windows match eager TF.js framing at padding, hop, end and 60-second boundaries', async () => {
  const baseline = tf.memory().numTensors;
  const lengths = [1, 256, 257, 11025, constants.hop - constants.pad - 1,
    constants.hop - constants.pad, constants.hop - constants.pad + 1,
    constants.window - constants.pad - 1, constants.window - constants.pad,
    constants.window - constants.pad + 1, 2 * constants.hop - constants.pad - 1,
    2 * constants.hop - constants.pad, 2 * constants.hop - constants.pad + 1,
    22050 * 60 - 1, 22050 * 60];
  for (const length of lengths) {
    const samples = samplesOfLength(length);
    const expected = [];
    let expectedFrames = 0, actualFrames = 0, actualCalls = 0;
    await runEagerReference(tf, emptyPostprocess(frames => { expectedFrames = frames.length; }),
      zeroModel(input => expected.push(new Float32Array(input.dataSync()))), samples);
    const progress = [];
    await runtime.runBasicPitch(tf, emptyPostprocess(frames => { actualFrames = frames.length; }),
      zeroModel((input, index) => {
        assert.deepEqual(input.shape, [1, constants.window, 1]);
        assert.deepEqual(input.dataSync(), expected[index], `input length ${length}, window ${index}`);
        actualCalls++;
      }), samples, value => progress.push(value));
    assert.equal(actualCalls, expected.length, `window count for ${length} samples`);
    assert.equal(actualFrames, expectedFrames);
    assert.equal(actualFrames, Math.floor(length * constants.fps / constants.sampleRate));
    assert.equal(progress.at(-1).phase, 'postprocessing');
    assert.equal(tf.memory().numTensors, baseline, `released tensors for ${length} samples`);
  }
});

test('retained onset/frame rows and final notes remain exact across window joins and the partial tail', async () => {
  const samples = samplesOfLength(22050 * 5);
  const baseline = tf.memory().numTensors;
  const options = {minDurationSeconds: .03};
  const expected = await runEagerReference(tf, post.exports, fixtureModel(), samples, () => {}, options);
  const actual = await runtime.runBasicPitch(tf, post.exports, fixtureModel(), samples, () => {}, options);
  assert.deepEqual(plain(actual), plain(expected));
  assert.deepEqual(plain(actual.map(note => note.pitchMidi).sort((a, b) => a - b)), [60, 64, 67, 72]);
  assert.equal(tf.memory().numTensors, baseline);
});

test('one input tensor stays bounded independent of audio duration and is gone before each yield', async () => {
  const baseline = tf.memory();
  for (const duration of [.5, 10, 30, 60]) {
    let maximumInputBytes = 0;
    await runtime.runBasicPitch(tf, emptyPostprocess(), zeroModel(() => {
      const memory = tf.memory();
      maximumInputBytes = Math.max(maximumInputBytes, memory.numBytes - baseline.numBytes);
      assert.equal(memory.numTensors - baseline.numTensors, 1, 'only current input exists before model execution');
    }), new Float32Array(22050 * duration), () => {
      assert.equal(tf.memory().numTensors, baseline.numTensors, 'no inference tensors escape a window');
    });
    assert.equal(maximumInputBytes, constants.window * Float32Array.BYTES_PER_ELEMENT);
  }
});

test('invalid inputs fail before tensor allocation and the 60-second limit is unchanged', async () => {
  for (const input of [null, [], new Float64Array(5), new Float32Array(0), new Float32Array(22050 * 60 + 1)]) {
    await assert.rejects(runtime.runBasicPitch(null, null, null, input), /Invalid PCM input/);
  }
});

test('model, output conversion, progress and postprocess errors release tensors and allow retry', async () => {
  const baseline = tf.memory().numTensors;
  const samples = new Float32Array(22050);
  const brokenModels = [
    {execute() { tf.zeros([100]); throw new Error('execute failed'); }},
    {execute() { return [tf.zeros([1, 172, 1]), tf.zeros([1, 10, 1])]; }},
  ];
  for (const model of brokenModels) {
    await assert.rejects(runtime.runBasicPitch(tf, emptyPostprocess(), model, samples));
    assert.equal(tf.memory().numTensors, baseline);
  }
  await assert.rejects(runtime.runBasicPitch(tf, emptyPostprocess(), zeroModel(), samples,
    () => { throw new Error('progress failed'); }), /progress failed/);
  assert.equal(tf.memory().numTensors, baseline);
  await assert.rejects(runtime.runBasicPitch(tf, emptyPostprocess(() => { throw new Error('postprocess failed'); }), zeroModel(), samples), /postprocess failed/);
  assert.equal(tf.memory().numTensors, baseline);
  assert.deepEqual(await runtime.runBasicPitch(tf, emptyPostprocess(), zeroModel(), samples), []);
  assert.equal(tf.memory().numTensors, baseline);
});

test('cancellation before execution, between windows and before postprocessing releases all tensors', async () => {
  const baseline = tf.memory().numTensors;
  const samples = new Float32Array(22050 * 5);
  let calls = 0;
  await assert.rejects(runtime.runBasicPitch(tf, emptyPostprocess(), zeroModel(() => calls++), samples,
    () => {}, undefined, () => true), {name: 'AbortError'});
  assert.equal(calls, 0);
  assert.equal(tf.memory().numTensors, baseline);
  for (const cancelAfter of [1, 4]) {
    let cancelled = false, windows = 0, postprocessed = false;
    await assert.rejects(runtime.runBasicPitch(tf, emptyPostprocess(() => { postprocessed = true; }),
      zeroModel(() => windows++), samples, phase => {
        assert.equal(tf.memory().numTensors, baseline);
        if (phase.phase === 'analyzing' && windows === cancelAfter) cancelled = true;
      }, undefined, () => cancelled), {name: 'AbortError'});
    assert.equal(windows, cancelAfter);
    assert.equal(postprocessed, false);
    assert.equal(tf.memory().numTensors, baseline);
  }
  let cancelBeforePostprocess = false;
  await assert.rejects(runtime.runBasicPitch(tf, emptyPostprocess(() => {
    assert.fail('cancelled postprocessing must not run');
  }), zeroModel(), new Float32Array(22050), phase => {
    if (phase.phase === 'postprocessing') cancelBeforePostprocess = true;
  }, undefined, () => cancelBeforePostprocess), {name: 'AbortError'});
  assert.equal(tf.memory().numTensors, baseline);
  // A callback exception is also scoped outside tensor ownership.
  await assert.rejects(runtime.runBasicPitch(tf, emptyPostprocess(), zeroModel(), samples,
    () => {}, undefined, () => { throw new Error('cancellation check failed'); }), /cancellation check failed/);
  assert.equal(tf.memory().numTensors, baseline);
  assert.deepEqual(await runtime.runBasicPitch(tf, emptyPostprocess(), zeroModel(), samples), []);
});

test('100 alternating complete/cancelled synthetic jobs retain no tensors and recover on the same model', async () => {
  const baseline = tf.memory().numTensors;
  const model = zeroModel();
  for (let index = 0; index < 100; index++) {
    let cancel = false;
    const job = runtime.runBasicPitch(tf, emptyPostprocess(), model, new Float32Array(22050),
      phase => { if (phase.phase === 'analyzing' && index % 2) cancel = true; }, undefined, () => cancel);
    if (index % 2) await assert.rejects(job, {name: 'AbortError'});
    else assert.deepEqual(await job, []);
    assert.equal(tf.memory().numTensors, baseline, `job ${index + 1}`);
  }
});

test('worker echoes job IDs on progress/completion/errors and reuses its model without tensor leaks', async () => {
  const baseline = tf.memory().numTensors;
  let modelLoads = 0;
  const model = zeroModel();
  const workerTf = Object.create(tf);
  Object.defineProperty(workerTf, 'loadGraphModel', {value: async () => { modelLoads++; return model; }});
  const messages = [];
  const context = {tf: workerTf, BasicPitchPostprocess: emptyPostprocess(), Float32Array, setTimeout, performance, console: {error() {}}};
  context.self = {postMessage(message) { messages.push(message); }};
  vm.createContext(context, {codeGeneration: {strings: false, wasm: false}});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/detection-settings.js'), 'utf8') + '\n' + fs.readFileSync(file, 'utf8'), context);
  for (const jobId of [7, 9]) {
    const start = messages.length;
    await context.self.onmessage({data: {jobId, samples: new Float32Array(22050)}});
    assert.equal(messages.at(-1).phase, 'complete');
    assert.ok(messages.slice(start).every(message => message.jobId === jobId));
    assert.equal(messages.at(-1).tensors, baseline);
  }
  await context.self.onmessage({data: {jobId: 10, samples: new Float32Array(0)}});
  assert.equal(messages.at(-1).phase, 'error');
  assert.equal(messages.at(-1).jobId, 10);
  assert.equal(modelLoads, 1);
  assert.equal(tf.memory().numTensors, baseline);
});
