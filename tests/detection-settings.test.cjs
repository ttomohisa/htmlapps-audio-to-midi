const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const settingsFile = path.join(__dirname, '../src/detection-settings.js');
const settings = fs.existsSync(settingsFile) ? require(settingsFile) : {};
const runtime = require('../src/inference-worker.js');
const cache = path.join(__dirname, '../.cache');
const Midi = require(path.join(cache, '-tonejs-midi-2.0.28/extracted/package/build/Midi.js'));
const post = {exports: {}};
vm.runInNewContext(fs.readFileSync(path.join(cache, '-spotify-basic-pitch-1.0.1/extracted/package/cjs/toMidi.js'), 'utf8'), {
  exports: post.exports,
  require(id) { assert.equal(id, '@tonejs/midi'); return Midi; },
  Buffer,
});
const plain = value => JSON.parse(JSON.stringify(value));
function fixture(length = 100, notes = [
  {pitch: 60, start: 10, end: 45, frame: .8, onset: .9},
  {pitch: 64, start: 10, end: 45, frame: .4, onset: .6},
  {pitch: 67, start: 10, end: 45, frame: .2, onset: .4},
]) {
  const frames = Array.from({length}, () => Array(88).fill(0));
  const onsets = Array.from({length}, () => Array(88).fill(0));
  for (const note of notes) {
    for (let index = note.start; index < note.end; index++) frames[index][note.pitch - 21] = note.frame;
    onsets[note.start][note.pitch - 21] = note.onset;
  }
  return {frames, onsets};
}
function processFixture(data, options) {
  return runtime.postprocessNotes(post.exports, data.frames, data.onsets, options);
}

test('presets freeze the documented thresholds, seconds and inclusive model pitch range', () => {
  assert.deepEqual(settings.presets, {
    fewer: {onsetThreshold: .7, frameThreshold: .5, minDurationSeconds: .12, minPitchMidi: 21, maxPitchMidi: 108},
    standard: {onsetThreshold: .5, frameThreshold: .3, minDurationSeconds: .059, minPitchMidi: 21, maxPitchMidi: 108},
    more: {onsetThreshold: .3, frameThreshold: .15, minDurationSeconds: .03, minPitchMidi: 21, maxPitchMidi: 108},
  });
  assert.ok(Object.isFrozen(settings.presets));
  for (const preset of Object.values(settings.presets)) assert.ok(Object.isFrozen(preset));
});

test('validation defaults to standard and returns detached settings for partial overrides', () => {
  assert.deepEqual(settings.validate(), settings.presets.standard);
  assert.notEqual(settings.validate(), settings.presets.standard);
  const input = {onsetThreshold: 0, frameThreshold: 1, minPitchMidi: 0, maxPitchMidi: 127};
  const result = settings.validate(input);
  assert.deepEqual(result, {...settings.presets.standard, ...input});
  input.minPitchMidi = 60;
  assert.equal(result.minPitchMidi, 0);
});

test('threshold validation rejects non-finite, non-numeric and out-of-range values with field names', () => {
  for (const field of ['onsetThreshold', 'frameThreshold']) {
    for (const value of [NaN, Infinity, -Infinity, -.001, 1.001, '', '0.5', null, true, undefined]) {
      assert.throws(() => settings.validate({[field]: value}), error => error instanceof RangeError && error.field === field);
    }
  }
});

test('duration validation accepts 0.01 to 2 seconds and rejects invalid duration without clamping', () => {
  for (const value of [.01, 2]) assert.equal(settings.validate({minDurationSeconds: value}).minDurationSeconds, value);
  for (const value of [0, .009, 2.001, NaN, Infinity, '0.06', null]) {
    assert.throws(() => settings.validate({minDurationSeconds: value}), error => error.field === 'minDurationSeconds');
  }
});

test('pitch validation accepts inclusive MIDI 0 to 127 and rejects fractional or reversed ranges', () => {
  assert.equal(settings.validate({minPitchMidi: 127, maxPitchMidi: 127}).minPitchMidi, 127);
  assert.equal(settings.validate({minPitchMidi: 0, maxPitchMidi: 0}).maxPitchMidi, 0);
  for (const field of ['minPitchMidi', 'maxPitchMidi']) {
    for (const value of [-1, 128, 60.1, NaN, Infinity, '60', null]) {
      assert.throws(() => settings.validate({[field]: value}), error => error.field === field);
    }
  }
  assert.throws(() => settings.validate({minPitchMidi: 72, maxPitchMidi: 60}), error => error.field === 'pitchRange');
});

test('validation rejects non-record settings', () => {
  for (const value of [null, [], 1, 'standard', false]) assert.throws(() => settings.validate(value), error => error.field === 'settings');
});

test('seconds convert to the pinned postprocessor strict frame cutoff while standard remains five frames', () => {
  assert.equal(settings.minNoteLengthFrames(), 5);
  assert.equal(settings.minNoteLengthFrames(settings.presets.fewer), 10);
  assert.equal(settings.minNoteLengthFrames(settings.presets.more), 2);
  assert.equal(settings.minNoteLengthFrames({minDurationSeconds: .01}), 0);
  assert.equal(settings.minNoteLengthFrames({minDurationSeconds: 2}), 172);
});

test('settings expose the same browser and worker global without dynamic code generation', () => {
  assert.ok(fs.existsSync(settingsFile), 'settings source must exist');
  const context = vm.createContext({}, {codeGeneration: {strings: false, wasm: false}});
  vm.runInContext(fs.readFileSync(settingsFile, 'utf8'), context);
  assert.deepEqual(plain(vm.runInContext('AudioMidiSettings.validate()', context)), settings.presets.standard);
});

test('actual pinned postprocessing produces successively more notes for the three fixed presets', () => {
  const data = fixture();
  const before = plain(data);
  const pitches = Object.values(settings.presets).map(preset => processFixture(data, preset).map(note => note.pitchMidi).sort((a, b) => a - b));
  assert.deepEqual(plain(pitches), [[60], [60, 64], [60, 64, 67]]);
  assert.deepEqual(data, before, 'settings application must not mutate the cached inference frames');
});

test('silence remains a valid zero-note result for every preset and zero thresholds', () => {
  const data = fixture(86, []);
  for (const options of [...Object.values(settings.presets), {onsetThreshold: 0, frameThreshold: 0}]) {
    assert.deepEqual(plain(processFixture(data, options)), []);
  }
});

test('omitted settings preserve the old official default parameters and corrected note timings', () => {
  const data = fixture();
  const old = post.exports.noteFramesToTime(post.exports.outputToNotesPoly(data.frames, data.onsets, .5, .3, 5, true, null, null, true, 11)).map(note => ({
    pitchMidi: note.pitchMidi, startSeconds: note.startTimeSeconds,
    endSeconds: note.startTimeSeconds + note.durationSeconds, velocity: 96, origin: 'detected',
  }));
  assert.deepEqual(plain(processFixture(data)), plain(old));
});

test('pitch limits include both endpoints, a single pitch and the model boundary pitches', () => {
  const data = fixture(100, [21, 60, 64, 67, 108].map(pitch => ({pitch, start: 10, end: 45, frame: .8, onset: .9})));
  const pitches = options => plain(processFixture(data, options).map(note => note.pitchMidi).sort((a, b) => a - b));
  assert.deepEqual(pitches({minPitchMidi: 60, maxPitchMidi: 67}), [60, 64, 67]);
  assert.deepEqual(pitches({minPitchMidi: 64, maxPitchMidi: 64}), [64]);
  assert.deepEqual(pitches({minPitchMidi: 0, maxPitchMidi: 127}), [21, 60, 64, 67, 108]);
  assert.deepEqual(pitches({minPitchMidi: 0, maxPitchMidi: 20}), []);
});

test('minimum duration uses seconds and filters short output after official window timing correction', () => {
  const data = fixture(220, [
    {pitch: 60, start: 10, end: 18, frame: .8, onset: .9},
    {pitch: 64, start: 10, end: 40, frame: .8, onset: .9},
    {pitch: 67, start: 167, end: 175, frame: .8, onset: .9},
  ]);
  const options = {minDurationSeconds: .092};
  const result = processFixture(data, options);
  assert.deepEqual(plain(result.map(note => note.pitchMidi).sort((a, b) => a - b)), [60, 64]);
  assert.ok(result.every(note => note.endSeconds - note.startSeconds >= .092));
  assert.deepEqual(plain(processFixture(data, {minDurationSeconds: .2}).map(note => note.pitchMidi)), [64]);
});

test('inference rejects invalid settings before allocating tensors or running the model', async () => {
  await assert.rejects(runtime.runBasicPitch(null, null, null, new Float32Array(22050), () => {}, {frameThreshold: NaN}), error => error.field === 'frameThreshold');
});

test('browser integration can access AudioMidiSettings on window', () => {
  const context = {window: {}};
  vm.runInNewContext(fs.readFileSync(settingsFile, 'utf8'), context);
  assert.equal(typeof context.window.AudioMidiSettings?.validate, 'function');
});

test('standard keeps six-frame notes even when they cross the official timing correction boundary', () => {
  const data = fixture(380, [
    {pitch: 60, start: 10, end: 16, frame: .8, onset: .9},
    {pitch: 64, start: 169, end: 175, frame: .8, onset: .9},
    {pitch: 67, start: 341, end: 347, frame: .8, onset: .9},
  ]);
  const old = post.exports.noteFramesToTime(post.exports.outputToNotesPoly(data.frames, data.onsets, .5, .3, 5, true, null, null, true, 11));
  const result = processFixture(data, settings.presets.standard);
  assert.equal(old.length, 3);
  assert.deepEqual(plain(result.map(note => [note.pitchMidi, note.startSeconds, note.endSeconds])),
    plain(old.map(note => [note.pitchMidi, note.startTimeSeconds, note.startTimeSeconds + note.durationSeconds])));
});

test('real tensor inference uses a detached settings snapshot and releases tensors after configured postprocessing', async () => {
  const tf = require(path.join(cache, '-tensorflow-tfjs-3.21.0/extracted/package/dist/tf.min.js'));
  await tf.setBackend('cpu');
  await tf.ready();
  const baseline = tf.memory().numTensors;
  const data = fixture(86);
  // Deterministic model-output fixture; framing, tensor scopes, official
  // postprocessing and the settings integration are real production code.
  const padded = values => [Array.from({length: 172}, (_, index) => values[index - 15] || Array(88).fill(0))];
  const model = {execute() { return [tf.tensor3d(padded(data.frames)), tf.tensor3d(padded(data.onsets))]; }};
  const options = {...settings.presets.more, minPitchMidi: 64, maxPitchMidi: 64};
  const phases = [];
  const notes = await runtime.runBasicPitch(tf, post.exports, model, new Float32Array(22050), progress => {
    phases.push(progress.phase);
    options.minPitchMidi = 60;
    options.maxPitchMidi = 60;
  }, options);
  assert.deepEqual(plain(notes.map(note => note.pitchMidi)), [64]);
  assert.deepEqual(phases, ['analyzing', 'postprocessing']);
  assert.equal(tf.memory().numTensors, baseline);
  const defaults = await runtime.runBasicPitch(tf, post.exports, model, new Float32Array(22050));
  assert.deepEqual(plain(defaults.map(note => note.pitchMidi).sort((a, b) => a - b)), [60, 64]);
  assert.equal(tf.memory().numTensors, baseline);
  await assert.rejects(runtime.runBasicPitch(tf, post.exports, {execute() { throw new Error('synthetic model failure'); }}, new Float32Array(22050), () => {}, options), /synthetic model failure/);
  assert.equal(tf.memory().numTensors, baseline, 'failure also releases the framed input');
});

test('embedded worker receives settings for each request and reuses its model without leaking tensors', async () => {
  const tf = require(path.join(cache, '-tensorflow-tfjs-3.21.0/extracted/package/dist/tf.min.js'));
  await tf.setBackend('cpu');
  await tf.ready();
  const baseline = tf.memory().numTensors;
  const data = fixture(86);
  const padded = values => [Array.from({length: 172}, (_, index) => values[index - 15] || Array(88).fill(0))];
  const model = {execute() { return [tf.tensor3d(padded(data.frames)), tf.tensor3d(padded(data.onsets))]; }};
  const workerTf = Object.create(tf);
  let modelLoads = 0;
  Object.defineProperty(workerTf, 'loadGraphModel', {value: async () => { modelLoads++; return model; }});
  const messages = [];
  const context = {tf: workerTf, BasicPitchPostprocess: post.exports, Float32Array, setTimeout, performance, console};
  context.self = {postMessage(message) { messages.push(message); }};
  vm.createContext(context, {codeGeneration: {strings: false, wasm: false}});
  vm.runInContext(fs.readFileSync(settingsFile, 'utf8') + '\n' + fs.readFileSync(path.join(__dirname, '../src/inference-worker.js'), 'utf8'), context);
  for (const [index, options] of Object.values(settings.presets).entries()) {
    await context.self.onmessage({data: {samples: new Float32Array(22050), settings: options}});
    const complete = messages.at(-1);
    assert.equal(complete.phase, 'complete');
    assert.equal(complete.notes.length, index + 1);
    assert.equal(complete.tensors, baseline);
  }
  assert.equal(modelLoads, 1);
  assert.equal(tf.memory().numTensors, baseline);
});
