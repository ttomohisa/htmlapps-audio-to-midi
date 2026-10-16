/*
 * Windowing adapted from @spotify/basic-pitch 1.0.1, Copyright 2022 Spotify AB,
 * Apache-2.0. Changes: bounded tensor scopes, no unused contours, explicit disposal.
 * Official post-processing/time correction is used unchanged from the pinned asset.
 */
const InferenceRuntime = (() => {
  const constants=Object.freeze({sampleRate:22050,window:43844,hop:36164,pad:3840,trim:15,fps:86});
  // Resolve lazily so the module remains inspectable before the worker bootstrap
  // injects its shared settings source. Node tests use the same pure module.
  function settingsApi() {
    return typeof AudioMidiSettings !== 'undefined' ? AudioMidiSettings : require('./detection-settings.js');
  }
  function postprocessNotes(postprocess, frames, onsets, settings) {
    const options=settingsApi().validate(settings);
    if (!frames.length) return [];
    const minimumFrames=settingsApi().minNoteLengthFrames(options);
    // Preserve the official inference/onset/melodia and corrected time functions.
    // Its frequency limits mutate input arrays and use an exclusive upper bound;
    // filter the normalized MIDI pitches instead, with both bounds inclusive.
    const rows=postprocess.noteFramesToTime(postprocess.outputToNotesPoly(frames,onsets,options.onsetThreshold,options.frameThreshold,minimumFrames,true,null,null,true,11));
    return rows.filter(n=>n.pitchMidi>=options.minPitchMidi && n.pitchMidi<=options.maxPitchMidi &&
      n.durationSeconds+1e-9>=options.minDurationSeconds)
      .map(n=>({pitchMidi:n.pitchMidi,startSeconds:n.startTimeSeconds,endSeconds:n.startTimeSeconds+n.durationSeconds,velocity:96,origin:'detected'}));
  }
  async function runBasicPitch(tf, postprocess, model, samples, onProgress=()=>{}, settings) {
    if (!(samples instanceof Float32Array) || !samples.length || samples.length>22050*60) throw new Error('Invalid PCM input');
    const options=settingsApi().validate(settings);
    const framed=tf.tidy(()=>tf.expandDims(tf.signal.frame(tf.concat1d([tf.zeros([constants.pad]),tf.tensor1d(samples)]),constants.window,constants.hop,true,0),-1));
    const frameCount=Math.floor(samples.length*constants.fps/constants.sampleRate);
    const frames=[],onsets=[];
    try {
      for(let i=0;i<framed.shape[0] && frames.length<frameCount;i++) {
        const remaining=frameCount-frames.length;
        const output=tf.tidy(()=>{
          const input=framed.slice([i,0,0],[1,-1,-1]);
          const predictions=model.execute(input,['Identity_1','Identity_2']);
          return predictions.map(value=>{
            const count=Math.min(remaining,value.shape[1]-2*constants.trim);
            return value.slice([0,constants.trim,0],[1,count,-1]).reshape([count,value.shape[2]]).arraySync();
          });
        });
        frames.push(...output[0]);onsets.push(...output[1]);
        onProgress({phase:'analyzing',progress:Math.min(1,frames.length/frameCount)});
        await new Promise(resolve=>setTimeout(resolve,0));
      }
    } finally { framed.dispose(); }
    onProgress({phase:'postprocessing',progress:1});
    return postprocessNotes(postprocess,frames,onsets,options);
  }
  return {constants,postprocessNotes,runBasicPitch};
})();
if(typeof module!=='undefined' && module.exports) module.exports=InferenceRuntime;
if(typeof self!=='undefined' && typeof self.postMessage==='function') {
  let model=null,busy=false;
  self.onmessage=async event=>{
    if(busy)return;
    busy=true;
    const {samples,modelJson,weights,settings}=event.data;
    const started=performance.now();
    try {
      if(!model) {
        self.postMessage({phase:'loading-model',progress:0});
        await tf.setBackend('cpu');await tf.ready();
        model=await tf.loadGraphModel({load:async()=>({modelTopology:modelJson.modelTopology,format:modelJson.format,generatedBy:modelJson.generatedBy,convertedBy:modelJson.convertedBy,weightSpecs:modelJson.weightsManifest.flatMap(m=>m.weights),weightData:weights})});
      }
      const notes=await InferenceRuntime.runBasicPitch(tf,BasicPitchPostprocess,model,samples,p=>self.postMessage(p),settings);
      self.postMessage({phase:'complete',notes,elapsedMs:performance.now()-started,tensors:tf.memory().numTensors});
    } catch(error) {console.error('Audio inference failed:',error);self.postMessage({phase:'error',code:'analysisFailed'});}
    finally{busy=false;}
  };
}
