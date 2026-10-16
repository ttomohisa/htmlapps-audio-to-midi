/* Pure detection settings shared by the page and its embedded inference worker. */
const AudioMidiSettings = (() => {
  // These presets are a reproducible sensitivity choice, not an accuracy claim.
  // Basic Pitch 1.0.1 emits 88 pitch bins: MIDI 21 (A0) through 108 (C8).
  const presets = Object.freeze({
    fewer: Object.freeze({onsetThreshold: .7, frameThreshold: .5, minDurationSeconds: .12, minPitchMidi: 21, maxPitchMidi: 108}),
    standard: Object.freeze({onsetThreshold: .5, frameThreshold: .3, minDurationSeconds: .059, minPitchMidi: 21, maxPitchMidi: 108}),
    more: Object.freeze({onsetThreshold: .3, frameThreshold: .15, minDurationSeconds: .03, minPitchMidi: 21, maxPitchMidi: 108}),
  });

  function invalid(field, message) {
    const error = new RangeError(message);
    error.code = 'invalidSettings';
    error.field = field;
    throw error;
  }

  function validate(input = {}) {
    if (input === null || typeof input !== 'object' || Array.isArray(input)) {
      invalid('settings', 'Detection settings must be an object.');
    }
    const result = {};
    for (const field of Object.keys(presets.standard)) {
      result[field] = Object.prototype.hasOwnProperty.call(input, field) ? input[field] : presets.standard[field];
    }
    for (const field of ['onsetThreshold', 'frameThreshold']) {
      if (!Number.isFinite(result[field]) || result[field] < 0 || result[field] > 1) {
        invalid(field, 'Detection thresholds must be finite numbers from 0 to 1.');
      }
    }
    if (!Number.isFinite(result.minDurationSeconds) || result.minDurationSeconds < .01 || result.minDurationSeconds > 2) {
      invalid('minDurationSeconds', 'Minimum note duration must be from 0.01 to 2 seconds.');
    }
    for (const field of ['minPitchMidi', 'maxPitchMidi']) {
      if (!Number.isInteger(result[field]) || result[field] < 0 || result[field] > 127) {
        invalid(field, 'Pitch bounds must be integer MIDI numbers from 0 to 127.');
      }
    }
    if (result.minPitchMidi > result.maxPitchMidi) {
      invalid('pitchRange', 'The lower pitch bound must not exceed the upper bound.');
    }
    return result;
  }

  function minNoteLengthFrames(input) {
    // The pinned postprocessor rejects lengths <= minNoteLen. Use its actual
    // 256-sample hop, not the rounded 86 fps used to trim inference output.
    // 0.059 seconds preserves the original cutoff of 5 frames and retains
    // six-frame notes shortened to ~0.05933s by the official window correction.
    return Math.max(0, Math.ceil(validate(input).minDurationSeconds * 22050 / 256) - 1);
  }

  return Object.freeze({presets, validate, minNoteLengthFrames});
})();
if (typeof window !== 'undefined') window.AudioMidiSettings = AudioMidiSettings;
if (typeof module !== 'undefined' && module.exports) module.exports = AudioMidiSettings;
