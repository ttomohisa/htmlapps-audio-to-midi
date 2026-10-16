/* Pure session-owned note editing. Source seconds are never rounded or clamped. */
const AudioMidiEditing = (() => {
  const VELOCITY = 96, DELETE_HISTORY_LIMIT = 100;
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
    // v0.4 has fixed velocity and no pitch-bend support. Do not carry stale bends
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
    let nextManualId = 1, saved = fingerprint(working);
    const deleted = [];

    function update(id, fields) {
      const index = working.findIndex(note => note.id === id);
      if (index < 0) return null;
      if (!isRecord(fields)) invalid('notes', 'Note changes must be an object.');
      const current = working[index], changed = copyNote(current);
      for (const field of EDITABLE_FIELDS) if (owns(fields, field)) changed[field] = fields[field];
      validateNote(changed, duration);
      if (EDITABLE_FIELDS.every(field => current[field] === changed[field])) return null;
      working[index] = Object.freeze(changed);
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
      return copyNote(added);
    }

    function remove(id) {
      const index = working.findIndex(note => note.id === id);
      if (index < 0) return null;
      const removed = working.splice(index, 1)[0];
      deleted.push(removed);
      if (deleted.length > DELETE_HISTORY_LIMIT) deleted.shift();
      return copyNote(removed);
    }

    function undoDelete() {
      if (!deleted.length) return null;
      const restored = deleted.pop();
      working.push(restored);
      return copyNote(restored);
    }

    return Object.freeze({
      snapshot: () => working.slice().sort(compareNotes).map(copyNote),
      originalNotes: () => original,
      update, add, remove, undoDelete,
      canUndoDelete: () => deleted.length > 0,
      markSaved: () => { saved = fingerprint(working); },
      dirty: () => fingerprint(working) !== saved
    });
  }

  return Object.freeze({createSession, parsePitch});
})();
if (typeof window !== 'undefined') window.AudioMidiEditing = AudioMidiEditing;
if (typeof module !== 'undefined' && module.exports) module.exports = AudioMidiEditing;
