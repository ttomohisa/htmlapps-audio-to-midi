/* Pure, shared audio input/note/export contracts. No browser, model, or network side effects. */
const AudioMidiCore = (() => {
  const SAMPLE_RATE = 22050, PPQ = 480, TICKS_PER_SECOND = 960;
  function buildWorkerSource(tfSource,midiSource,postSource,inferenceSource) {
    // TF.js 3.21's legacy regenerator assigns this name in strict mode. Declare it
    // first so it never takes its Function-constructor fallback under our CSP.
    return 'var regeneratorRuntime;\n'+tfSource+'\n'+midiSource+'\nconst BasicPitchPostprocess=(()=>{const exports={};const require=id=>{if(id!=="@tonejs/midi")throw new Error("Unknown module");return {Midi:self.Midi};};\n'+postSource+'\nreturn exports;})();\n'+inferenceSource;
  }
  function validateFile(file) {
    if (!file || !Number.isFinite(file.size) || file.size <= 0) return 'emptyFile';
    if (file.size > 50 * 1024 * 1024) return 'fileTooLarge';
    if (!/\.(wav|mp3|m4a|aac|ogg|flac|webm)$/i.test(file.name)) return 'unsupportedFormat';
    return null;
  }
  function validateDuration(duration) {
    return Number.isFinite(duration) && duration >= 0.5 && duration <= 60 ? null : 'invalidDuration';
  }
  function mixChannels(channels) {
    if (!channels.length || !channels[0].length || channels.some(c => c.length !== channels[0].length)) throw new Error('Invalid PCM channels');
    const output = new Float32Array(channels[0].length);
    for (let i = 0; i < output.length; i++) {
      let total = 0;
      for (const channel of channels) {
        if (!Number.isFinite(channel[i])) throw new Error('Invalid PCM sample');
        total += channel[i];
      }
      output[i] = total / channels.length;
    }
    return output;
  }
  function validNote(n) {
    return Number.isInteger(n.pitchMidi) && n.pitchMidi >= 0 && n.pitchMidi <= 127 &&
      Number.isFinite(n.startSeconds) && Number.isFinite(n.endSeconds) &&
      n.startSeconds >= 0 && n.endSeconds > n.startSeconds;
  }
  function normalizeNotes(rows, duration) {
    if (!Number.isFinite(duration) || duration <= 0) return [];
    return rows.filter(validNote).map(n => ({...n, endSeconds:Math.min(n.endSeconds,duration)}))
      .filter(n => n.endSeconds > n.startSeconds)
      .sort((a,b) => a.startSeconds-b.startSeconds || a.pitchMidi-b.pitchMidi || a.endSeconds-b.endSeconds)
      .map((n,i) => ({id:`detected-${i}`,pitchMidi:n.pitchMidi,startSeconds:n.startSeconds,endSeconds:n.endSeconds,velocity:96,origin:'detected'}));
  }
  function createGeneration() {
    let generation = 0;
    return Object.freeze({next:() => ++generation,capture:() => generation,isCurrent:token => token === generation});
  }
  function safeExportName(value, extension) {
    // A shared name survives format changes. Remove only known export suffixes;
    // retain Japanese and meaningful periods elsewhere in the user's name.
    const stripSuffix = name => name.replace(/[. ]+$/g,'').replace(/(?:\.(?:mid|csv)[. ]*)+$/i,'').replace(/[. ]+$/g,'');
    let base = stripSuffix(String(value || '').replace(/[\x00-\x1f\x7f/\\:*?"<>|]/g,'').trim());
    if (!base) base = 'audio-to-midi-notes';
    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(base)) base = '_' + base;
    base = stripSuffix(Array.from(base).slice(0,120).join('')) || 'audio-to-midi-notes';
    return base + '.' + extension;
  }
  function safeMidiName(value) { return safeExportName(value, 'mid'); }
  function safeCsvName(value) { return safeExportName(value, 'csv'); }
  function defaultMidiName(name) { return safeMidiName(String(name).replace(/\.[^.]+$/,'') + '-notes'); }
  function validateExportNotes(notes) {
    if (!Array.isArray(notes) || !notes.length) throw new Error('No valid notes to export');
    // Iteration includes sparse-array holes, unlike Array#some. Reject the whole
    // export rather than silently dropping malformed rows from the current score.
    for (const note of notes) {
      if (!note || typeof note !== 'object' || Array.isArray(note) || !validNote(note) || note.endSeconds > 60) {
        throw new Error('No valid notes to export');
      }
    }
  }
  function encodeCsv(notes) {
    validateExportNotes(notes);
    const rows = notes.slice().sort((a,b) => a.startSeconds-b.startSeconds || a.pitchMidi-b.pitchMidi || a.endSeconds-b.endSeconds);
    // Only validated numbers are serialized: no filename, provenance, formula,
    // or other source metadata. Keep exact source seconds, with no MIDI rounding.
    return 'start_seconds,end_seconds,pitch_midi,velocity\r\n' +
      rows.map(note => [note.startSeconds,note.endSeconds,note.pitchMidi,96].join(',')).join('\r\n') + '\r\n';
  }
  function encodeMidi(notes) {
    validateExportNotes(notes);
    const be16 = n => [n >>> 8 & 255,n & 255];
    const be32 = n => [n >>> 24 & 255,n >>> 16 & 255,n >>> 8 & 255,n & 255];
    function vlq(n) { const bytes=[n & 127]; while ((n=Math.floor(n/128))) bytes.unshift((n & 127)|128); return bytes; }
    const ascii = value => Array.from(value,c=>c.charCodeAt(0));
    function chunk(type,body) { return [...ascii(type),...be32(body.length),...body]; }
    const tempo = chunk('MTrk',[0,255,81,3,7,161,32,0,255,47,0]);
    const events=[];
    for(const note of notes) {
      const start=Math.round(note.startSeconds*TICKS_PER_SECOND);
      const end=Math.max(start+1,Math.round(note.endSeconds*TICKS_PER_SECOND));
      events.push({tick:start,off:false,pitch:note.pitchMidi},{tick:end,off:true,pitch:note.pitchMidi});
    }
    // Note-off precedes note-on at a shared tick, retaining consecutive same-pitch notes.
    events.sort((a,b)=>a.tick-b.tick || Number(b.off)-Number(a.off) || a.pitch-b.pitch);
    const track=[0,192,0]; let previous=0;
    for(const e of events) {track.push(...vlq(e.tick-previous),e.off?128:144,e.pitch,e.off?0:96);previous=e.tick;}
    track.push(0,255,47,0);
    return new Uint8Array([...ascii('MThd'),...be32(6),...be16(1),...be16(2),...be16(PPQ),...tempo,...chunk('MTrk',track)]);
  }
  return Object.freeze({SAMPLE_RATE,PPQ,buildWorkerSource,validateFile,validateDuration,mixChannels,normalizeNotes,createGeneration,safeMidiName,safeCsvName,defaultMidiName,encodeMidi,encodeCsv});
})();
if (typeof module !== 'undefined' && module.exports) module.exports=AudioMidiCore;
