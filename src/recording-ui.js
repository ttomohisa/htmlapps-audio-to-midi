/* Recording session UI. Native capture is isolated in recording-engine.js. */
const AudioMidiRecordingUI=(()=>{
 function create({translate,onRecording,onChange,onStart,onDiscard,onListen,isBusy,confirm,toast}){
  const $=id=>document.getElementById(id);
  let engine=null, capture=null, lastBlob=null, accepted=false, saved=false, preparing=false;
  let revision=0, disposed=false, pendingDecode=Promise.resolve(false), actionPending=false;
  const urls=new Set();
  const active=()=>['requesting','recording','stopping'].includes(capture?.status);
  const extension=()=>/mp4/.test(capture?.mimeType||'')?'m4a':/ogg/.test(capture?.mimeType||'')?'ogg':'webm';
  function defaultName(){const d=new Date(),pad=n=>String(n).padStart(2,'0');return `audio-to-midi-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;}
  function safeName(value){return String(value||'').replace(/[\\/:*?"<>|\x00-\x1f\x7f]/g,'_').replace(/\.(webm|ogg|mp4|m4a)$/i,'').replace(/[. ]+$/g,'').trim().slice(0,110)||'audio-to-midi-recording';}
  function render(){
   if(!capture)return;
   $('recordingPanel').dataset.recording=capture.status;
   $('recordingStatus').textContent=translate(preparing?'recording_preparing':'recording_'+capture.status);
   $('recordingClock').textContent=`${capture.elapsedSeconds.toFixed(1)} / 59 s`;
   $('recordingClock').setAttribute('aria-label',translate('recordingDuration'));
   $('recordingMeter').value=capture.level;
   $('recordButton').disabled=active()||preparing||actionPending||isBusy();
   $('stopRecordButton').disabled=!['requesting','recording'].includes(capture.status);
   $('stopRecordButton').textContent=translate(capture.status==='requesting'?'cancel':'stopRecording');
   $('recordingError').hidden=!capture.error;$('recordingError').textContent=capture.error?translate('recordingError_'+capture.error):'';
   $('recordingResult').hidden=!lastBlob;
   $('listenRecording').disabled=!accepted||preparing||active()||isBusy();
   $('discardRecording').disabled=preparing||actionPending;
   $('downloadRecording').disabled=!lastBlob||preparing;
   $('recordingExtension').textContent='.'+extension();
   $('recordingLocalHint').hidden=location.protocol!=='file:';
  }
  function changed(){render();onChange();}
  function handleCapture(next){
   if(disposed)return;
   const previous=capture;capture=next;
   if(next.blob&&next.blob!==lastBlob){
    const ticket=++revision;lastBlob=next.blob;accepted=false;saved=false;preparing=true;
    const name=defaultName();$('recordingFilename').value=name;
    // Validate the completed encoded Blob with the same decoder used for files.
    pendingDecode=Promise.resolve().then(()=>disposed||ticket!==revision?false:onRecording(new File([next.blob],name+'.'+extension(),{type:next.mimeType}))).then(ok=>{
     if(disposed||ticket!==revision)return false;
     accepted=!!ok;preparing=false;changed();return accepted;
    }).catch(()=>{if(!disposed&&ticket===revision){accepted=false;preparing=false;changed();}return false;});
   }
   render();
   // Meter updates must not repeatedly rebuild the waveform and note list.
   if(!previous||previous.status!==next.status||previous.blob!==next.blob||previous.error!==next.error)onChange();
  }
  engine=AudioMidiRecording.createRecorder({onChange:handleCapture});capture=engine.snapshot();
  async function askDiscard(){
   if(!active()&&(!lastBlob||saved))return true;
   const ticket=revision;
   const ok=await confirm({title:translate('discardRecordingTitle'),message:translate(active()?'discardActiveRecordingBody':'discardRecordingBody'),confirmLabel:translate('discardRecording'),tone:'danger'});
   return ok&&!disposed&&ticket===revision;
  }
  function clear(){
   revision++;lastBlob=null;accepted=false;saved=false;preparing=false;pendingDecode=Promise.resolve(false);
   engine.discard();capture=engine.snapshot();changed();
  }
  async function replace(){
   if(actionPending)return false;actionPending=true;render();
   try{if(!await askDiscard())return false;clear();return true;}
   finally{actionPending=false;changed();}
  }
  async function stop(){await engine.stop();await pendingDecode;return accepted;}
  async function leave(){
   if(!active())return true;
   const ok=await confirm({title:translate('stopRecordingTitle'),message:translate('stopRecordingBody'),confirmLabel:translate('stopRecording')});
   if(!ok||disposed)return false;
   await stop();return true;
  }
  $('recordButton').addEventListener('click',async()=>{
   if(active()||preparing||actionPending||isBusy())return;
   actionPending=true;render();
   try{if(!await askDiscard())return;clear();onStart();engine.start();}
   // Permission may remain pending: do not hold the confirmation lock.
   finally{actionPending=false;changed();}
  });
  $('stopRecordButton').addEventListener('click',()=>stop());
  $('listenRecording').addEventListener('click',()=>{if(accepted&&!active())onListen();});
  $('discardRecording').addEventListener('click',async()=>{if(await replace())onDiscard();});
  $('downloadRecording').addEventListener('click',()=>{
   if(!lastBlob||preparing)return;
   const name=safeName($('recordingFilename').value);$('recordingFilename').value=name;
   const url=URL.createObjectURL(lastBlob);urls.add(url);const anchor=document.createElement('a');anchor.href=url;anchor.download=name+'.'+extension();document.body.append(anchor);anchor.click();anchor.remove();
   setTimeout(()=>{URL.revokeObjectURL(url);urls.delete(url);},60000);saved=true;toast('recordingDownloaded');
  });
  render();
  return Object.freeze({render,active,preparing:()=>preparing,hasRecording:()=>!!lastBlob,unsaved:()=>!!lastBlob&&!saved,replace,clear,stop,leave,
   suspend:()=>{if(active())return stop();return Promise.resolve(accepted);},
   dispose:()=>{disposed=true;revision++;engine.dispose();for(const url of urls)URL.revokeObjectURL(url);urls.clear();lastBlob=null;},
   snapshot:()=>({...capture,accepted,preparing,saved})});
 }
 return Object.freeze({create});
})();
