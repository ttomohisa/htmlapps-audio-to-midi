const test = require('node:test');
const assert = require('node:assert/strict');
const {parseMidi} = require('midi-file');
const core = require('../src/audio-core.js');
const editing = require('../src/editing-core.js');

const HEADER = 'start_seconds,end_seconds,pitch_midi,velocity';
const note = (pitch, start, end, id = 'note') => ({
  id, pitchMidi: pitch, startSeconds: start, endSeconds: end, velocity: 96, origin: 'detected'
});
const order = (a, b) => a.startSeconds - b.startSeconds || a.pitchMidi - b.pitchMidi || a.endSeconds - b.endSeconds;

function csvRows(text) {
  assert.equal(typeof text, 'string');
  assert.ok(text.endsWith('\r\n'));
  assert.equal(text.replace(/\r\n/g, '').includes('\n'), false, 'no platform-dependent bare LF');
  assert.equal(text.replace(/\r\n/g, '').includes('\r'), false, 'no bare CR');
  const lines = text.slice(0, -2).split('\r\n');
  assert.equal(lines.shift(), HEADER);
  return lines.map(line => {
    const cells = line.split(',');
    assert.equal(cells.length, 4);
    for (const cell of cells) {
      assert.match(cell, /^(?:0|[1-9]\d*)(?:\.\d+)?(?:e[+-]?\d+)?$/);
      assert.ok(Number.isFinite(Number(cell)));
    }
    return cells.map(Number);
  });
}

function readMidi(notes) {
  const encoded = core.encodeMidi(notes);
  const midi = parseMidi(encoded);
  assert.deepEqual(midi.header, {format: 1, numTracks: 2, ticksPerBeat: 480});
  assert.deepEqual(midi.tracks[0].map(event => event.type), ['setTempo', 'endOfTrack']);
  assert.equal(midi.tracks[0][0].microsecondsPerBeat, 500000, 'fixed 120 BPM, not an estimated tempo');
  const track = midi.tracks[1];
  assert.equal(track[0].type, 'programChange');
  assert.equal(track[0].programNumber, 0, 'Acoustic Grand Piano');
  assert.equal(track[0].channel, 0, 'human channel 1');
  assert.equal(track.at(-1).type, 'endOfTrack');
  assert.equal(track.at(-1).deltaTime, 0);
  let tick = 0;
  const events = [];
  for (const event of track) {
    assert.ok(Number.isInteger(event.deltaTime) && event.deltaTime >= 0);
    tick += event.deltaTime;
    assert.ok(['programChange', 'noteOn', 'noteOff', 'endOfTrack'].includes(event.type),
      'no bend, source text, controller, or estimated musical metadata');
    if (event.type !== 'noteOn' && event.type !== 'noteOff') continue;
    assert.equal(event.channel, 0);
    assert.equal(event.velocity, event.type === 'noteOn' ? 96 : 0);
    events.push({tick, type: event.type, pitch: event.noteNumber});
  }
  assert.equal(events.filter(event => event.type === 'noteOn').length, notes.length);
  assert.equal(events.filter(event => event.type === 'noteOff').length, notes.length);
  const expected = notes.flatMap(n => {
    const start = Math.round(n.startSeconds * 960);
    const end = Math.max(start + 1, Math.round(n.endSeconds * 960));
    return [{tick: start, type: 'noteOn', pitch: n.pitchMidi}, {tick: end, type: 'noteOff', pitch: n.pitchMidi}];
  }).sort((a, b) => a.tick - b.tick || Number(b.type === 'noteOff') - Number(a.type === 'noteOff') || a.pitch - b.pitch);
  assert.deepEqual(events, expected, 'every source boundary survives as its own MIDI event');
  const active = new Map();
  for (const event of events) {
    const count = (active.get(event.pitch) || 0) + (event.type === 'noteOn' ? 1 : -1);
    assert.ok(count >= 0, 'no unmatched note-off');
    active.set(event.pitch, count);
  }
  assert.ok([...active.values()].every(count => count === 0), 'no stuck notes');
  return {encoded, events};
}

function pairEvents(events, policy = 'fifo') {
  const active = new Map(), notes = [];
  for (const event of events) {
    if (!active.has(event.pitch)) active.set(event.pitch, []);
    const queue = active.get(event.pitch);
    if (event.type === 'noteOn') queue.push(event.tick);
    else {
      const start = policy === 'fifo' ? queue.shift() : queue.pop();
      assert.notEqual(start, undefined);
      assert.ok(event.tick > start);
      notes.push({pitchMidi: event.pitch, startSeconds: start / 960, endSeconds: event.tick / 960});
    }
  }
  assert.ok([...active.values()].every(queue => queue.length === 0));
  return notes.sort(order);
}

test('CSV has exact header, fixed velocity, full source seconds, stable CRLF and UTF-8 bytes', () => {
  const input = [note(60, .12345678901234568, .9876543210987654), note(127, 59.999999, 60)];
  const expected = HEADER + '\r\n0.12345678901234568,0.9876543210987654,60,96\r\n59.999999,60,127,96\r\n';
  assert.equal(core.encodeCsv(input), expected);
  assert.deepEqual(csvRows(expected), input.map(n => [n.startSeconds, n.endSeconds, n.pitchMidi, 96]));
  const bytes = new TextEncoder().encode(core.encodeCsv(input));
  assert.equal(new TextDecoder('utf-8', {fatal: true}).decode(bytes), expected);
  assert.notEqual(bytes[0], 0xef, 'exact header without an optional BOM prefix');
});

test('CSV sorts source time, pitch and end deterministically without mutation or removing duplicates', () => {
  const input = [note(72, 1, 2, 'z'), note(60, .1, 1, 'b'), note(60, .1, .7, 'c'),
    note(59, .1, .9, 'a'), note(60, .1, .7, 'duplicate'), note(0, 1e-7, .0000002)];
  input.forEach(Object.freeze); Object.freeze(input);
  const before = input.slice();
  const expected = [input[5], input[3], input[2], input[4], input[1], input[0]];
  const text = core.encodeCsv(input);
  assert.deepEqual(csvRows(text), expected.map(n => [n.startSeconds, n.endSeconds, n.pitchMidi, 96]));
  assert.equal(core.encodeCsv(input.slice().reverse()), text);
  assert.deepEqual(input, before);
});

test('CSV exports only validated numeric fields and ignores source metadata and formula payloads', () => {
  const n = note(60, 0, 1);
  n.id = '=HYPERLINK("https://invalid.example")';
  n.origin = '+formula'; n.filename = 'private-name.wav'; n.pitchBends = [Infinity];
  n.velocity = '=1+1';
  n.source = {toString() { throw new Error('metadata must not be serialized'); }};
  assert.equal(core.encodeCsv([n]), HEADER + '\r\n0,1,60,96\r\n');
});

test('CSV rejects empty, malformed, non-finite, coerced or out-of-range notes atomically', () => {
  const invalidRows = [null, undefined, {}, note(-1, 0, 1), note(128, 0, 1), note(60.5, 0, 1),
    note('60', 0, 1), note(60, -1, 1), note(60, 1, 1), note(60, 2, 1), note(60, 0, 60.00001),
    note(60, NaN, 1), note(60, 0, Infinity), note(60, '0', 1), note(60, 0, '1'),
    note('=1+1', 0, 1), note(60, '=1+1', 1)];
  for (const row of invalidRows) assert.throws(() => core.encodeCsv([note(60, 0, 1), row]), /No valid notes to export/);
  for (const value of [[], null, undefined, {}, 'notes', new Array(1)]) {
    assert.throws(() => core.encodeCsv(value), /No valid notes to export/);
  }
});

test('MIDI rejects malformed collections and sparse or invalid rows before encoding', () => {
  for (const value of [[], null, undefined, {}, 'notes', new Array(1), [null], [undefined],
    [note(60, 0, 1), note(60, 0, 60.00001)]]) {
    assert.throws(() => core.encodeMidi(value), /No valid notes to export/);
  }
});

test('CSV uses current edited and cleanup notes through Undo and Redo without marking them saved', () => {
  const session = editing.createSession([note(60, 0, 1, 'split'), note(72, .1, .12, 'short')], 2);
  session.update('split', {pitchMidi: 61, startSeconds: .123456789});
  session.applyPlan(session.previewSplit('split', .5));
  session.applyPlan(session.previewRemoveShort(.05));
  const edited = session.snapshot();
  const expected = edited.map(n => [n.startSeconds, n.endSeconds, n.pitchMidi, 96]);
  assert.deepEqual(csvRows(core.encodeCsv(edited)), expected);
  assert.equal(session.dirty(), true, 'pure encoder cannot change the saved fingerprint');
  assert.deepEqual(session.originalNotes(), [note(60, 0, 1, 'split'), note(72, .1, .12, 'short')]);
  session.undo();
  assert.equal(csvRows(core.encodeCsv(session.snapshot())).length, 3);
  session.redo();
  assert.deepEqual(csvRows(core.encodeCsv(session.snapshot())), expected);
});

for (const [format, safeName] of [['mid', value => core.safeMidiName(value)], ['csv', value => core.safeCsvName(value)]]) {
  test(`${format} filenames preserve Japanese and sanitize unsafe, empty, reserved and mixed suffix names`, () => {
    const cases = [
      ['鼻歌 / take.mid.mid', '鼻歌  take'], ['鼻歌.csv.CSV', '鼻歌'],
      ['edited.mid.csv.MID.CsV', 'edited'], ['edited.csv .mid . ', 'edited'],
      ['plain-name', 'plain-name'], ['notes.txt', 'notes.txt'], ['name..', 'name'],
      [' \u0000/\\:*?"<>|. ', 'audio-to-midi-notes'], ['', 'audio-to-midi-notes'],
      ['.mid.csv', 'audio-to-midi-notes'], [null, 'audio-to-midi-notes'],
      ['CON', '_CON'], ['nul.txt', '_nul.txt'], ['LPT9.mid', '_LPT9'],
      ['com1.csv', '_com1'], ['COM10', 'COM10'], ['auxiliary', 'auxiliary']
    ];
    for (const [input, base] of cases) {
      const actual = safeName(input);
      assert.equal(actual, `${base}.${format}`, String(input));
      assert.equal(safeName(actual), actual, 'sanitization is idempotent');
      assert.equal(/[\x00-\x1f\x7f/\\:*?"<>|]/.test(actual), false);
    }
    const long = safeName('音🎹'.repeat(80));
    assert.equal(Array.from(long.slice(0, -4)).length, 120, 'length limit counts code points, not surrogate halves');
    assert.ok(long.endsWith(`.${format}`));
    for (const input of ['a'.repeat(116) + '.mid' + 'x'.repeat(20), 'a'.repeat(119) + '.rest', '.'.repeat(120) + 'end']) {
      const truncated = safeName(input);
      assert.equal(safeName(truncated), truncated, 'truncation cannot reintroduce duplicate suffixes or an empty basename');
      assert.equal(/\.(?:mid|csv)\.(?:mid|csv)$/i.test(truncated), false);
      assert.equal(/[. ]\.(?:mid|csv)$/i.test(truncated), false);
    }
  });
}

test('independent MIDI readback covers overlapping chords, consecutive pitches, short notes and full pitch extremes', () => {
  const input = [note(0, 0, .0000001), note(60, .1, .5), note(64, .2, .8), note(67, .2, .8),
    note(60, .5, 1), note(127, .9996, 1.000001), note(1, 59.999999, 60)];
  const snapshot = structuredClone(input);
  const {events} = readMidi(input);
  const actual = pairEvents(events);
  const expected = input.slice().sort(order);
  assert.equal(actual.length, expected.length);
  for (let index = 0; index < expected.length; index++) {
    assert.equal(actual[index].pitchMidi, expected[index].pitchMidi);
    assert.ok(Math.abs(actual[index].startSeconds - expected[index].startSeconds) <= .5 / 960);
    assert.ok(Math.abs(actual[index].endSeconds - expected[index].endSeconds) < 1.5 / 960,
      'sub-tick notes need a minimum one-tick duration after rounding start');
  }
  assert.deepEqual(events.filter(e => e.tick === 480 && e.pitch === 60).map(e => e.type), ['noteOff', 'noteOn']);
  assert.deepEqual(input, snapshot);
});

test('same-pitch overlapping MIDI retains all event boundaries while nested note pairing stays ambiguous', () => {
  const nested = [note(60, 0, 2), note(60, .5, 1.5)];
  const crossing = [note(60, 0, 1.5), note(60, .5, 2)];
  const {encoded, events} = readMidi(nested);
  assert.deepEqual(encoded, readMidi(crossing).encoded,
    'channel/pitch note-offs cannot identify which overlapping note ended');
  assert.deepEqual(events, [{tick: 0, type: 'noteOn', pitch: 60}, {tick: 480, type: 'noteOn', pitch: 60},
    {tick: 1440, type: 'noteOff', pitch: 60}, {tick: 1920, type: 'noteOff', pitch: 60}]);
  assert.notDeepEqual(pairEvents(events, 'fifo'), pairEvents(events, 'lifo'));
  assert.deepEqual(csvRows(core.encodeCsv(nested)), [[0, 2, 60, 96], [.5, 1.5, 60, 96]],
    'CSV preserves the exact nested intervals when MIDI pairing is ambiguous');
});

test('dense MIDI and CSV keep every onset, offset, duplicate and source interval', () => {
  const input = [];
  for (let index = 0; index < 240; index++) {
    for (let pitch = 48; pitch < 60; pitch++) {
      input.push(note(pitch, index / 4, Math.min(60, index / 4 + .5), `${index}-${pitch}`));
    }
  }
  input.push(note(48, 0, .5, 'duplicate'));
  readMidi(input);
  assert.deepEqual(csvRows(core.encodeCsv(input)), input.slice().sort(order).map(n => [n.startSeconds, n.endSeconds, n.pitchMidi, 96]));
});
