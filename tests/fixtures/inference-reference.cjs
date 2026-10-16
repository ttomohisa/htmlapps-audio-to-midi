// Test-only v0.6 eager framing reference. Keep independent of the production
// windowing loop so boundary regressions cannot silently update both sides.
const constants = Object.freeze({sampleRate: 22050, window: 43844, hop: 36164, pad: 3840, trim: 15, fps: 86});
async function runEagerReference(tf, postprocess, model, samples, onProgress = () => {}, settings) {
  const runtime = require('../../src/inference-worker.js');
  const options = require('../../src/detection-settings.js').validate(settings);
  const framed = tf.tidy(() => tf.expandDims(tf.signal.frame(tf.concat1d([
    tf.zeros([constants.pad]), tf.tensor1d(samples),
  ]), constants.window, constants.hop, true, 0), -1));
  const frameCount = Math.floor(samples.length * constants.fps / constants.sampleRate);
  const frames = [], onsets = [];
  try {
    for (let index = 0; index < framed.shape[0] && frames.length < frameCount; index++) {
      const remaining = frameCount - frames.length;
      const output = tf.tidy(() => {
        const input = framed.slice([index, 0, 0], [1, -1, -1]);
        const predictions = model.execute(input, ['Identity_1', 'Identity_2']);
        return predictions.map(value => {
          const count = Math.min(remaining, value.shape[1] - 2 * constants.trim);
          return value.slice([0, constants.trim, 0], [1, count, -1]).reshape([count, value.shape[2]]).arraySync();
        });
      });
      frames.push(...output[0]); onsets.push(...output[1]);
      onProgress({phase: 'analyzing', progress: Math.min(1, frames.length / frameCount)});
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  } finally { framed.dispose(); }
  onProgress({phase: 'postprocessing', progress: 1});
  return runtime.postprocessNotes(postprocess, frames, onsets, options);
}
module.exports = {constants, runEagerReference};
