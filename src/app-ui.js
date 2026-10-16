const $=selector=>document.querySelector(selector);
const core=AudioMidiCore;
const outputFilename=$('#outputFilename');
const translations={
 en:{brandMeta:'Local audio · Private by design',introTitle:'Turn a melody into MIDI',lead:'Bring a short recording. Find the notes. Take them into your music app.',localBadge:'Fully local processing',stepInput:'01 / AUDIO',inputTitle:'Choose a short recording',inputHint:'One instrument or melody. 0.5–60 seconds · up to 50 MiB.',chooseFile:'Choose audio or drop it here',formatHint:'WAV / MP3. M4A, AAC, OGG and FLAC depend on your browser.',analyze:'Analyze audio',cancel:'Cancel',reset:'Reset',stepOutput:'02 / MIDI',resultTitle:'Save the detected notes',notes:'notes',accuracyNote:'Transcription is an estimate. Check the MIDI in your music app.',outputFilename:'Output filename',download:'Download MIDI',midiNote:'MIDI contains notes, not audio. Fixed 120 BPM and velocity 96; tempo and loudness are not estimated.',noteDetails:'Detected note details',pitch:'Pitch',start:'Start (s)',end:'End (s)',scopeNote:'v0.1: file conversion only. Piano roll, playback, recording and editing are planned for later versions.',privacyNote:'Your audio stays on this device. The model is included in this HTML.',empty:'Ready when you are',emptyHint:'Choose a short audio file to begin.',ready:'Audio is ready',readyHint:'Press Analyze audio. Processing may take a while on slower devices.',decoding:'Reading audio…',decodingHint:'Decoding and preparing mono audio at 22,050 Hz.', 'loading-model':'Preparing the local model…','loading-modelHint':'No download is needed. You can cancel at any time.',analyzing:'Finding notes…',analyzingHint:'Processing on this device. You can change files or cancel.',postprocessing:'Organizing detected notes…',postprocessingHint:'Applying the standard Basic Pitch settings.',result:'Notes are ready',resultHint:'Review the details, name your file, then save MIDI.','no-notes':'No notes detected','no-notesHint':'Try a clearer, louder recording of one instrument or melody.',cancelled:'Cancelled',cancelledHint:'The previous job was stopped. Analyze again or choose another file.',error:'Could not finish',errorHint:'Try again or choose another audio file.',emptyFile:'This file is empty. Choose an audio recording.',fileTooLarge:'Choose a file of 50 MiB or less. The previous result has been kept.',unsupportedFormat:'Choose WAV, MP3, M4A, AAC, OGG or FLAC. Your browser must support the format.',invalidDuration:'Choose audio between 0.5 and 60.0 seconds long.',decodeFailed:'This audio could not be decoded. Try a valid WAV or MP3 file.',analysisFailed:'Analysis failed on this device. Try again with a shorter recording.',browserUnsupported:'This browser is missing a required audio or Worker feature. Try a current Chrome, Edge, Firefox or Safari.',multipleFiles:'Choose one audio file at a time.',downloaded:'MIDI download started',resetTitle:'Clear this session?',resetBody:'The current audio and detected notes will be removed. Save your MIDI first if you need it.',confirmTitle:'Confirm',confirmAction:'Continue',close:'Close',helpTitle:'How to use & notes',helpBasicsTitle:'Basics',helpStep1:'Choose one short audio file, or drop it into the input area. Read the duration and filename before analyzing.',helpStep2:'Press Analyze audio. The embedded Spotify Basic Pitch model runs on your CPU. Cancel stops the worker immediately.',helpStep3:'Check the note summary, edit the filename, then download MIDI. Open it in a music app to review the transcription.',helpPrivacyTitle:'Privacy',helpPrivacyBody:'The app never sends your audio or notes to a server. Code, model and licenses are embedded. Only the language choice is stored locally.',helpNotesTitle:'Limits',helpNoteStorage:'Audio and notes exist only in this page session. Reloading or closing the page loses them; download your MIDI first.',helpNoteBrowser:'50 MiB maximum; 0.5–60 seconds. Decoding formats and processing speed depend on your browser and device. Mixed songs, noise and harmonics can produce incorrect notes.',helpOffline:'Both downloadable HTML variants work offline in supported browsers. The compact variant requires DecompressionStream support.',licenses:'Open-source licenses',buildInfo:'Build information',appVersion:'App version',builtAt:'Built at',dependencies:'Embedded dependencies',footer:'Single-file, local-first audio tool',noteLimit:'Showing up to 100 notes. All detected notes are included in MIDI.',elapsed:'Analysis time',seconds:'seconds',duration:'Duration',size:'Size',range:'Pitch range'},
 ja:{brandMeta:'ローカル音声・端末内で完結',introTitle:'メロディーをMIDIへ',lead:'短い録音から音符を見つけて、いつもの音楽アプリへ。',localBadge:'完全ローカル処理',stepInput:'01 / 音声',inputTitle:'短い録音を選ぶ',inputHint:'1つの楽器やメロディー。0.5〜60秒・最大50 MiB。',chooseFile:'音声を選択、またはここにドロップ',formatHint:'WAV / MP3。M4A・AAC・OGG・FLACはブラウザーの対応によります。',analyze:'音声を解析',cancel:'キャンセル',reset:'リセット',stepOutput:'02 / MIDI',resultTitle:'検出した音符を保存',notes:'音',accuracyNote:'採譜は推定です。保存したMIDIを音楽アプリで確認してください。',outputFilename:'保存ファイル名',download:'MIDIを保存',midiNote:'MIDIに音声は含まれません。120 BPM・ベロシティ96の固定値で、テンポや強弱の推定ではありません。',noteDetails:'検出した音符の詳細',pitch:'音高',start:'開始（秒）',end:'終了（秒）',scopeNote:'v0.1はファイル変換のみ。ピアノロール・試聴・録音・編集は今後の版で追加予定です。',privacyNote:'音声はこの端末から送信されません。モデルもHTMLに内包しています。',empty:'音声を選んで始めましょう',emptyHint:'短い音声ファイルを選んでください。',ready:'音声の準備ができました',readyHint:'「音声を解析」を押してください。端末によっては時間がかかります。',decoding:'音声を読み込み中…',decodingHint:'デコードし、22,050 Hzのモノラル音声を準備しています。','loading-model':'端末内のモデルを準備中…','loading-modelHint':'外部からのダウンロードはありません。いつでも中止できます。',analyzing:'音符を検出中…',analyzingHint:'この端末で処理しています。入力の変更や中止もできます。',postprocessing:'検出した音符を整理中…',postprocessingHint:'Basic Pitchの標準設定で音符に変換しています。',result:'音符ができました',resultHint:'詳細を確認し、ファイル名を付けてMIDIを保存してください。','no-notes':'音符が見つかりませんでした','no-notesHint':'1つの楽器やメロディーを、雑音の少ない環境で少し大きめに録音してお試しください。',cancelled:'中止しました',cancelledHint:'前の処理は停止しました。もう一度解析するか、別の音声を選べます。',error:'処理を完了できませんでした',errorHint:'再試行するか、別の音声を選んでください。',emptyFile:'空のファイルです。音声が入ったファイルを選んでください。',fileTooLarge:'50 MiB以下のファイルを選んでください。前の結果は保持しています。',unsupportedFormat:'WAV・MP3・M4A・AAC・OGG・FLACを選んでください。ブラウザーの対応も必要です。',invalidDuration:'長さが0.5秒以上、60.0秒以下の音声を選んでください。',decodeFailed:'音声を読み取れませんでした。正常なWAVまたはMP3をお試しください。',analysisFailed:'この端末で解析できませんでした。短い録音で再試行してください。',browserUnsupported:'音声処理またはWorkerに対応していません。最新のChrome・Edge・Firefox・Safariをお試しください。',multipleFiles:'音声ファイルは1つずつ選んでください。',downloaded:'MIDIの保存を開始しました',resetTitle:'この作業を消去しますか？',resetBody:'現在の音声と検出した音符を消去します。必要なMIDIは先に保存してください。',confirmTitle:'確認',confirmAction:'続ける',close:'閉じる',helpTitle:'使い方と注意事項',helpBasicsTitle:'基本操作',helpStep1:'短い音声を1つ選ぶか、入力エリアにドロップします。ファイル名と再生時間を確認してください。',helpStep2:'「音声を解析」を押します。内包したSpotify Basic PitchモデルがCPUで動作します。キャンセルすると処理を直ちに停止します。',helpStep3:'音符の概要を確認し、保存名を変更してMIDIを保存します。音楽アプリで採譜結果を確認してください。',helpPrivacyTitle:'プライバシー',helpPrivacyBody:'音声や音符をサーバーへ送信しません。コード・モデル・ライセンスはHTMLに内包しています。端末には言語設定だけを保存します。',helpNotesTitle:'制限・注意事項',helpNoteStorage:'音声と音符はこのページを開いている間だけ保持します。再読み込みや終了で失われるため、先にMIDIを保存してください。',helpNoteBrowser:'最大50 MiB・0.5〜60秒。対応形式や速度は端末とブラウザーによります。複数楽器の楽曲・雑音・倍音は誤検出の原因になります。',helpOffline:'通常版と自己展開版のHTMLは対応ブラウザーでオフライン利用できます。自己展開版にはDecompressionStream対応が必要です。',licenses:'オープンソースライセンス',buildInfo:'ビルド情報',appVersion:'アプリバージョン',builtAt:'生成日時',dependencies:'内包依存数',footer:'単一HTML・ローカル音声ツール',noteLimit:'先頭100音まで表示。MIDIにはすべての検出音を含みます。',elapsed:'解析時間',seconds:'秒',duration:'長さ',size:'容量',range:'音域'}
};
const languageKey=APP_CONFIG.slug+':language';
function readStorage(key){try{return localStorage.getItem(key);}catch{return null;}}
function writeStorage(key,value){try{localStorage.setItem(key,value);}catch{}}
let language=readStorage(languageKey)||((navigator.language||'').startsWith('ja')?'ja':'en');
if(!translations[language])language='en';
function translate(key){return translations[language][key]||translations.en[key]||key;}
__UI_COMPONENTS__
const generation=core.createGeneration();
const state={phase:'empty',file:null,duration:0,samples:null,notes:[],progress:0,error:null,inputError:null,elapsed:0};
let worker=null,workerUrl=null,decodeContext=null;
const busy=()=>['decoding','loading-model','analyzing','postprocessing'].includes(state.phase);
function stopWorker(){if(worker){worker.terminate();worker=null;}if(workerUrl){URL.revokeObjectURL(workerUrl);workerUrl=null;}}
function closeDecoder(){const context=decodeContext;decodeContext=null;if(context&&context.state!=='closed')context.close().catch(()=>{});}
function invalidate(){const token=generation.next();stopWorker();closeDecoder();return token;}
function pitchName(pitch){return ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][pitch%12]+(Math.floor(pitch/12)-1);}
function render(){
 document.body.dataset.phase=state.phase;
 $('#inputError').hidden=!state.inputError;$('#inputError').textContent=state.inputError?translate(state.inputError):'';
 $('#sourceInfo').hidden=!state.file;$('#sourceName').textContent=state.file?.name||'';
 $('#sourceMeta').textContent=state.file?`${translate('size')}: ${(state.file.size/1048576).toFixed(2)} MiB${state.duration?' · '+translate('duration')+': '+state.duration.toFixed(2)+' '+translate('seconds'):''}`:'';
 $('#analyzeButton').disabled=busy()||!state.samples;
 $('#cancelButton').hidden=!busy();$('#resetButton').disabled=state.phase==='empty';
 $('#downloadButton').disabled=state.phase!=='result'||!state.notes.length;
 $('#statusText').textContent=translate(state.phase);
 $('#statusHint').textContent=translate(state.error||state.phase+'Hint');
 $('#progressBar').hidden=!busy();
 if(state.phase==='analyzing'||state.phase==='postprocessing')$('#progressBar').value=state.progress;else $('#progressBar').removeAttribute('value');
 $('#noteCount').textContent=['result','no-notes'].includes(state.phase)?state.notes.length:'—';
 $('#resultMeta').textContent=state.notes.length?`${translate('range')}: ${pitchName(Math.min(...state.notes.map(n=>n.pitchMidi)))}–${pitchName(Math.max(...state.notes.map(n=>n.pitchMidi)))} · ${translate('elapsed')}: ${(state.elapsed/1000).toFixed(1)} ${translate('seconds')}`:'';
 $('#notesDetails').hidden=!state.notes.length;
 $('#noteRows').replaceChildren(...state.notes.slice(0,100).map(n=>{const row=document.createElement('div');row.className='note-row';[`${pitchName(n.pitchMidi)} (${n.pitchMidi})`,n.startSeconds.toFixed(3),n.endSeconds.toFixed(3)].forEach(text=>{const cell=document.createElement('span');cell.textContent=text;row.append(cell);});return row;}));
 $('#noteLimit').textContent=state.notes.length>100?translate('noteLimit'):'';
}
function applyLanguage(){
 document.documentElement.lang=language;
 document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=translate(el.dataset.i18n);});
 document.querySelectorAll('[data-i18n-title]').forEach(el=>{el.title=translate(el.dataset.i18nTitle);});
 document.querySelectorAll('[data-i18n-aria-label]').forEach(el=>el.setAttribute('aria-label',translate(el.dataset.i18nAriaLabel)));
 $('#languageButton').textContent=language==='ja'?'EN':'JA';$('#languageButton').setAttribute('aria-label',language==='ja'?'英語に切り替え':'Switch to Japanese');
 document.title=language==='ja'?APP_CONFIG.nameJa:APP_CONFIG.name;$('#brandName').textContent=document.title;$('#footerName').textContent=document.title;render();
}
async function selectFiles(files){
 if(files.length!==1){if(files.length){state.inputError='multipleFiles';render();}return;}
 const file=files[0],error=core.validateFile(file);
 if(error){state.inputError=error;render();return;}
 const token=invalidate();Object.assign(state,{phase:'decoding',file,duration:0,samples:null,notes:[],error:null,inputError:null,progress:0,elapsed:0});
 outputFilename.value=core.defaultMidiName(file.name).replace(/\.mid$/,'');render();
 let context;
 try{
  const AudioContextClass=window.AudioContext||window.webkitAudioContext;
  if(!AudioContextClass||!window.OfflineAudioContext||!window.Worker)throw new Error('browserUnsupported');
  context=new AudioContextClass();decodeContext=context;
  const bytes=await file.arrayBuffer();if(!generation.isCurrent(token))return;
  const audio=await context.decodeAudioData(bytes);if(!generation.isCurrent(token))return;
  const durationError=core.validateDuration(audio.duration);if(durationError)throw new Error(durationError);
  state.duration=audio.duration;
  const mono=core.mixChannels(Array.from({length:audio.numberOfChannels},(_,i)=>audio.getChannelData(i)));
  let samples=mono;
  if(audio.sampleRate!==core.SAMPLE_RATE){
   const offline=new OfflineAudioContext(1,Math.round(audio.duration*core.SAMPLE_RATE),core.SAMPLE_RATE);
   const input=offline.createBuffer(1,mono.length,audio.sampleRate);input.copyToChannel(mono,0);
   const source=offline.createBufferSource();source.buffer=input;source.connect(offline.destination);source.start();
   const rendered=await offline.startRendering();source.disconnect();samples=new Float32Array(rendered.getChannelData(0));
  }
  if(!generation.isCurrent(token))return;
  state.samples=samples;state.phase='ready';render();
 }catch(error){if(generation.isCurrent(token)){state.phase='error';state.error=['invalidDuration','browserUnsupported'].includes(error.message)?error.message:'decodeFailed';render();}}
 finally{if(decodeContext===context)closeDecoder();}
}
async function analyze(){
 if(busy()||!state.samples)return;
 const token=generation.next();Object.assign(state,{phase:'loading-model',notes:[],error:null,inputError:null,progress:0});render();
 try{
  if(!worker){
   const assets=StandaloneAssets;
   const [tfSource,midiSource,postSource,modelText,weights]=await Promise.all([assets.textAsync('tfjs','runtime'),assets.textAsync('tone-midi','runtime'),assets.textAsync('basic-pitch','postprocess'),assets.textAsync('basic-pitch','model'),assets.bytesAsync('basic-pitch','weights')]);
   if(!generation.isCurrent(token))return;
   const bootstrap=core.buildWorkerSource(tfSource,midiSource,postSource,INFERENCE_WORKER_SOURCE);
   workerUrl=URL.createObjectURL(new Blob([bootstrap],{type:'text/javascript'}));worker=new Worker(workerUrl);
   worker.modelJson=JSON.parse(modelText);worker.modelWeights=weights;
  }
  const activeWorker=worker;
  activeWorker.onmessage=event=>{
   if(!generation.isCurrent(token)||worker!==activeWorker)return;
   const result=event.data;
   if(result.phase==='complete'){
    state.notes=core.normalizeNotes(result.notes,state.duration);state.elapsed=result.elapsedMs;
    state.phase=state.notes.length?'result':'no-notes';state.progress=1;
   }else if(result.phase==='error'){state.phase='error';state.error='analysisFailed';stopWorker();}
   else{state.phase=result.phase;state.progress=result.progress||0;}
   render();
  };
  activeWorker.onerror=event=>{console.error('Audio worker failed:',event.message);event.preventDefault();if(generation.isCurrent(token)){state.phase='error';state.error='analysisFailed';stopWorker();render();}};
  const copy=new Float32Array(state.samples);
  activeWorker.postMessage({samples:copy,modelJson:activeWorker.modelJson,weights:activeWorker.modelWeights.buffer},[copy.buffer]);
 }catch(error){console.error('Audio runtime preparation failed:',error);if(generation.isCurrent(token)){stopWorker();state.phase='error';state.error='analysisFailed';render();}}
}
$('#audioFile').addEventListener('change',event=>{const files=Array.from(event.target.files);event.target.value='';selectFiles(files);});
const drop=$('#dropZone');
for(const type of ['dragenter','dragover'])drop.addEventListener(type,event=>{event.preventDefault();drop.classList.add('dragging');});
for(const type of ['dragleave','drop'])drop.addEventListener(type,event=>{event.preventDefault();drop.classList.remove('dragging');});
drop.addEventListener('drop',event=>selectFiles(Array.from(event.dataTransfer.files)));
window.addEventListener('dragover',event=>event.preventDefault());window.addEventListener('drop',event=>event.preventDefault());
$('#analyzeButton').addEventListener('click',analyze);
$('#cancelButton').addEventListener('click',()=>{invalidate();state.phase='cancelled';state.notes=[];state.error=null;render();});
$('#resetButton').addEventListener('click',async()=>{
 const token=generation.capture(); // A cancelled dialog must not invalidate an active job.
 if(!await AppConfirm.ask({title:translate('resetTitle'),message:translate('resetBody'),confirmLabel:translate('reset'),tone:'danger'}))return;
 if(!generation.isCurrent(token))return;
 invalidate();Object.assign(state,{phase:'empty',file:null,samples:null,notes:[],duration:0,error:null,inputError:null});outputFilename.value='audio-to-midi-notes';render();
});
$('#downloadButton').addEventListener('click',()=>{
 if(state.phase!=='result'||!state.notes.length)return;
 const filename=core.safeMidiName(outputFilename.value);outputFilename.value=filename.replace(/\.mid$/,'');
 const url=URL.createObjectURL(new Blob([core.encodeMidi(state.notes)],{type:'audio/midi'}));blobUrls.add(url);
 const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;document.body.append(anchor);anchor.click();anchor.remove();
 setTimeout(()=>{URL.revokeObjectURL(url);blobUrls.delete(url);},60000);showToast(translate('downloaded'));
});
$('#languageButton').addEventListener('click',()=>{language=language==='ja'?'en':'ja';writeStorage(languageKey,language);applyLanguage();});
const helpDialog=$('#helpDialog');$('#helpButton').addEventListener('click',()=>helpDialog.showModal());$('#closeHelpButton').addEventListener('click',()=>helpDialog.close());
helpDialog.addEventListener('click',event=>{const r=helpDialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)helpDialog.close();});
$('#licensesDetails').addEventListener('toggle',()=>{if($('#licensesDetails').open)$('#licenseText').textContent=THIRD_PARTY_NOTICES;});
window.addEventListener('pagehide',event=>{
 const wasBusy=busy();invalidate();
 if(event.persisted){
  // BFCache restores this same document: keep completed data, cancel interrupted work coherently.
  if(wasBusy){state.phase='cancelled';state.notes=[];state.error=null;}
 }else{state.samples=null;state.notes=[];state.phase='empty';}
});
window.addEventListener('pageshow',event=>{if(event.persisted)render();});
$('#versionBadge').textContent='v'+APP_CONFIG.version;$('#buildVersion').textContent=APP_CONFIG.version;$('#builtAt').textContent=BUILD_MANIFEST.generatedAtUtc;$('#dependencyCount').textContent=BUILD_MANIFEST.dependencies.length;
applyLanguage();
