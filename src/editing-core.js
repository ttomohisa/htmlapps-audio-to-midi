/* Pure session-owned note editing. Seconds are never implicitly rounded or clamped. */
const AudioMidiEditing = (() => {
  const VELOCITY = 96, HISTORY_LIMIT = 100, MERGE_GAP_SECONDS = .05;
  const EDITABLE_FIELDS = ['pitchMidi', 'startSeconds', 'endSeconds'];
  const owns = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

  function invalid(code, message) {
    const error = new Error(message);
    error.code = code;
    throw error;
  }

  function validatePitch(value) {
    if (!Number.isInteger(value) || value < 0 || value > 127) {
      invalid('pitch', 'Pitch must be an integer MIDI number from 0 to 127.');
    }
    return value;
  }

  function parsePitch(value) {
    if (typeof value === 'number') return validatePitch(value);
    if (typeof value !== 'string') invalid('pitch', 'Enter a MIDI number or note name such as C4.');
    const text = value.trim();
    if (/^[+-]?\d+$/.test(text)) return validatePitch(Number(text));
    const match = /^([a-g])([#♯b♭]?)([+-]?\d+)$/i.exec(text);
    if (!match) invalid('pitch', 'Enter a MIDI number or note name such as C4.');
    const semitone = {C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11}[match[1].toUpperCase()];
    const accidental = match[2] === '#' || match[2] === '♯' ? 1 : match[2] ? -1 : 0;
    return validatePitch((Number(match[3]) + 1) * 12 + semitone + accidental);
  }

  function validateNote(note, duration) {
    validatePitch(note.pitchMidi);
    if (!Number.isFinite(note.startSeconds) || !Number.isFinite(note.endSeconds) ||
        note.startSeconds < 0 || note.startSeconds >= note.endSeconds || note.endSeconds > duration) {
      invalid('time', 'Note times must satisfy 0 ≤ start < end ≤ audio duration.');
    }
  }

  function copyNote(note) {
    // The editing model has fixed velocity and no pitch-bend support. Do not carry stale bends
    // or arbitrary source metadata into the editable/exported note model.
    return {id: note.id, pitchMidi: note.pitchMidi, startSeconds: note.startSeconds,
      endSeconds: note.endSeconds, velocity: VELOCITY, origin: note.origin};
  }

  function compareNotes(a, b) {
    return a.startSeconds - b.startSeconds || a.pitchMidi - b.pitchMidi ||
      a.endSeconds - b.endSeconds || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  }

  function fingerprint(notes) {
    // Identity and origin are not exported. Preserve duplicate counts and exact
    // seconds, but disregard view order and replacement with an equivalent note.
    return JSON.stringify(notes.slice().sort(compareNotes).map(note =>
      [note.pitchMidi, note.startSeconds, note.endSeconds, VELOCITY]));
  }

  function sameData(actual, expected) {
    if (actual === null || expected === null || typeof actual !== 'object' || typeof expected !== 'object') {
      return Object.is(actual, expected);
    }
    if (Object.getPrototypeOf(actual) !== Object.getPrototypeOf(expected)) return false;
    const actualKeys = Reflect.ownKeys(actual), expectedKeys = Reflect.ownKeys(expected);
    if (actualKeys.length !== expectedKeys.length) return false;
    return expectedKeys.every(key => {
      const descriptor = Object.getOwnPropertyDescriptor(actual, key);
      // A preview must remain plain data. Do not invoke a modified accessor or
      // toJSON hook while validating the values the user actually reviewed.
      return descriptor && owns(descriptor, 'value') && sameData(descriptor.value, expected[key]);
    });
  }

  function decimalUnits(values) {
    // Compare the exact decimal values users can inspect, without cancellation
    // (0.35 - 0.3 < 0.05) or a tolerance that hides genuinely shorter notes.
    // This never rounds or changes stored source seconds.
    const parts = values.map(value => {
      const [coefficient, exponent = '0'] = String(value).split('e');
      const [whole, fraction = ''] = coefficient.split('.');
      return {integer: BigInt(whole + fraction), exponent: Number(exponent) - fraction.length};
    });
    const exponent = Math.min(...parts.map(part => part.exponent));
    return {exponent, units: parts.map(part => part.integer * 10n ** BigInt(part.exponent - exponent))};
  }

  function compareDuration(start, end, limit) {
    const {units: [first, last, threshold]} = decimalUnits([start, end, limit]);
    return last - first - threshold;
  }

  function roundToGrid(seconds, grid) {
    const {exponent, units: [time, spacing]} = decimalUnits([seconds, grid]);
    // Integer division makes exact halfway points round later, while values
    // genuinely below halfway still round earlier. Convert only the final
    // decimal grid point to Number, avoiding 3 * 0.1 floating-point overflow.
    const step = (time * 2n + spacing) / (spacing * 2n);
    return Number(`${step * spacing}e${exponent}`);
  }

  function createSession(notes, duration) {
    if (!Number.isFinite(duration) || duration <= 0) invalid('time', 'Audio duration must be a positive finite number.');
    if (!Array.isArray(notes)) invalid('notes', 'Notes must be an array.');
    const issuedIds = new Set();
    const original = Object.freeze(Array.from(notes, note => {
      if (!isRecord(note) || typeof note.id !== 'string' || !note.id.trim() || issuedIds.has(note.id) ||
          (note.origin !== undefined && note.origin !== 'detected' && note.origin !== 'manual')) {
        invalid('notes', 'Notes must have unique IDs and a supported origin.');
      }
      validateNote(note, duration);
      issuedIds.add(note.id);
      return Object.freeze(copyNote({...note, origin: note.origin || 'detected'}));
    }));
    const working = original.slice();
    let nextManualId = 1, nextSplitId = 1, revision = 0, saved = fingerprint(working);
    const undoHistory = [], redoHistory = [];
    const plans = new WeakMap();

    function recordCommand(command) {
      undoHistory.push(command);
      if (undoHistory.length > HISTORY_LIMIT) undoHistory.shift();
      redoHistory.length = 0;
      revision++;
    }

    function record(type, index, before, after) {
      // Each command retains only affected immutable versions, not the score.
      recordCommand(Object.freeze({type, beforeFocus: before || after, afterFocus: after || before,
        edits: Object.freeze([Object.freeze({index, before, after})])}));
    }

    function replay(command, reverse) {
      const edits = reverse ? command.edits.slice().reverse() : command.edits;
      for (const edit of edits) {
        const before = reverse ? edit.after : edit.before;
        const after = reverse ? edit.before : edit.after;
        // LIFO replay restores exact positions even across compound commands.
        working.splice(edit.index, before ? 1 : 0, ...(after ? [after] : []));
      }
      return copyNote(reverse ? command.beforeFocus : command.afterFocus);
    }

    function undo() {
      if (!undoHistory.length) return null;
      const command = undoHistory.pop();
      const changed = replay(command, true);
      redoHistory.push(command);
      revision++;
      return changed;
    }

    function redo() {
      if (!redoHistory.length) return null;
      const command = redoHistory.pop();
      const changed = replay(command, false);
      undoHistory.push(command);
      revision++;
      return changed;
    }

    function update(id, fields) {
      const index = working.findIndex(note => note.id === id);
      if (index < 0) return null;
      if (!isRecord(fields)) invalid('notes', 'Note changes must be an object.');
      const current = working[index], changed = copyNote(current);
      for (const field of EDITABLE_FIELDS) if (owns(fields, field)) changed[field] = fields[field];
      validateNote(changed, duration);
      if (EDITABLE_FIELDS.every(field => current[field] === changed[field])) return null;
      working[index] = Object.freeze(changed);
      record('update', index, current, working[index]);
      return copyNote(changed);
    }

    function add(fields) {
      if (!isRecord(fields)) invalid('notes', 'A note must be an object.');
      validateNote(fields, duration);
      let id;
      do { id = `manual-${nextManualId++}`; } while (issuedIds.has(id));
      issuedIds.add(id);
      const added = Object.freeze(copyNote({...fields, id, origin: 'manual'}));
      working.push(added);
      record('add', working.length - 1, null, added);
      return copyNote(added);
    }

    function remove(id) {
      const index = working.findIndex(note => note.id === id);
      if (index < 0) return null;
      const removed = working.splice(index, 1)[0];
      record('remove', index, removed, null);
      return copyNote(removed);
    }

    function makePlan(type, changes, skippedCount = 0) {
      const copyChanges = () => changes.map(change => ({
        before: change.before ? copyNote(change.before) : null,
        after: change.after ? copyNote(change.after) : null
      }));
      const plan = {type, count: changes.filter(change => change.before).length, skippedCount, changes: copyChanges()};
      const expected = {type, count: plan.count, skippedCount, changes: copyChanges()};
      const indexes = new Map(working.map((note, index) => [note.id, index]));
      const edits = changes.map(change => {
        if (change.after) validateNote(change.after, duration);
        return Object.freeze({index: change.before ? indexes.get(change.before.id) : working.length,
          before: change.before ? Object.freeze(copyNote(change.before)) : null,
          after: change.after ? Object.freeze(copyNote(change.after)) : null});
      }).sort((a, b) => b.index - a.index);
      // Descending positions keep removals from shifting any remaining edit.
      // Undo reverses this order, restoring the original exact note versions.
      const first = changes[0];
      const command = first ? Object.freeze({type, edits: Object.freeze(edits),
        beforeFocus: Object.freeze(copyNote(first.before || first.after)),
        afterFocus: Object.freeze(copyNote(first.after || first.before))}) : null;
      plans.set(plan, {revision, expected, command});
      return plan;
    }

    function previewSplit(id, seconds) {
      const current = working.find(note => note.id === id);
      if (!current) return null;
      if (!Number.isFinite(seconds) || seconds <= current.startSeconds || seconds >= current.endSeconds) {
        invalid('split', 'Choose a split time strictly inside the selected note.');
      }
      let splitId;
      do { splitId = `split-${nextSplitId++}`; } while (issuedIds.has(splitId));
      // Reserve preview IDs too: cancelled plans and abandoned Redo branches
      // can never cause a future note to reuse a previous identity.
      issuedIds.add(splitId);
      return makePlan('split', [
        {before: current, after: {...current, endSeconds: seconds}},
        {before: null, after: {...current, id: splitId, startSeconds: seconds}}
      ]);
    }

    function mergeCandidates(id) {
      const current = working.find(note => note.id === id);
      if (!current) return [];
      const samePitch = working.filter(note => note.pitchMidi === current.pitchMidi).sort(compareNotes);
      const index = samePitch.findIndex(note => note.id === id);
      return [samePitch[index - 1], samePitch[index + 1]].filter(other => {
        if (!other) return false;
        const [left, right] = compareNotes(current, other) < 0 ? [current, other] : [other, current];
        return right.startSeconds >= left.endSeconds && compareDuration(left.endSeconds, right.startSeconds, MERGE_GAP_SECONDS) <= 0n;
      }).map(copyNote);
    }

    function previewMerge(id, otherId) {
      const current = working.find(note => note.id === id), other = working.find(note => note.id === otherId);
      if (!current || !other) return null;
      if (!mergeCandidates(id).some(note => note.id === otherId)) {
        invalid('merge', 'Choose an adjacent, non-overlapping note of the same pitch with a gap of at most 0.05 seconds.');
      }
      return makePlan('merge', [
        {before: current, after: {...current, startSeconds: Math.min(current.startSeconds, other.startSeconds),
          endSeconds: Math.max(current.endSeconds, other.endSeconds)}},
        {before: other, after: null}
      ]);
    }

    function previewRemoveShort(threshold) {
      if (!Number.isFinite(threshold) || threshold < .01 || threshold > 2) {
        invalid('threshold', 'The short-note threshold must be from 0.01 to 2 seconds.');
      }
      const changes = working.filter(note => compareDuration(note.startSeconds, note.endSeconds, threshold) < 0n)
        .sort(compareNotes).map(before => ({before, after: null}));
      return makePlan('remove-short', changes);
    }

    function previewQuantize(grid, mode) {
      if (!Number.isFinite(grid) || grid < .01 || grid > 1) invalid('grid', 'The seconds grid must be from 0.01 to 1 second.');
      if (!['start', 'end', 'both'].includes(mode)) invalid('mode', 'Choose start, end or both boundaries.');
      const changes = [];
      let skippedCount = 0;
      for (const before of working.slice().sort(compareNotes)) {
        const after = copyNote(before);
        if (mode === 'start' || mode === 'both') after.startSeconds = roundToGrid(before.startSeconds, grid);
        if (mode === 'end' || mode === 'both') after.endSeconds = roundToGrid(before.endSeconds, grid);
        if (!Number.isFinite(after.startSeconds) || !Number.isFinite(after.endSeconds) ||
            after.startSeconds < 0 || after.startSeconds >= after.endSeconds || after.endSeconds > duration) {
          skippedCount++;
          continue;
        }
        if (before.startSeconds !== after.startSeconds || before.endSeconds !== after.endSeconds) changes.push({before, after});
      }
      return makePlan('quantize', changes, skippedCount);
    }

    function applyPlan(plan) {
      const registered = plans.get(plan);
      let intact = false;
      if (registered && registered.revision === revision) {
        try { intact = sameData(plan, registered.expected); } catch (_) { /* Modified non-data previews are invalid. */ }
      }
      if (!intact || registered.revision !== revision) invalid('plan', 'This preview changed or expired. Preview the operation again.');
      plans.delete(plan);
      if (!registered.command) return null;
      // Everything was validated before any mutation. Only private immutable
      // command data is applied; no caller-owned preview value is trusted.
      const changed = replay(registered.command, false);
      recordCommand(registered.command);
      return changed;
    }

    // Legacy deletion Undo must never jump over a newer edit in the shared
    // history. Callers needing general Undo should use undo()/canUndo().
    const canUndoDelete = () => undoHistory.length > 0 && undoHistory[undoHistory.length - 1].type === 'remove';
    const undoDelete = () => canUndoDelete() ? undo() : null;

    return Object.freeze({
      snapshot: () => working.slice().sort(compareNotes).map(copyNote),
      originalNotes: () => original,
      update, add, remove, undo, redo, undoDelete, canUndoDelete,
      previewSplit, mergeCandidates, previewMerge, previewRemoveShort, previewQuantize, applyPlan,
      canUndo: () => undoHistory.length > 0,
      canRedo: () => redoHistory.length > 0,
      markSaved: () => { saved = fingerprint(working); },
      dirty: () => fingerprint(working) !== saved
    });
  }

  return Object.freeze({createSession, parsePitch});
})();
if (typeof window !== 'undefined') window.AudioMidiEditing = AudioMidiEditing;
if (typeof module !== 'undefined' && module.exports) module.exports = AudioMidiEditing;
