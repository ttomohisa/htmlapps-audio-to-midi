/* Local microphone capture. This module never plays, decodes, uploads, or analyzes
 * a recording. The UI must decode the complete Blob before accepting it as input. */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(root);
  else root.AudioMidiRecording = factory(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';
  const MAX_SECONDS = 59, MAX_BYTES = 50 * 1024 * 1024, STOP_TIMEOUT_MS = 5000;
  const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4'];

  function createRecorder(options = {}) {
    const value = (key, fallback) => Object.prototype.hasOwnProperty.call(options, key) ? options[key] : fallback;
    const devices = root.navigator && root.navigator.mediaDevices;
    const getUserMedia = value('getUserMedia', devices && typeof devices.getUserMedia === 'function' ? devices.getUserMedia.bind(devices) : null);
    const Recorder = value('MediaRecorder', root.MediaRecorder);
    const Context = root.AudioContext || root.webkitAudioContext;
    const createContext = value('createContext', Context ? () => new Context() : null);
    const canPlayType = value('canPlayType', type => {
      const audio = root.document && root.document.createElement('audio');
      return audio && typeof audio.canPlayType === 'function' ? audio.canPlayType(type) : '';
    });
    const secure = value('isSecureContext', root.isSecureContext);
    const now = value('now', () => root.performance ? root.performance.now() : Date.now());
    const later = value('setTimeout', root.setTimeout && root.setTimeout.bind(root));
    const cancelLater = value('clearTimeout', root.clearTimeout && root.clearTimeout.bind(root));
    const repeat = value('setInterval', root.setInterval && root.setInterval.bind(root));
    const cancelRepeat = value('clearInterval', root.clearInterval && root.clearInterval.bind(root));
    // Injections can make limits smaller for deterministic tests, never enlarge them.
    const bounded = (n, ceiling) => Number.isFinite(n) && n > 0 ? Math.min(n, ceiling) : ceiling;
    const maxBytes = bounded(options.maxBytes, MAX_BYTES);
    const maxSeconds = bounded(options.maxDurationSeconds, MAX_SECONDS);
    let status = 'idle', elapsedSeconds = 0, level = 0, error = null, mimeType = '', blob = null;
    let generation = 0, current = null;

    function elapsed() {
      return current && current.startedAt !== null && status === 'recording'
        ? Math.max(0, (now() - current.startedAt) / 1000) : elapsedSeconds;
    }
    function snapshot() {return {status, elapsedSeconds:elapsed(), level, error, mimeType, blob};}
    function notify() {
      // An observer failure must never strand an acquired microphone.
      if (typeof options.onChange === 'function') {try {options.onChange(snapshot());} catch (_) {}}
    }
    function live(session) {return current === session && session.generation === generation;}
    function listen(session, target, type, handler, group) {
      target.addEventListener(type, handler);
      session[group].push(() => target.removeEventListener(type, handler));
    }
    function removeAll(list) {for (const remove of list.splice(0)) {try {remove();} catch (_) {}}}
    function disconnect(node) {if (node) {try {node.disconnect();} catch (_) {}}}
    function releaseStream(stream) {
      if (!stream) return;
      try {for (const track of stream.getTracks()) {try {track.stop();} catch (_) {}}} catch (_) {}
    }
    function releaseCapture(session) {
      removeAll(session.trackListeners);
      if (session.tick !== null) cancelRepeat(session.tick);
      if (session.limit !== null) cancelLater(session.limit);
      session.tick = session.limit = null;
      releaseStream(session.stream); session.stream = null;
      disconnect(session.source); disconnect(session.analyser);
      session.source = session.analyser = session.samples = null;
      const context = session.context; session.context = null;
      if (context && context.state !== 'closed') {
        try {Promise.resolve(context.close()).catch(() => {});} catch (_) {}
      }
    }
    function cleanup(session, abort) {
      removeAll(session.recorderListeners);
      if (session.watchdog !== null) cancelLater(session.watchdog);
      session.watchdog = null;
      if (abort && session.recorder && session.recorder.state !== 'inactive') {
        try {session.recorder.stop();} catch (_) {}
      }
      releaseCapture(session);
      session.chunks = []; session.bytes = 0; session.recorder = null;
    }
    function settleStart(session, success) {
      if (session.resolveStart) {const resolve = session.resolveStart; session.resolveStart = null; resolve(success);}
    }
    function settleStop(session, result) {
      if (session.resolveStop) {const resolve = session.resolveStop; session.resolveStop = null; resolve(result);}
    }
    function fail(session, code) {
      if (!live(session)) return;
      elapsedSeconds = elapsed(); generation++; current = null;
      status = 'error'; error = code; blob = null; level = 0;
      cleanup(session, true); settleStart(session, false); settleStop(session, null); notify();
    }
    function microphoneError(reason) {
      const name = reason && reason.name;
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') return 'permissionDenied';
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') return 'noMicrophone';
      if (name === 'NotReadableError' || name === 'TrackStartError') return 'microphoneBusy';
      return 'recordingFailed';
    }
    function playable(type) {
      try {return typeof canPlayType === 'function' && /^(maybe|probably)$/.test(canPlayType(type));} catch (_) {return false;}
    }
    function supportedMime() {
      for (const type of MIME_TYPES) {
        try {if (Recorder.isTypeSupported(type) && playable(type)) return type;} catch (_) {}
      }
      return '';
    }
    function finish(session) {
      if (!live(session)) return;
      if (status !== 'stopping') {fail(session, 'microphoneLost'); return;}
      if (!session.bytes) {fail(session, 'recordingEmpty'); return;}
      let complete;
      try {complete = new root.Blob(session.chunks, {type:mimeType});}
      catch (_) {fail(session, 'recordingFailed'); return;}
      cleanup(session, false); current = null;
      status = 'recorded'; error = null; blob = complete; level = 0;
      settleStart(session, false); settleStop(session, complete); notify();
    }
    function chunk(session, event) {
      if (!live(session) || !event.data || !event.data.size) return;
      if (session.bytes + event.data.size > maxBytes) {fail(session, 'recordingTooLarge'); return;}
      const actualMime = event.data.type || session.recorder.mimeType || mimeType;
      if (!playable(actualMime)) {fail(session, 'recordingUnsupported'); return;}
      mimeType = actualMime;
      session.chunks.push(event.data); session.bytes += event.data.size;
      if (session.bytes >= maxBytes && status === 'recording') stop();
    }
    function meter(session) {
      if (!live(session) || status !== 'recording') return;
      if (elapsed() >= maxSeconds) {stop(); return;}
      try {
        session.analyser.getFloatTimeDomainData(session.samples);
        let sum = 0;
        for (const sample of session.samples) sum += sample * sample;
        const rms = Math.sqrt(sum / session.samples.length);
        level = Number.isFinite(rms) ? Math.min(1, Math.max(0, rms)) : 0;
      } catch (_) {level = 0;}
      notify();
    }
    function acquire(session, stream) {
      if (!live(session)) {releaseStream(stream); return;}
      session.stream = stream;
      try {
        const tracks = stream.getAudioTracks();
        if (!tracks.length || tracks.some(track => track.readyState !== 'live')) {fail(session, 'noMicrophone'); return;}
        for (const track of tracks) listen(session, track, 'ended', () => fail(session, 'microphoneLost'), 'trackListeners');
        const recorder = session.recorder = new Recorder(stream, {mimeType});
        mimeType = recorder.mimeType || mimeType;
        if (!playable(mimeType)) {fail(session, 'recordingUnsupported'); return;}
        listen(session, recorder, 'dataavailable', event => chunk(session, event), 'recorderListeners');
        listen(session, recorder, 'stop', () => finish(session), 'recorderListeners');
        listen(session, recorder, 'error', () => fail(session, 'recordingFailed'), 'recorderListeners');
        const context = session.context = createContext();
        session.source = context.createMediaStreamSource(stream);
        session.analyser = context.createAnalyser(); session.analyser.fftSize = 512;
        session.samples = new Float32Array(session.analyser.fftSize);
        // This analysis-only graph must NEVER connect to context.destination.
        session.source.connect(session.analyser);
        if (context.state !== 'running') {
          // Capture does not wait on speaker/autoplay permission. A suspended meter
          // may stay silent; no output graph or automatic playback is ever created.
          try {Promise.resolve(context.resume()).catch(() => {});} catch (_) {}
        }
        session.startedAt = now(); status = 'recording';
        recorder.start(250);
        if (!live(session)) return;
        session.limit = later(() => {if (live(session)) stop();}, maxSeconds * 1000);
        session.tick = repeat(() => meter(session), 100);
        settleStart(session, true); notify();
      } catch (reason) {
        fail(session, reason && reason.name === 'NotSupportedError' ? 'recordingUnsupported' : 'recordingFailed');
      }
    }
    function start() {
      if (status === 'disposed' || status === 'stopping') return Promise.resolve(false);
      if (current) return current.startPromise;
      let unavailable = !secure ? 'insecureContext' : typeof getUserMedia !== 'function' ? 'microphoneUnavailable'
        : typeof Recorder !== 'function' ? 'recorderUnavailable' : typeof createContext !== 'function' ? 'audioContextUnavailable' : null;
      const selected = unavailable ? '' : supportedMime();
      if (!unavailable && !selected) unavailable = 'recordingUnsupported';
      if (unavailable) {
        status = 'error'; error = unavailable; blob = null; mimeType = ''; elapsedSeconds = level = 0; notify();
        return Promise.resolve(false);
      }
      const session = {
        generation:++generation, startedAt:null, stream:null, recorder:null, context:null, source:null, analyser:null, samples:null,
        chunks:[], bytes:0, tick:null, limit:null, watchdog:null, trackListeners:[], recorderListeners:[],
        startPromise:null, resolveStart:null, stopPromise:null, resolveStop:null
      };
      session.startPromise = new Promise(resolve => {session.resolveStart = resolve;});
      current = session; status = 'requesting'; error = null; blob = null; mimeType = selected; elapsedSeconds = level = 0;
      notify();
      if (live(session)) {
        // The only permission request in this module is made from explicit start().
        // Prefer unprocessed musical input; unsupported ideal constraints may be ignored.
        try {Promise.resolve(getUserMedia({audio:{echoCancellation:{ideal:false},noiseSuppression:{ideal:false},autoGainControl:{ideal:false}}, video:false})).then(stream => acquire(session, stream), reason => fail(session, microphoneError(reason)));}
        catch (reason) {fail(session, microphoneError(reason));}
      }
      return session.startPromise;
    }
    function reset(nextStatus) {
      const session = current; generation++; current = null;
      status = nextStatus; elapsedSeconds = level = 0; error = null; mimeType = ''; blob = null;
      if (session) {cleanup(session, true); settleStart(session, false); settleStop(session, null);}
      notify();
    }
    function stop() {
      if (status === 'requesting') {reset('idle'); return Promise.resolve(null);}
      if (!current) return Promise.resolve(status === 'recorded' ? blob : null);
      const session = current;
      if (session.stopPromise) return session.stopPromise;
      session.stopPromise = new Promise(resolve => {session.resolveStop = resolve;});
      const pending = session.stopPromise;
      elapsedSeconds = elapsed(); status = 'stopping'; level = 0;
      // Detach ended listeners before deliberately stopping tracks. Preserve only
      // recorder listeners until native final dataavailable -> stop has completed.
      removeAll(session.trackListeners);
      session.watchdog = later(() => fail(session, 'recordingStopTimeout'), STOP_TIMEOUT_MS);
      try {if (session.recorder.state !== 'inactive') session.recorder.stop();}
      catch (_) {fail(session, 'recordingFailed'); return pending;}
      releaseCapture(session);
      if (live(session)) notify();
      return pending;
    }
    function discard() {if (status !== 'disposed') reset('idle');}
    function dispose() {if (status !== 'disposed') reset('disposed');}
    return {snapshot, start, stop, discard, dispose};
  }
  return {createRecorder, MAX_SECONDS, MAX_BYTES};
});
