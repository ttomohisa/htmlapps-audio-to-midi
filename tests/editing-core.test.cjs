'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const sourcePath = path.join(__dirname, '../src/editing-core.js');
const api = () => {
  assert.ok(fs.existsSync(sourcePath), 'editing core must exist');
  return require(sourcePath);
};
const note = (id = 'detected-0', pitchMidi = 60, startSeconds = .123456789, endSeconds = .987654321) =>
  ({id, pitchMidi, startSeconds, endSeconds, velocity: 96, origin: 'detected'});
const rejectsCode = (run, code) => assert.throws(run, error => error instanceof Error && error.code === code);

test('editing core exposes the same dependency-free browser and CommonJS API', () => {
  const core = api();
  assert.equal(typeof core.createSession, 'function');
  assert.equal(typeof core.parsePitch, 'function');
  assert.equal(Object.isFrozen(core), true);
  const sandbox = {window: {}};
  vm.runInNewContext(fs.readFileSync(sourcePath, 'utf8'), sandbox);
  assert.equal(typeof sandbox.window.AudioMidiEditing.createSession, 'function');
  assert.equal(sandbox.window.AudioMidiEditing.parsePitch('C4'), 60);
});

test('sessions keep immutable original detection separate from detached working snapshots', () => {
  const source = [note()];
  const session = api().createSession(source, 2);
  const original = session.originalNotes();
  assert.deepEqual(original, source);
  assert.notEqual(original, source);
  assert.notEqual(original[0], source[0]);
  assert.equal(Object.isFrozen(original), true);
  assert.equal(Object.isFrozen(original[0]), true);
  source[0].pitchMidi = 99;
  source.push(note('later'));
  const snapshot = session.snapshot();
  snapshot[0].pitchMidi = 101;
  snapshot.length = 0;
  assert.equal(session.snapshot()[0].pitchMidi, 60);
  assert.equal(session.snapshot().length, 1);
  assert.equal(original[0].pitchMidi, 60);
  assert.equal(session.dirty(), false);
});

test('updating pitch or exact source-second boundaries preserves detected ID and origin', () => {
  const initial = note();
  const session = api().createSession([initial], 2);
  const changed = session.update(initial.id, {pitchMidi: 61, startSeconds: .234567891, endSeconds: 1.876543219});
  assert.deepEqual(changed, {...initial, pitchMidi: 61, startSeconds: .234567891, endSeconds: 1.876543219});
  assert.deepEqual(session.originalNotes(), [initial]);
  assert.equal(session.dirty(), true);
  changed.pitchMidi = 12;
  assert.equal(session.snapshot()[0].pitchMidi, 61);
});

test('unchanged and missing-note operations return null without dirtying the session', () => {
  const initial = note();
  const session = api().createSession([initial], 2);
  assert.equal(session.update(initial.id, {}), null);
  assert.equal(session.update(initial.id, {pitchMidi: 60}), null);
  assert.equal(session.update('missing', {pitchMidi: 500}), null);
  assert.equal(session.remove('missing'), null);
  assert.equal(session.undoDelete(), null);
  assert.equal(session.canUndoDelete(), false);
  assert.equal(session.dirty(), false);
});

test('fresh sessions have no general history and unavailable Undo and Redo return null', () => {
  const session = api().createSession([note()], 2);
  assert.equal(session.canUndo(), false);
  assert.equal(session.canRedo(), false);
  assert.equal(session.undo(), null);
  assert.equal(session.redo(), null);
  assert.deepEqual(session.snapshot(), [note()]);
  assert.equal(session.dirty(), false);
});

test('general history reverses atomic mixed operations and replays them in exact order', () => {
  const initial = [note('a', 60, 0, 1), note('b', 64, .1, 1.1)];
  const session = api().createSession(initial, 2);
  const states = [session.snapshot()];
  const updated = session.update('a', {pitchMidi: 61, startSeconds: .234567891, endSeconds: 1.876543219});
  states.push(session.snapshot());
  const added = session.add({pitchMidi: 72, startSeconds: 0, endSeconds: .5});
  states.push(session.snapshot());
  const removed = session.remove('b');
  states.push(session.snapshot());

  assert.deepEqual(session.undo(), removed);
  assert.deepEqual(session.snapshot(), states[2]);
  assert.deepEqual(session.undo(), added);
  assert.deepEqual(session.snapshot(), states[1]);
  assert.deepEqual(session.undo(), initial[0]);
  assert.deepEqual(session.snapshot(), states[0], 'one Undo restores all three changed fields');
  assert.equal(session.canUndo(), false);
  assert.equal(session.canRedo(), true);
  assert.equal(session.dirty(), false);
  assert.equal(session.undo(), null);

  assert.deepEqual(session.redo(), updated);
  assert.deepEqual(session.snapshot(), states[1]);
  assert.deepEqual(session.redo(), added);
  assert.deepEqual(session.snapshot(), states[2]);
  assert.deepEqual(session.redo(), removed);
  assert.deepEqual(session.snapshot(), states[3]);
  assert.equal(session.canRedo(), false);
  assert.equal(session.redo(), null);
  assert.deepEqual(session.originalNotes(), initial);
});

test('history notes are detached from input, snapshots, and every operation result', () => {
  const initial = note();
  const session = api().createSession([initial], 2);
  const fields = {pitchMidi: 72, startSeconds: .2, endSeconds: 1.5};
  const changed = session.update(initial.id, fields);
  const expected = {...initial, ...fields};
  initial.pitchMidi = 1;
  fields.pitchMidi = 2;
  changed.pitchMidi = 3;
  session.snapshot()[0].pitchMidi = 4;
  const undone = session.undo();
  assert.deepEqual(undone, note());
  undone.pitchMidi = 5;
  assert.deepEqual(session.snapshot(), [note()]);
  const redone = session.redo();
  assert.deepEqual(redone, expected);
  redone.pitchMidi = 6;
  assert.deepEqual(session.snapshot(), [expected]);
  const removed = session.remove(expected.id);
  removed.pitchMidi = 7;
  const restored = session.undo();
  assert.deepEqual(restored, expected);
  restored.pitchMidi = 8;
  assert.deepEqual(session.redo(), expected);
  assert.deepEqual(session.undo(), expected);
  assert.deepEqual(session.originalNotes(), [note()]);

  const added = session.add({pitchMidi: 127, startSeconds: 0, endSeconds: 2});
  const expectedAdded = {...added};
  added.pitchMidi = 9;
  session.undo().pitchMidi = 10;
  const replayed = session.redo();
  assert.deepEqual(replayed, expectedAdded);
  replayed.pitchMidi = 11;
  assert.deepEqual(session.snapshot().find(n => n.id === expectedAdded.id), expectedAdded);
});

test('no-op and rejected operations preserve both Undo and Redo history', () => {
  const session = api().createSession([note()], 2);
  const changed = session.update('detected-0', {pitchMidi: 62});
  const added = session.add({pitchMidi: 67, startSeconds: 0, endSeconds: 2});
  session.undo();
  session.markSaved();
  for (const fields of [{}, {pitchMidi: 62}, {id: 'forged', velocity: 12, origin: 'manual'}]) {
    assert.equal(session.update('detected-0', fields), null);
  }
  assert.equal(session.update('missing', {pitchMidi: 500}), null);
  assert.equal(session.remove('missing'), null);
  assert.equal(session.undoDelete(), null);
  rejectsCode(() => session.update('detected-0', {pitchMidi: 70, endSeconds: 3}), 'time');
  rejectsCode(() => session.update('detected-0', null), 'notes');
  rejectsCode(() => session.add({pitchMidi: 128, startSeconds: 0, endSeconds: 1}), 'pitch');
  rejectsCode(() => session.add(null), 'notes');
  assert.deepEqual(session.snapshot(), [changed]);
  assert.equal(session.dirty(), false);
  assert.equal(session.canUndo(), true);
  assert.equal(session.canRedo(), true);
  assert.deepEqual(session.redo(), added);
  assert.deepEqual(session.undo(), added);
  assert.deepEqual(session.undo(), note());
  assert.equal(session.canUndo(), false, 'no-op and invalid edits cannot create commands');
});

for (const edit of ['update', 'add', 'remove']) {
  test(`a successful ${edit} after Undo clears the old Redo branch`, () => {
    const session = api().createSession([note()], 2);
    session.update('detected-0', {pitchMidi: 62});
    session.update('detected-0', {pitchMidi: 64});
    session.undo();
    assert.equal(session.canRedo(), true);
    if (edit === 'update') session.update('detected-0', {pitchMidi: 67});
    else if (edit === 'add') session.add({pitchMidi: 67, startSeconds: 0, endSeconds: 1});
    else session.remove('detected-0');
    const branched = session.snapshot();
    assert.equal(session.canRedo(), false);
    assert.equal(session.redo(), null);
    assert.deepEqual(session.snapshot(), branched);
    session.undo();
    assert.deepEqual(session.snapshot(), [{...note(), pitchMidi: 62}]);
    session.undo();
    assert.deepEqual(session.snapshot(), [note()]);
    assert.equal(session.canUndo(), false);
  });
}

test('mixed history keeps exactly the latest 100 atomic operations across Undo and Redo cycles', () => {
  const session = api().createSession([note()], 2);
  const states = [session.snapshot()];
  let added;
  for (let index = 0; index < 105; index++) {
    if (index % 3 === 0) {
      session.update('detected-0', {pitchMidi: 61 + (index / 3) % 2});
    } else if (index % 3 === 1) {
      added = session.add({pitchMidi: 70, startSeconds: 0, endSeconds: 1});
    } else session.remove(added.id);
    states.push(session.snapshot());
  }
  for (let index = 104; index >= 5; index--) {
    assert.equal(session.canUndo(), true);
    assert.notEqual(session.undo(), null);
    assert.deepEqual(session.snapshot(), states[index]);
  }
  assert.equal(session.canUndo(), false);
  assert.equal(session.undo(), null);
  assert.deepEqual(session.snapshot(), states[5], 'older edits are intentionally no longer undoable');
  for (let index = 6; index <= 105; index++) {
    assert.equal(session.canRedo(), true);
    assert.notEqual(session.redo(), null);
    assert.deepEqual(session.snapshot(), states[index]);
  }
  assert.equal(session.canRedo(), false);
  assert.equal(session.redo(), null);
  for (let index = 0; index < 100; index++) assert.notEqual(session.undo(), null);
  assert.equal(session.undo(), null);
  assert.deepEqual(session.snapshot(), states[5]);
});

test('saved fingerprint follows exact content during Undo and Redo without clearing history', () => {
  const session = api().createSession([note()], 2);
  session.update('detected-0', {pitchMidi: 62, startSeconds: .123456788});
  session.markSaved();
  assert.equal(session.dirty(), false);
  assert.equal(session.canUndo(), true);
  session.update('detected-0', {endSeconds: 1.987654321});
  assert.equal(session.dirty(), true);
  session.undo();
  assert.equal(session.dirty(), false);
  session.undo();
  assert.equal(session.dirty(), true);
  session.redo();
  assert.equal(session.dirty(), false);
  session.redo();
  assert.equal(session.dirty(), true);
  session.undo();
  session.markSaved();
  assert.equal(session.canRedo(), true, 'saving never clears a valid redo branch');
  session.redo();
  assert.equal(session.dirty(), true);
});

test('general histories remain isolated when fresh or replacement sessions share note IDs', () => {
  const first = api().createSession([note()], 2);
  first.update('detected-0', {pitchMidi: 62});
  first.undo();
  const second = api().createSession([note('detected-0', 72)], 2);
  assert.equal(second.canUndo(), false);
  assert.equal(second.canRedo(), false);
  assert.equal(second.undo(), null);
  assert.equal(second.redo(), null);
  first.redo();
  assert.deepEqual(second.snapshot(), [note('detected-0', 72)]);
  assert.equal(second.dirty(), false);
});

test('add generates a unique manual ID with fixed velocity and ignores supplied identity metadata', () => {
  const session = api().createSession([note('manual-1'), note('manual-2')], 3);
  const added = session.add({id: 'manual-1', pitchMidi: 72, startSeconds: 0, endSeconds: 3, velocity: 1, origin: 'detected', pitchBends: [1]});
  assert.equal(added.origin, 'manual');
  assert.equal(added.velocity, 96);
  assert.match(added.id, /^manual-/);
  assert.equal(Object.hasOwn(added, 'pitchBends'), false);
  assert.equal(new Set(session.snapshot().map(n => n.id)).size, 3);
  added.endSeconds = .1;
  assert.equal(session.snapshot().find(n => n.id === added.id).endSeconds, 3);
  const edited = session.update(added.id, {pitchMidi: 73, id: 'forged', origin: 'detected', velocity: 20});
  assert.equal(edited.id, added.id);
  assert.equal(edited.origin, 'manual');
  assert.equal(edited.velocity, 96);
});

test('deleted and undone IDs stay reserved when a new edit replaces the redo branch', () => {
  const session = api().createSession([], 2);
  const first = session.add({pitchMidi: 60, startSeconds: 0, endSeconds: 1});
  session.remove(first.id);
  const second = session.add({pitchMidi: 62, startSeconds: 0, endSeconds: 1});
  assert.notEqual(second.id, first.id);
  assert.equal(session.undoDelete(), null, 'deletion Undo cannot skip the later addition');
  assert.deepEqual(session.undo(), second);
  assert.deepEqual(session.undoDelete(), first);
  const third = session.add({pitchMidi: 64, startSeconds: 0, endSeconds: 1});
  assert.notEqual(third.id, first.id);
  assert.notEqual(third.id, second.id);
  assert.equal(session.canRedo(), false);
  assert.equal(new Set(session.snapshot().map(n => n.id)).size, 2);
});

test('overlapping, duplicate, and simultaneous notes stay legal and distinct', () => {
  const session = api().createSession([note('a', 60, 0, 2), note('b', 60, .1, 1)], 2);
  const added = session.add({pitchMidi: 60, startSeconds: 0, endSeconds: 2});
  assert.equal(session.snapshot().length, 3);
  session.update('b', {startSeconds: 0, endSeconds: 2});
  assert.equal(session.snapshot().length, 3);
  assert.equal(session.snapshot().filter(n => n.pitchMidi === 60 && n.startSeconds === 0 && n.endSeconds === 2).length, 3);
  assert.ok(session.snapshot().some(n => n.id === added.id));
});

test('numeric pitch boundaries 0 and 127 and audio-time boundaries are valid', () => {
  const session = api().createSession([], 2);
  const low = session.add({pitchMidi: 0, startSeconds: 0, endSeconds: Number.MIN_VALUE});
  const high = session.add({pitchMidi: 127, startSeconds: 1, endSeconds: 2});
  assert.equal(low.pitchMidi, 0);
  assert.equal(low.endSeconds, Number.MIN_VALUE);
  assert.equal(high.pitchMidi, 127);
  assert.equal(high.endSeconds, 2);
});

for (const pitchMidi of [-1, 128, 60.5, NaN, Infinity, -Infinity, '60', '', null, undefined, false]) {
  test(`invalid pitch ${String(pitchMidi)} is rejected atomically by add and update`, () => {
    const initial = note();
    const session = api().createSession([initial], 2);
    rejectsCode(() => session.update(initial.id, {pitchMidi, startSeconds: .2}), 'pitch');
    rejectsCode(() => session.add({pitchMidi, startSeconds: 0, endSeconds: 1}), 'pitch');
    assert.deepEqual(session.snapshot(), [initial]);
    assert.equal(session.dirty(), false);
    assert.equal(session.canUndoDelete(), false);
  });
}

for (const [label, fields] of [
  ['negative start', {startSeconds: -.01}],
  ['start after end', {startSeconds: 1}],
  ['equal times', {startSeconds: .5, endSeconds: .5}],
  ['negative end', {endSeconds: -.1}],
  ['past clip end', {endSeconds: 2.0000000001}],
  ['non-finite start', {startSeconds: NaN}],
  ['infinite start', {startSeconds: Infinity}],
  ['non-finite end', {endSeconds: NaN}],
  ['infinite end', {endSeconds: Infinity}],
  ['string start', {startSeconds: '0'}],
  ['null start', {startSeconds: null}],
  ['missing start', {startSeconds: undefined}],
  ['missing end', {endSeconds: undefined}],
  ['boolean end', {endSeconds: true}]
]) {
  test(`invalid time (${label}) is rejected without changing notes, dirty state, or history`, () => {
    const initial = note();
    const session = api().createSession([initial, note('deleted')], 2);
    const deleted = session.remove('deleted');
    session.markSaved();
    rejectsCode(() => session.update(initial.id, {pitchMidi: 62, ...fields}), 'time');
    rejectsCode(() => session.add({...initial, ...fields}), 'time');
    assert.deepEqual(session.snapshot(), [initial]);
    assert.equal(session.dirty(), false);
    assert.deepEqual(session.undoDelete(), deleted);
  });
}

test('invalid session duration, input, IDs, origin, pitch, and times fail before use', () => {
  for (const duration of [0, -.1, NaN, Infinity, '2', null]) rejectsCode(() => api().createSession([], duration), 'time');
  for (const notes of [null, undefined, {}, 'notes']) rejectsCode(() => api().createSession(notes, 2), 'notes');
  for (const notes of [new Array(1), [null], [note('')], [note(' ')], [note(), note()], [{...note(), origin: 'other'}]]) {
    rejectsCode(() => api().createSession(notes, 2), 'notes');
  }
  rejectsCode(() => api().createSession([note('a', 128)], 2), 'pitch');
  rejectsCode(() => api().createSession([note('a', 60, 0, 2.1)], 2), 'time');
});

test('unsupported bends or source velocity are not carried into the fixed-velocity editing model', () => {
  const source = {...note(), velocity: 32, pitchBends: [0, 1, 2]};
  const session = api().createSession([source], 2);
  assert.equal(session.snapshot()[0].velocity, 96);
  assert.equal(Object.hasOwn(session.snapshot()[0], 'pitchBends'), false);
  session.update(source.id, {pitchMidi: 70, pitchBends: [7]});
  assert.equal(Object.hasOwn(session.snapshot()[0], 'pitchBends'), false);
  assert.deepEqual(source.pitchBends, [0, 1, 2]);
  assert.equal(source.velocity, 32);
});

test('delete Undo restores exact note data only when deletion is the latest operation', () => {
  const first = note('a', 60, 0, 1), second = note('b', 64, .1, 1.1), third = note('c', 67, .2, 1.2);
  const session = api().createSession([first, second, third], 2);
  session.update('b', {pitchMidi: 65});
  const removedFirst = session.remove('a');
  removedFirst.pitchMidi = 12;
  const removedSecond = session.remove('b');
  removedSecond.startSeconds = .7;
  session.update('c', {pitchMidi: 68});
  assert.equal(session.canUndoDelete(), false);
  assert.equal(session.undoDelete(), null);
  assert.deepEqual(session.undo(), third);
  assert.equal(session.canUndoDelete(), true);
  const restored = session.undoDelete();
  assert.deepEqual(restored, {...second, pitchMidi: 65});
  restored.pitchMidi = 11;
  assert.deepEqual(session.undoDelete(), first);
  assert.equal(session.canUndoDelete(), false);
  assert.deepEqual(session.snapshot(), [first, {...second, pitchMidi: 65}, third]);
  assert.equal(session.canUndo(), true, 'the earlier update remains in general history');
  assert.deepEqual(session.undo(), second);
  assert.deepEqual(session.snapshot(), [first, second, third]);
});

test('delete Undo is isolated to its originating session and fresh sessions are clean', () => {
  const first = api().createSession([note()], 2);
  first.remove('detected-0');
  const second = api().createSession([note('detected-0', 72)], 2);
  assert.equal(second.canUndoDelete(), false);
  assert.equal(second.undoDelete(), null);
  assert.equal(second.dirty(), false);
  first.undoDelete();
  assert.equal(second.snapshot()[0].pitchMidi, 72);
});

test('delete history holds the most recent 100 notes and drops older deletions', () => {
  const notes = Array.from({length: 101}, (_, i) => note(`detected-${i}`, i % 128, i / 1000, 1));
  const session = api().createSession(notes, 2);
  for (const n of notes) session.remove(n.id);
  for (let i = 100; i >= 1; i--) assert.equal(session.undoDelete().id, notes[i].id);
  assert.equal(session.undoDelete(), null);
  assert.equal(session.snapshot().length, 100);
  assert.equal(session.snapshot().some(n => n.id === notes[0].id), false);
});

test('dirty compares current exact exported note values to the saved baseline', () => {
  const initial = note();
  const session = api().createSession([initial], 2);
  session.update(initial.id, {pitchMidi: 61});
  assert.equal(session.dirty(), true);
  session.update(initial.id, {pitchMidi: 60});
  assert.equal(session.dirty(), false);
  session.update(initial.id, {startSeconds: initial.startSeconds + .000000001});
  assert.equal(session.dirty(), true);
  session.markSaved();
  assert.equal(session.dirty(), false);
  session.update(initial.id, {startSeconds: initial.startSeconds});
  assert.equal(session.dirty(), true);
  session.update(initial.id, {startSeconds: initial.startSeconds + .000000001});
  assert.equal(session.dirty(), false);
});

test('delete then Undo returns clean; saving after deletion then Undo becomes dirty', () => {
  const session = api().createSession([note()], 2);
  session.remove('detected-0');
  assert.equal(session.dirty(), true);
  session.undoDelete();
  assert.equal(session.dirty(), false);
  session.remove('detected-0');
  session.markSaved();
  assert.equal(session.dirty(), false);
  session.undoDelete();
  assert.equal(session.dirty(), true);
});

test('dirty fingerprint ignores identity, origin, and ordering but retains duplicate note counts', () => {
  const first = note('a', 60, .2, .8), second = note('b', 67, 0, 1);
  const session = api().createSession([first, second], 2);
  session.remove('a');
  const manual = session.add(first);
  assert.notEqual(manual.id, first.id);
  assert.equal(manual.origin, 'manual');
  assert.equal(session.dirty(), false);
  const duplicate = session.add(first);
  assert.equal(session.dirty(), true);
  session.remove(duplicate.id);
  assert.equal(session.dirty(), false);
});

test('snapshots stay chronologically sorted after add, update, and Undo', () => {
  const session = api().createSession([note('late', 60, 1, 2), note('early-high', 72, 0, 1)], 2);
  const low = session.add({pitchMidi: 60, startSeconds: 0, endSeconds: .5});
  assert.deepEqual(session.snapshot().map(n => n.id), [low.id, 'early-high', 'late']);
  session.update('late', {startSeconds: 0, endSeconds: .25});
  assert.deepEqual(session.snapshot().map(n => n.id), ['late', low.id, 'early-high']);
  session.remove(low.id);
  session.undoDelete();
  assert.deepEqual(session.snapshot().map(n => n.id), ['late', low.id, 'early-high']);
});

test('parsePitch supports MIDI integers and case-insensitive note names, sharps, flats, and edge octaves', () => {
  const cases = [[60, 60], ['60', 60], [' 060 ', 60], ['+60', 60], [0, 0], ['127', 127], ['C4', 60], ['c4', 60],
    ['C#4', 61], ['C♯4', 61], ['Db4', 61], ['d♭4', 61], ['bb4', 70], ['B#3', 60], ['Cb4', 59],
    ['E#4', 65], ['Fb4', 64], ['C-1', 0], ['B#-2', 0], ['G9', 127], ['A4', 69]];
  for (const [value, expected] of cases) assert.equal(api().parsePitch(value), expected, String(value));
});

test('parsePitch rejects incomplete, fractional, out-of-range, or surprising coercible input', () => {
  for (const value of ['', ' ', 'C', 'C#', 'C 4', 'H4', 'C##4', '60.5', '60.0', '6e1', '0x3c', 'Infinity',
    'NaN', 'C-2', 'Cb-1', 'G#9', '128', '-1', NaN, Infinity, 60.1, -1, 128, null, undefined, true, [], {}]) {
    rejectsCode(() => api().parsePitch(value), 'pitch');
  }
});

test('malformed add and update fields fail without changing valid notes', () => {
  const session = api().createSession([note()], 2);
  for (const fields of [null, undefined, [], 'note', 4]) {
    rejectsCode(() => session.update('detected-0', fields), 'notes');
    rejectsCode(() => session.add(fields), 'notes');
  }
  assert.deepEqual(session.snapshot(), [note()]);
  assert.equal(session.dirty(), false);
});

test('independent MIDI decoder receives only the current edited notes with exact pitches and bounded timing error', () => {
  const {encodeMidi} = require('../src/audio-core.js');
  const {parseMidi} = require('midi-file');
  const initial = [note('first', 60, .1, .7), note('removed', 64, .2, 1.2), note('restored', 67, .3, 1.3)];
  const session = api().createSession(initial, 2);
  session.update('first', {pitchMidi: 61, startSeconds: .123456789, endSeconds: .876543219});
  session.remove('removed');
  session.remove('restored');
  session.undoDelete();
  session.add({pitchMidi: 127, startSeconds: 1.777777777, endSeconds: 1.777777778});
  session.add({pitchMidi: 0, startSeconds: 0, endSeconds: 2});
  const expected = session.snapshot();
  const midi = parseMidi(encodeMidi(expected));
  let tick = 0;
  const pending = new Map(), decoded = [];
  for (const event of midi.tracks[1]) {
    tick += event.deltaTime;
    if (event.type === 'noteOn') {
      assert.equal(event.velocity, 96);
      assert.equal(event.channel, 0);
      pending.set(event.noteNumber, tick / 960);
    } else if (event.type === 'noteOff') {
      assert.ok(pending.has(event.noteNumber));
      decoded.push({pitchMidi: event.noteNumber, startSeconds: pending.get(event.noteNumber), endSeconds: tick / 960});
      pending.delete(event.noteNumber);
    }
  }
  assert.equal(pending.size, 0);
  assert.equal(decoded.length, expected.length);
  for (const edited of expected) {
    const actual = decoded.find(n => n.pitchMidi === edited.pitchMidi);
    assert.ok(actual);
    assert.ok(Math.abs(actual.startSeconds - edited.startSeconds) <= 1 / 960);
    assert.ok(Math.abs(actual.endSeconds - edited.endSeconds) <= 2 / 960);
    assert.ok(actual.endSeconds > actual.startSeconds);
  }
  assert.equal(decoded.some(n => n.pitchMidi === 60 || n.pitchMidi === 64), false);
  assert.deepEqual(session.snapshot(), expected, 'MIDI tick rounding cannot change working seconds');
  assert.deepEqual(session.originalNotes(), initial, 'export cannot alter original detection');
  session.markSaved();
  assert.equal(session.dirty(), false);
});

test('deleting all notes and adding a fresh note supports recovery from an empty result', () => {
  const session = api().createSession([note()], 2);
  session.remove('detected-0');
  assert.deepEqual(session.snapshot(), []);
  const added = session.add({pitchMidi: api().parsePitch('F#4'), startSeconds: 0, endSeconds: 2});
  assert.equal(added.pitchMidi, 66);
  assert.equal(added.origin, 'manual');
  assert.deepEqual(session.snapshot(), [added]);
  assert.equal(session.undoDelete(), null);
  assert.deepEqual(session.undo(), added);
  assert.deepEqual(session.snapshot(), []);
  assert.deepEqual(session.undoDelete(), note());
  assert.deepEqual(session.snapshot(), [note()]);
});

test('fixed-seed edit and history sequences match a detached snapshot model and saved baselines', () => {
  const original = [note()];
  const session = api().createSession(original, 2);
  const past = [], future = [];
  const content = notes => JSON.stringify(notes.map(n => [n.pitchMidi, n.startSeconds, n.endSeconds]).sort());
  let saved = content(session.snapshot());
  let seed = 731;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let step = 0; step < 800; step++) {
    const before = session.snapshot();
    const target = before[Math.floor(random() * before.length)];
    const operation = Math.floor(random() * 8);
    let changed, type;
    if (operation === 0 || (!target && operation < 3)) {
      const startSeconds = random() * 1.5;
      changed = session.add({pitchMidi: Math.floor(random() * 128), startSeconds, endSeconds: startSeconds + .5});
      type = 'add';
    } else if (operation === 1) {
      changed = session.update(target.id, {pitchMidi: Math.floor(random() * 128)});
      type = 'update';
    } else if (operation === 2) {
      changed = session.remove(target.id);
      type = 'remove';
    } else if (operation === 3) {
      const command = past.pop();
      assert.equal(session.undo() !== null, !!command);
      if (command) future.push(command);
      assert.deepEqual(session.snapshot(), command ? command.before : before);
    } else if (operation === 4) {
      const command = future.pop();
      assert.equal(session.redo() !== null, !!command);
      if (command) past.push(command);
      assert.deepEqual(session.snapshot(), command ? command.after : before);
    } else if (operation === 5) {
      const command = past.length && past[past.length - 1].type === 'remove' ? past.pop() : null;
      assert.equal(session.undoDelete() !== null, !!command);
      if (command) future.push(command);
      assert.deepEqual(session.snapshot(), command ? command.before : before);
    } else if (operation === 6) {
      session.markSaved();
      saved = content(before);
      assert.equal(session.dirty(), false);
    } else {
      if (target) rejectsCode(() => session.update(target.id, {endSeconds: 3}), 'time');
      rejectsCode(() => session.add({pitchMidi: 60, startSeconds: 0, endSeconds: 3}), 'time');
      assert.deepEqual(session.snapshot(), before);
    }
    if (changed) {
      past.push({before, after: session.snapshot(), type});
      if (past.length > 100) past.shift();
      future.length = 0;
      changed.pitchMidi = -99;
    }
    const current = session.snapshot();
    assert.equal(session.canUndo(), past.length > 0);
    assert.equal(session.canRedo(), future.length > 0);
    assert.equal(session.canUndoDelete(), past.length > 0 && past[past.length - 1].type === 'remove');
    assert.equal(session.dirty(), content(current) !== saved);
    assert.equal(new Set(current.map(n => n.id)).size, current.length);
    for (const n of current) {
      assert.ok(Number.isInteger(n.pitchMidi) && n.pitchMidi >= 0 && n.pitchMidi <= 127);
      assert.ok(n.startSeconds >= 0 && n.startSeconds < n.endSeconds && n.endSeconds <= 2);
      assert.equal(n.velocity, 96);
      assert.equal(n.origin, n.id === 'detected-0' ? 'detected' : 'manual');
    }
    assert.deepEqual(session.originalNotes(), original);
  }
});

test('split preview is detached and one commit preserves exact extent, pitch, origin and Undo/Redo', () => {
  const initial = note('source', 61, .123456789, 1.876543219);
  const session = api().createSession([initial], 2);
  const plan = session.previewSplit('source', .987654321);
  assert.equal(plan.type, 'split');
  assert.equal(plan.count, 1);
  assert.equal(plan.skippedCount, 0);
  assert.deepEqual(plan.changes[0], {before: initial, after: {...initial, endSeconds: .987654321}});
  const right = plan.changes[1].after;
  assert.equal(plan.changes[1].before, null);
  assert.match(right.id, /^split-/);
  assert.deepEqual(right, {...initial, id: right.id, startSeconds: .987654321});
  assert.deepEqual(session.snapshot(), [initial]);
  assert.equal(session.canUndo(), false);
  assert.equal(session.dirty(), false);
  const applied = session.applyPlan(plan);
  assert.equal(applied.id, initial.id);
  const result = session.snapshot();
  assert.equal(result.length, 2);
  assert.deepEqual(session.originalNotes(), [initial]);
  applied.pitchMidi = 1;
  right.pitchMidi = 2;
  assert.deepEqual(session.snapshot(), result);
  assert.equal(session.undo().id, initial.id);
  assert.deepEqual(session.snapshot(), [initial]);
  assert.equal(session.dirty(), false);
  assert.equal(session.canUndo(), false);
  session.redo();
  assert.deepEqual(session.snapshot(), result);
});

test('split validates a strictly interior finite second without modifying state', () => {
  const session = api().createSession([note('a', 60, .1, 1)], 2);
  for (const seconds of [-1, 0, .1, 1, 2, NaN, Infinity, '0.5', null, undefined]) {
    rejectsCode(() => session.previewSplit('a', seconds), 'split');
  }
  assert.equal(session.previewSplit('missing', .5), null);
  assert.deepEqual(session.snapshot(), [note('a', 60, .1, 1)]);
  assert.equal(session.canUndo(), false);
});

test('split IDs remain reserved through cancelled previews, Undo and new branches', () => {
  const initial = {...note('split-1', 60, 0, 1), origin: 'manual'};
  const session = api().createSession([initial], 2);
  const cancelled = session.previewSplit(initial.id, .4);
  const first = session.previewSplit(initial.id, .5);
  const firstId = first.changes[1].after.id;
  assert.notEqual(cancelled.changes[1].after.id, firstId);
  session.applyPlan(first);
  assert.equal(session.snapshot().find(n => n.id === firstId).origin, 'manual');
  session.undo();
  const next = session.previewSplit(initial.id, .7);
  assert.notEqual(next.changes[1].after.id, firstId);
  assert.notEqual(next.changes[1].after.id, initial.id);
  session.applyPlan(next);
  assert.equal(session.canRedo(), false);
});

test('merge candidates are explicit same-pitch temporal neighbors with gaps from zero to 0.05 seconds', () => {
  const notes = [note('left', 60, 0, .4), note('selected', 60, .45, 1), note('right', 60, 1.05, 1.5),
    note('other-pitch', 61, .5, 1), note('far', 60, 1.6, 2)];
  const session = api().createSession(notes, 2);
  const candidates = session.mergeCandidates('selected');
  assert.deepEqual(candidates.map(n => n.id), ['left', 'right']);
  candidates[0].pitchMidi = 12;
  assert.equal(session.mergeCandidates('selected')[0].pitchMidi, 60);
  assert.deepEqual(session.mergeCandidates('missing'), []);
  rejectsCode(() => session.previewMerge('selected', 'other-pitch'), 'merge');
  rejectsCode(() => session.previewMerge('selected', 'far'), 'merge');
  rejectsCode(() => session.previewMerge('selected', 'selected'), 'merge');
  assert.equal(session.previewMerge('missing', 'selected'), null);
  assert.equal(session.previewMerge('selected', 'missing'), null);
  assert.deepEqual(session.snapshot().map(n => n.id).sort(), notes.map(n => n.id).sort());
  assert.equal(session.canUndo(), false);
});

test('overlap and intervening same-pitch notes prevent skipping ahead to merge', () => {
  const session = api().createSession([note('long', 60, 0, 1), note('overlap', 60, .4, .5),
    note('next', 60, 1, 1.5), note('duplicate', 62, 0, 1), note('duplicate-2', 62, 0, 1)], 2);
  assert.deepEqual(session.mergeCandidates('long'), []);
  assert.deepEqual(session.mergeCandidates('next'), []);
  assert.deepEqual(session.mergeCandidates('duplicate'), []);
  for (const other of ['overlap', 'next']) rejectsCode(() => session.previewMerge('long', other), 'merge');
  const beyond = api().createSession([note('a', 60, 0, 1), note('b', 60, 1.0500000001, 2)], 2);
  assert.deepEqual(beyond.mergeCandidates('a'), []);
});

for (const selectedId of ['a', 'b']) {
  test(`merging ${selectedId} preserves the selected identity and provenance and restores both notes atomically`, () => {
    const initial = [note('a', 60, .123456789, .5), {...note('b', 60, .5, 1.876543219), origin: 'manual'}, note('c', 72, .3, 1)];
    const session = api().createSession(initial, 2);
    const before = session.snapshot();
    const plan = session.previewMerge(selectedId, selectedId === 'a' ? 'b' : 'a');
    assert.equal(plan.type, 'merge');
    assert.equal(plan.count, 2);
    assert.equal(plan.skippedCount, 0);
    assert.equal(plan.changes.length, 2);
    assert.deepEqual(session.snapshot(), before);
    const result = session.applyPlan(plan);
    assert.deepEqual(result, {...initial.find(n => n.id === selectedId), startSeconds: .123456789, endSeconds: 1.876543219});
    const after = session.snapshot();
    assert.equal(after.length, 2);
    assert.equal(session.canUndoDelete(), false, 'a batch merge is not a legacy single deletion');
    session.undo();
    assert.deepEqual(session.snapshot(), before);
    assert.equal(session.canUndo(), false);
    session.redo();
    assert.deepEqual(session.snapshot(), after);
  });
}

test('short-note cleanup previews every strictly shorter note and deletes them in one operation', () => {
  const initial = [note('first', 60, 0, .02), note('equal', 61, 0, .05), note('long', 62, .1, 1),
    note('last', 63, 1, 1.03), note('equal-later', 64, .3, .35)];
  const session = api().createSession(initial, 2);
  const before = session.snapshot();
  const plan = session.previewRemoveShort(.05);
  assert.equal(plan.type, 'remove-short');
  assert.equal(plan.count, 2);
  assert.equal(plan.skippedCount, 0);
  assert.deepEqual(plan.changes.map(change => change.before.id).sort(), ['first', 'last']);
  assert.ok(plan.changes.every(change => change.after === null));
  assert.deepEqual(session.snapshot(), before);
  session.applyPlan(plan);
  const after = session.snapshot();
  assert.deepEqual(after.map(n => n.id), ['equal', 'long', 'equal-later']);
  assert.equal(session.canUndoDelete(), false);
  session.undo();
  assert.deepEqual(session.snapshot(), before);
  assert.equal(session.canUndo(), false);
  session.redo();
  assert.deepEqual(session.snapshot(), after);
});

test('short-note thresholds reject coercion and invalid bounds, allowing 0.01 and 2 seconds', () => {
  const session = api().createSession([note('a', 60, 0, .005)], 2);
  for (const threshold of [0, .0099, 2.00001, NaN, Infinity, '.05', null, undefined, false]) {
    rejectsCode(() => session.previewRemoveShort(threshold), 'threshold');
  }
  assert.equal(session.previewRemoveShort(.01).count, 1);
  assert.equal(session.previewRemoveShort(2).count, 1);
  assert.equal(session.canUndo(), false);
});

test('short-note threshold preserves exact decimal equality without hiding a just-shorter interval', () => {
  const session = api().createSession([note('equal', 60, .01, .06), note('shorter', 61, .01, .05999999999999999)], 1);
  assert.deepEqual(session.previewRemoveShort(.05).changes.map(change => change.before.id), ['shorter']);
});

for (const [mode, expectedStart, expectedEnd] of [['start', .1, .86], ['end', .14, .9], ['both', .1, .9]]) {
  test(`seconds-grid ${mode} preview changes only requested boundaries and preserves pitch/provenance`, () => {
    const initial = {...note('manual', 127, .14, .86), origin: 'manual'};
    const session = api().createSession([initial], 2);
    const plan = session.previewQuantize(.1, mode);
    assert.equal(plan.type, 'quantize');
    assert.equal(plan.count, 1);
    assert.equal(plan.skippedCount, 0);
    assert.deepEqual(plan.changes, [{before: initial, after: {...initial, startSeconds: expectedStart, endSeconds: expectedEnd}}]);
    assert.deepEqual(session.snapshot(), [initial]);
    assert.equal(session.dirty(), false);
    session.applyPlan(plan);
    assert.deepEqual(session.snapshot(), [plan.changes[0].after]);
    session.undo();
    assert.deepEqual(session.snapshot(), [initial]);
    session.redo();
    assert.deepEqual(session.snapshot(), [plan.changes[0].after]);
  });
}

test('seconds-grid uses a zero origin, stable decimal grid points and rounds exact halfway values later', () => {
  const session = api().createSession([note('half', 60, .15, .25), note('aligned', 61, .1, .3)], .3);
  const plan = session.previewQuantize(.1, 'both');
  assert.equal(plan.count, 1);
  assert.equal(plan.skippedCount, 0);
  session.applyPlan(plan);
  assert.deepEqual(session.snapshot(), [note('aligned', 61, .1, .3), note('half', 60, .2, .3)]);
});

test('seconds-grid rounds a just-below-half value earlier rather than applying a tolerance', () => {
  const session = api().createSession([note('before-half', 60, .44999999999999996, .86)], 1);
  const plan = session.previewQuantize(.1, 'both');
  assert.equal(plan.changes[0].after.startSeconds, .4);
  assert.equal(plan.changes[0].after.endSeconds, .9);
});

test('a decimal gap just over 0.05 seconds is excluded even when binary addition rounds onto it', () => {
  const session = api().createSession([note('a', 60, 0, .1), note('b', 60, .15000000000000002, .5)], 1);
  assert.deepEqual(session.mergeCandidates('a'), []);
});

test('invalid rounded intervals are skipped whole without clamping or changing their other boundary', () => {
  const initial = [note('collapsed', 60, .11, .12), note('past-end', 61, .14, .98), note('valid', 62, .16, .74)];
  const session = api().createSession(initial, .98);
  const plan = session.previewQuantize(.1, 'both');
  assert.equal(plan.count, 1);
  assert.equal(plan.skippedCount, 2);
  session.applyPlan(plan);
  const after = session.snapshot();
  assert.deepEqual(after.find(n => n.id === 'collapsed'), initial[0]);
  assert.deepEqual(after.find(n => n.id === 'past-end'), initial[1]);
  assert.deepEqual(after.find(n => n.id === 'valid'), {...initial[2], startSeconds: .2, endSeconds: .7});
  session.undo();
  assert.deepEqual(session.snapshot(), initial);
  for (const [mode, fields] of [['start', [.16, .19]], ['end', [.11, .14]]]) {
    const one = api().createSession([note('a', 60, ...fields)], 2);
    const skipped = one.previewQuantize(.1, mode);
    assert.equal(skipped.count, 0);
    assert.equal(skipped.skippedCount, 1);
    assert.equal(one.applyPlan(skipped), null);
    assert.equal(one.canUndo(), false);
  }
});

test('grid and mode inputs have strict finite ranges with no implicit opt-in', () => {
  const session = api().createSession([note()], 2);
  for (const grid of [0, .0099, 1.00001, NaN, Infinity, '.1', null, undefined, false]) {
    rejectsCode(() => session.previewQuantize(grid, 'both'), 'grid');
  }
  for (const mode of ['', 'all', 'off', null, undefined, false]) rejectsCode(() => session.previewQuantize(.1, mode), 'mode');
  assert.equal(session.previewQuantize(.01, 'both').type, 'quantize');
  assert.equal(session.previewQuantize(1, 'both').type, 'quantize');
  assert.deepEqual(session.snapshot(), [note()]);
  assert.equal(session.canUndo(), false);
});

test('plans are session-owned, single-use and reject forged copies without mutation', () => {
  const session = api().createSession([note('a', 60, 0, 1)], 2);
  const foreign = api().createSession([note('a', 60, 0, 1)], 2);
  const plan = session.previewSplit('a', .5);
  for (const forged of [null, undefined, {}, {...plan}, JSON.parse(JSON.stringify(plan)), foreign.previewSplit('a', .5)]) {
    rejectsCode(() => session.applyPlan(forged), 'plan');
  }
  rejectsCode(() => foreign.applyPlan(plan), 'plan');
  assert.deepEqual(session.snapshot(), [note('a', 60, 0, 1)]);
  assert.equal(session.canUndo(), false);
  session.applyPlan(plan);
  const after = session.snapshot();
  rejectsCode(() => session.applyPlan(plan), 'plan');
  assert.deepEqual(session.snapshot(), after);
});

test('tampered plan values, metadata, nested notes and accessor tricks are rejected atomically', () => {
  const mutations = [
    plan => { plan.count = 7; },
    plan => { plan.type = 'remove-short'; },
    plan => { plan.skippedCount = 1; },
    plan => { plan.changes[0].after.pitchMidi = 72; },
    plan => { plan.changes[1].after.id = 'a'; },
    plan => { plan.changes[0].before.startSeconds = .1; },
    plan => { plan.changes.reverse(); },
    plan => { plan.extra = true; },
    plan => { plan.toJSON = () => ({}); },
    plan => { Object.defineProperty(plan.changes[0], 'after', {get() { throw new Error('must not execute'); }}); }
  ];
  for (const mutate of mutations) {
    const session = api().createSession([note('a', 60, 0, 1)], 2);
    const plan = session.previewSplit('a', .5);
    mutate(plan);
    rejectsCode(() => session.applyPlan(plan), 'plan');
    assert.deepEqual(session.snapshot(), [note('a', 60, 0, 1)]);
    assert.equal(session.canUndo(), false);
    assert.equal(session.dirty(), false);
  }
});

test('any actual edit, Undo or Redo invalidates older previews even after exact content restoration', () => {
  const session = api().createSession([note('a', 60, 0, 1)], 2);
  const old = session.previewSplit('a', .5);
  session.update('a', {pitchMidi: 61});
  const beforeUndo = session.previewSplit('a', .5);
  session.undo();
  rejectsCode(() => session.applyPlan(old), 'plan');
  rejectsCode(() => session.applyPlan(beforeUndo), 'plan');
  const beforeRedo = session.previewRemoveShort(2);
  session.redo();
  rejectsCode(() => session.applyPlan(beforeRedo), 'plan');
  assert.deepEqual(session.snapshot(), [note('a', 61, 0, 1)]);
});

test('no-op previews preserve both histories and do not invalidate an unrelated current preview', () => {
  const session = api().createSession([note('a', 60, 0, 1)], 2);
  session.update('a', {pitchMidi: 61});
  session.undo();
  const split = session.previewSplit('a', .5);
  session.markSaved();
  session.update('a', {pitchMidi: 60});
  assert.equal(session.applyPlan(session.previewRemoveShort(.01)), null);
  assert.equal(session.applyPlan(session.previewQuantize(.1, 'both')), null);
  assert.equal(session.dirty(), false);
  assert.equal(session.canUndo(), false);
  assert.equal(session.canRedo(), true);
  session.applyPlan(split);
  assert.equal(session.canRedo(), false);
  assert.equal(session.canUndo(), true);
});

test('mixed cleanup commands preserve saved fingerprints and each consume only one history slot', () => {
  const initial = [note('a', 60, .14, .86), note('short', 72, .2, .22)];
  const session = api().createSession(initial, 2);
  const states = [session.snapshot()];
  session.applyPlan(session.previewSplit('a', .4)); states.push(session.snapshot());
  const secondId = session.snapshot().find(n => n.pitchMidi === 60 && n.id !== 'a').id;
  session.applyPlan(session.previewMerge('a', secondId)); states.push(session.snapshot());
  assert.equal(session.dirty(), false);
  session.applyPlan(session.previewRemoveShort(.05)); states.push(session.snapshot());
  session.markSaved();
  session.applyPlan(session.previewQuantize(.1, 'both')); states.push(session.snapshot());
  assert.equal(session.dirty(), true);
  for (let index = 3; index >= 0; index--) {
    session.undo();
    assert.deepEqual(session.snapshot(), states[index]);
    assert.equal(session.dirty(), index !== 3);
  }
  assert.equal(session.canUndo(), false);
  for (let index = 1; index <= 4; index++) {
    session.redo();
    assert.deepEqual(session.snapshot(), states[index]);
  }
  assert.equal(session.canRedo(), false);
});

test('batch cleanup history holds the latest 100 operations without losing note identities', () => {
  const session = api().createSession([note('a', 60, 0, 1), note('b', 70, 0, 1)], 2);
  const states = [session.snapshot()];
  for (let index = 0; index < 105; index++) {
    if (index % 2 === 0) session.applyPlan(session.previewSplit('a', .5));
    else session.applyPlan(session.previewMerge('a', session.mergeCandidates('a')[0].id));
    states.push(session.snapshot());
  }
  for (let index = 104; index >= 5; index--) {
    session.undo();
    assert.deepEqual(session.snapshot(), states[index]);
  }
  assert.equal(session.canUndo(), false);
  for (let index = 6; index <= 105; index++) {
    session.redo();
    assert.deepEqual(session.snapshot(), states[index]);
  }
  assert.equal(session.canRedo(), false);
});

test('MIDI after cleanup contains precisely the current notes including adjacent split boundaries', () => {
  const {encodeMidi} = require('../src/audio-core.js');
  const {parseMidi} = require('midi-file');
  const session = api().createSession([note('split', 60, .14, .86), note('merge-a', 62, .1, .4),
    note('merge-b', 62, .45, 1), note('tiny', 64, .1, .12)], 2);
  session.applyPlan(session.previewSplit('split', .5));
  session.applyPlan(session.previewMerge('merge-a', 'merge-b'));
  session.applyPlan(session.previewRemoveShort(.05));
  session.applyPlan(session.previewQuantize(.1, 'both'));
  const expected = session.snapshot();
  const midi = parseMidi(encodeMidi(expected));
  let tick = 0;
  const pending = new Map(), actual = [];
  for (const event of midi.tracks[1]) {
    tick += event.deltaTime;
    if (event.type === 'noteOn') {
      assert.equal(event.velocity, 96);
      assert.equal(event.channel, 0);
      assert.equal(pending.has(event.noteNumber), false, 'adjacent split emits prior noteOff first');
      pending.set(event.noteNumber, tick / 960);
    } else if (event.type === 'noteOff') {
      assert.ok(pending.has(event.noteNumber));
      actual.push({pitchMidi: event.noteNumber, startSeconds: pending.get(event.noteNumber), endSeconds: tick / 960});
      pending.delete(event.noteNumber);
    }
  }
  assert.equal(pending.size, 0);
  assert.equal(actual.length, expected.length);
  const sort = (a, b) => a.pitchMidi - b.pitchMidi || a.startSeconds - b.startSeconds;
  actual.sort(sort); expected.sort(sort);
  for (let index = 0; index < expected.length; index++) {
    assert.equal(actual[index].pitchMidi, expected[index].pitchMidi);
    assert.ok(Math.abs(actual[index].startSeconds - expected[index].startSeconds) <= 1 / 960);
    assert.ok(Math.abs(actual[index].endSeconds - expected[index].endSeconds) <= 1 / 960);
  }
  assert.deepEqual(session.snapshot().sort(sort), expected);
});
