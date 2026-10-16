/* Web Audio transport. Playback and MIDI consume the same normalized note seconds.
 * The decoded original AudioBuffer is kept intact: no mono mix or resampling here. */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.AudioMidiPlayback = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const LOOKAHEAD_SECONDS = 0.15, TICK_MS = 25;

  function createPlayer(options = {}) {
    const createContext = options.createContext || (() => {
      const Constructor = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Constructor) throw new Error('Web Audio is unavailable');
      return new Constructor();
    });
    let buffer = null, notes = [], mode = 'original', status = 'empty', position = 0, duration = 0;
    let context = null, master = null, timer = null, pendingPlay = null, generation = 0;
    let anchorTime = 0, anchorPosition = 0, nextNote = 0, volume = 0.7;
    const sources = new Set();

    function cursor() {
      return status === 'playing' && context
        ? Math.min(duration, anchorPosition + Math.max(0, context.currentTime - anchorTime)) : position;
    }
    function snapshot() { return {mode, status, position:cursor(), duration, activeSources:sources.size}; }
    function notify() { if (options.onChange) options.onChange(snapshot()); }
    function disconnect(node) { if (node) { try { node.disconnect(); } catch (_) {} } }
    function release(entry, stop) {
      entry.source.onended = null;
      if (stop) { try { entry.source.stop(context ? context.currentTime : 0); } catch (_) {} }
      disconnect(entry.source); disconnect(entry.gain); sources.delete(entry);
    }
    function closeContext() {
      disconnect(master); master = null;
      const previous = context; context = null;
      if (previous && previous.state !== 'closed') {
        try { Promise.resolve(previous.close()).catch(() => {}); } catch (_) {}
      }
    }
    function interrupt(close) {
      position = cursor();
      // Invalidate before stopping: old onended/resume callbacks cannot mutate a new run.
      generation++; pendingPlay = null;
      if (timer !== null) { clearInterval(timer); timer = null; }
      for (const entry of sources) release(entry, true);
      if (close) closeContext();
    }
    function finish() {
      interrupt(true); position = duration; status = 'ended'; notify();
    }
    function checkedNotes(value, clipDuration) {
      if (!Array.isArray(value) || value.some(n => !n || !Number.isInteger(n.pitchMidi) || n.pitchMidi < 0 || n.pitchMidi > 127 ||
          !Number.isFinite(n.startSeconds) || !Number.isFinite(n.endSeconds) || n.startSeconds < 0 ||
          n.endSeconds <= n.startSeconds || n.endSeconds > clipDuration)) throw new Error('Expected normalized notes');
      // Sorting a shallow copy leaves the caller's note identities and exact timings intact.
      return value.slice().sort((a, b) => a.startSeconds - b.startSeconds || a.pitchMidi - b.pitchMidi);
    }
    function scheduleNotes() {
      const now = context.currentTime, horizon = Math.min(duration, cursor() + LOOKAHEAD_SECONDS);
      while (nextNote < notes.length && notes[nextNote].startSeconds < horizon) {
        const note = notes[nextNote++];
        const end = anchorTime + note.endSeconds - anchorPosition;
        if (end <= now) continue; // A throttled tab must never replay already expired notes.
        const start = Math.max(now, anchorTime + note.startSeconds - anchorPosition);
        const source = context.createOscillator(), entry = {source, gain:null};
        sources.add(entry);
        const gain = entry.gain = context.createGain();
        source.type = 'triangle';
        source.frequency.setValueAtTime(440 * Math.pow(2, (note.pitchMidi - 69) / 12), start);
        source.connect(gain); gain.connect(master);
        const length = end - start, attack = Math.min(0.008, length / 4), releaseTime = Math.min(0.02, length / 4);
        const peak = 0.1 * (Number.isFinite(note.velocity) ? Math.min(127, Math.max(1, note.velocity)) : 96) / 127;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(peak, start + attack);
        gain.gain.setValueAtTime(peak, end - releaseTime);
        gain.gain.linearRampToValueAtTime(0, end);
        source.onended = () => release(entry, false);
        source.start(start); source.stop(end);
      }
    }
    function begin() {
      anchorTime = context.currentTime; anchorPosition = position; nextNote = 0; status = 'playing';
      if (!master) { master = context.createGain(); master.gain.setValueAtTime(volume, anchorTime); master.connect(context.destination); }
      const token = generation;
      if (mode === 'original') {
        const source = context.createBufferSource(), entry = {source, gain:null};
        sources.add(entry); source.buffer = buffer; source.connect(master);
        source.onended = () => { if (token === generation && status === 'playing') finish(); };
        source.start(anchorTime, position);
      } else scheduleNotes();
      timer = setInterval(() => {
        if (token !== generation || status !== 'playing') return;
        if (cursor() >= duration) { finish(); return; }
        if (mode === 'synth') scheduleNotes();
        notify();
      }, TICK_MS);
    }
    function play() {
      if (!buffer || status === 'disposed') return Promise.resolve(false);
      if (status === 'playing') return Promise.resolve(true);
      if (pendingPlay) return pendingPlay;
      if (position >= duration) position = 0;
      const token = ++generation;
      status = 'starting';
      let resumed;
      try {
        context = createContext();
        // Call resume synchronously from the user's Play event before awaiting it.
        resumed = context.state === 'running' ? undefined : context.resume();
      } catch (error) { resumed = Promise.reject(error); }
      pendingPlay = Promise.resolve(resumed).then(() => {
        if (token !== generation || status !== 'starting') return false;
        begin(); pendingPlay = null; notify(); return true;
      }).catch(error => {
        if (token !== generation) return false;
        interrupt(true); status = 'paused'; notify(); throw error;
      });
      notify(); return pendingPlay;
    }
    function load(nextBuffer, nextNotes = []) {
      if (status === 'disposed') return;
      const nextDuration = nextBuffer ? nextBuffer.duration : 0;
      if (nextBuffer && (!Number.isFinite(nextDuration) || nextDuration <= 0)) throw new Error('Invalid original AudioBuffer');
      const validated = checkedNotes(nextNotes, nextDuration);
      interrupt(true); buffer = nextBuffer; notes = validated; duration = nextDuration; position = 0;
      status = buffer ? 'stopped' : 'empty'; notify();
    }
    // Seek/mode/note changes can continue an already-running context. A pending
    // resume is cancelled instead: a later completion must not cause autoplay.
    function replaceWhilePlaying(change) {
      const previousStatus = status, playing = status === 'playing';
      interrupt(!playing); change();
      if (playing && position < duration) {
        try { begin(); } catch (error) { interrupt(true); status = 'paused'; notify(); throw error; }
      } else if (buffer) {
        closeContext(); status = position >= duration ? 'ended' : previousStatus === 'stopped' ? 'stopped' : 'paused';
      }
      notify();
    }
    function setNotes(nextNotes) {
      if (status === 'disposed') return;
      const validated = checkedNotes(nextNotes, duration);
      replaceWhilePlaying(() => { notes = validated; });
    }
    function setMode(nextMode) {
      if (nextMode !== 'original' && nextMode !== 'synth') throw new Error('Unknown playback mode');
      if (status === 'disposed' || nextMode === mode) return;
      replaceWhilePlaying(() => { mode = nextMode; });
    }
    function seek(seconds) {
      if (status === 'disposed' || !buffer || !Number.isFinite(seconds)) return;
      replaceWhilePlaying(() => { position = Math.min(duration, Math.max(0, seconds)); });
    }
    function pause() {
      if (status !== 'playing' && status !== 'starting') return;
      interrupt(true); status = 'paused'; notify();
    }
    function stop() {
      if (status === 'disposed') return;
      interrupt(true); position = 0; status = buffer ? 'stopped' : 'empty'; notify();
    }
    function setVolume(value) {
      if (!Number.isFinite(value) || status === 'disposed') return;
      volume = Math.min(1, Math.max(0, value));
      if (master) master.gain.setTargetAtTime(volume, context.currentTime, 0.01);
    }
    function dispose() {
      if (status === 'disposed') return;
      interrupt(true); buffer = null; notes = []; duration = 0; position = 0; status = 'disposed'; notify();
    }
    return Object.freeze({load, setNotes, setMode, play, pause, stop, seek, setVolume, dispose, snapshot});
  }
  return Object.freeze({createPlayer});
});
