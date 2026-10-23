const $=selector=>document.querySelector(selector);
const core=AudioMidiCore;
const outputFilename=$('#outputFilename');
const translations={
 en:{brandMeta:'Find notes in audio and turn them into MIDI',introTitle:'Turn a melody into MIDI',lead:'Bring a short recording. Find the notes. Take them into your music app.',localBadge:'Fully local processing',stepInput:'01 / AUDIO',inputTitle:'Choose a short recording',inputHint:'One instrument or melody. 0.5–60 seconds · up to 50 MiB.',chooseFile:'Choose audio or drop it here',formatHint:'WAV / MP3. M4A, AAC, OGG and FLAC depend on your browser.',analyze:'Analyze audio',cancel:'Cancel',reset:'Reset',stepOutput:'03 / MIDI',resultTitle:'Save the detected notes',notes:'notes',accuracyNote:'Transcription is an estimate. Check the MIDI in your music app.',outputFilename:'Output filename',download:'Download MIDI',midiNote:'MIDI contains notes, not audio. Fixed 120 BPM and velocity 96; tempo and loudness are not estimated.',noteDetails:'Detected note details',pitch:'Pitch',start:'Start (s)',end:'End (s)',scopeNote:'v0.2: view and compare notes. Recording and note editing are planned for later versions. The simple synth does not reproduce the original instrument.',privacyNote:'Your audio stays on this device. The model is included in this HTML.',empty:'Ready when you are',emptyHint:'Choose a short audio file to begin.',ready:'Audio is ready',readyHint:'Press Analyze audio. Processing may take a while on slower devices.',decoding:'Reading audio…',decodingHint:'Decoding and preparing mono audio at 22,050 Hz.', 'loading-model':'Preparing the local model…','loading-modelHint':'No download is needed. You can cancel at any time.',analyzing:'Finding notes…',analyzingHint:'Processing on this device. You can change files or cancel.',postprocessing:'Organizing detected notes…',postprocessingHint:'Applying the standard Basic Pitch settings.',result:'Notes are ready',resultHint:'Review the details, name your file, then save MIDI.','no-notes':'No notes detected','no-notesHint':'Try a clearer, louder recording of one instrument or melody.',cancelled:'Cancelled',cancelledHint:'The previous job was stopped. Analyze again or choose another file.',error:'Could not finish',errorHint:'Try again or choose another audio file.',emptyFile:'This file is empty. Choose an audio recording.',fileTooLarge:'Choose a file of 50 MiB or less. The previous result has been kept.',unsupportedFormat:'Choose WAV, MP3, M4A, AAC, OGG or FLAC. Your browser must support the format.',invalidDuration:'Choose audio between 0.5 and 60.0 seconds long.',decodeFailed:'This audio could not be decoded. Try a valid WAV or MP3 file.',analysisFailed:'Analysis failed on this device. Try again with a shorter recording.',browserUnsupported:'This browser is missing a required audio or Worker feature. Try current Chrome on Windows or Android.',multipleFiles:'Choose one audio file at a time.',downloaded:'MIDI download started',resetTitle:'Clear this session?',resetBody:'The current audio and detected notes will be removed. Save your MIDI first if you need it.',confirmTitle:'Confirm',confirmAction:'Continue',close:'Close',helpTitle:'How to use & notes',helpDialogNote:'Close this dialog or press Escape to return to the same place on the page.',helpBasicsTitle:'Basics',helpStep1:'Choose one short audio file, or drop it into the input area. Read the duration and filename before analyzing.',helpStep2:'Press Analyze audio. The embedded Spotify Basic Pitch model runs on your CPU. Cancel stops the worker immediately.',helpStep3:'Use Play, Pause, Stop and the position slider to compare Original audio with Synthesized notes. Zoom or scroll the piano roll and select a note to read its timing. Then name and download MIDI.',helpPrivacyTitle:'Privacy',helpPrivacyBody:'The app never sends your audio or notes to a server. Code, model and licenses are embedded. Only the language choice is stored locally.',helpNotesTitle:'Limits',helpNoteStorage:'Audio and notes exist only in this page session. Reloading or closing the page loses them; download your MIDI first.',helpNoteBrowser:'Release scope: Windows and Android Chrome. Other browsers, DAW playback and screen readers are unverified. 50 MiB maximum; 0.5–60 seconds. Decoding formats and processing speed depend on your browser and device. Mixed songs, noise and harmonics can produce incorrect notes.',helpOffline:'Both downloadable HTML variants work offline in supported browsers. The compact variant requires DecompressionStream support.',licenses:'Open-source licenses',buildInfo:'Build information',appVersion:'App version',builtAt:'Built at',dependencies:'Embedded dependencies',footer:'Single-file, local-first audio tool',noteLimit:'Showing up to 100 notes. All detected notes are included in MIDI.',elapsed:'Analysis time',seconds:'seconds',duration:'Duration',size:'Size',range:'Pitch range'},
 ja:{brandMeta:'音声から音符を見つけてMIDIに',introTitle:'メロディーをMIDIへ',lead:'短い録音から音符を見つけて、いつもの音楽アプリへ。',localBadge:'完全ローカル処理',stepInput:'01 / 音声',inputTitle:'短い録音を選ぶ',inputHint:'1つの楽器やメロディー。0.5〜60秒・最大50 MiB。',chooseFile:'音声を選択、またはここにドロップ',formatHint:'WAV / MP3。M4A・AAC・OGG・FLACはブラウザーの対応によります。',analyze:'音声を解析',cancel:'キャンセル',reset:'リセット',stepOutput:'03 / MIDI',resultTitle:'検出した音符を保存',notes:'音',accuracyNote:'採譜は推定です。保存したMIDIを音楽アプリで確認してください。',outputFilename:'保存ファイル名',download:'MIDIを保存',midiNote:'MIDIに音声は含まれません。120 BPM・ベロシティ96の固定値で、テンポや強弱の推定ではありません。',noteDetails:'検出した音符の詳細',pitch:'音高',start:'開始（秒）',end:'終了（秒）',scopeNote:'v0.2は音符の表示と聴き比べまで。録音・編集は今後の版で追加予定です。簡易合成音は元の楽器の音色を再現しません。',privacyNote:'音声はこの端末から送信されません。モデルもHTMLに内包しています。',empty:'音声を選んで始めましょう',emptyHint:'短い音声ファイルを選んでください。',ready:'音声の準備ができました',readyHint:'「音声を解析」を押してください。端末によっては時間がかかります。',decoding:'音声を読み込み中…',decodingHint:'デコードし、22,050 Hzのモノラル音声を準備しています。','loading-model':'端末内のモデルを準備中…','loading-modelHint':'外部からのダウンロードはありません。いつでも中止できます。',analyzing:'音符を検出中…',analyzingHint:'この端末で処理しています。入力の変更や中止もできます。',postprocessing:'検出した音符を整理中…',postprocessingHint:'Basic Pitchの標準設定で音符に変換しています。',result:'音符ができました',resultHint:'詳細を確認し、ファイル名を付けてMIDIを保存してください。','no-notes':'音符が見つかりませんでした','no-notesHint':'1つの楽器やメロディーを、雑音の少ない環境で少し大きめに録音してお試しください。',cancelled:'中止しました',cancelledHint:'前の処理は停止しました。もう一度解析するか、別の音声を選べます。',error:'処理を完了できませんでした',errorHint:'再試行するか、別の音声を選んでください。',emptyFile:'空のファイルです。音声が入ったファイルを選んでください。',fileTooLarge:'50 MiB以下のファイルを選んでください。前の結果は保持しています。',unsupportedFormat:'WAV・MP3・M4A・AAC・OGG・FLACを選んでください。ブラウザーの対応も必要です。',invalidDuration:'長さが0.5秒以上、60.0秒以下の音声を選んでください。',decodeFailed:'音声を読み取れませんでした。正常なWAVまたはMP3をお試しください。',analysisFailed:'この端末で解析できませんでした。短い録音で再試行してください。',browserUnsupported:'音声処理またはWorkerに対応していません。WindowsまたはAndroidの最新のChromeをお試しください。',multipleFiles:'音声ファイルは1つずつ選んでください。',downloaded:'MIDIの保存を開始しました',resetTitle:'この作業を消去しますか？',resetBody:'現在の音声と検出した音符を消去します。必要なMIDIは先に保存してください。',confirmTitle:'確認',confirmAction:'続ける',close:'閉じる',helpTitle:'使い方と注意事項',helpDialogNote:'閉じるボタン、またはEscキーで元の位置に戻ります。',helpBasicsTitle:'基本操作',helpStep1:'短い音声を1つ選ぶか、入力エリアにドロップします。ファイル名と再生時間を確認してください。',helpStep2:'「音声を解析」を押します。内包したSpotify Basic PitchモデルがCPUで動作します。キャンセルすると処理を直ちに停止します。',helpStep3:'再生・一時停止・停止・位置スライダーで元音声と音符の合成音を聴き比べます。ピアノロールを拡大・スクロールし、音符を選んで時刻を確認します。最後に保存名を付けてMIDIを保存してください。',helpPrivacyTitle:'プライバシー',helpPrivacyBody:'音声や音符をサーバーへ送信しません。コード・モデル・ライセンスはHTMLに内包しています。端末には言語設定だけを保存します。',helpNotesTitle:'制限・注意事項',helpNoteStorage:'音声と音符はこのページを開いている間だけ保持します。再読み込みや終了で失われるため、先にMIDIを保存してください。',helpNoteBrowser:'正式版の対象はWindows・AndroidのChromeです。他のブラウザー、DAW再生、読み上げ支援は未検証です。最大50 MiB・0.5〜60秒。対応形式や速度は端末とブラウザーによります。複数楽器の楽曲・雑音・倍音は誤検出の原因になります。',helpOffline:'通常版と自己展開版のHTMLは対応ブラウザーでオフライン利用できます。自己展開版にはDecompressionStream対応が必要です。',licenses:'オープンソースライセンス',buildInfo:'ビルド情報',appVersion:'アプリバージョン',builtAt:'生成日時',dependencies:'内包依存数',footer:'単一HTML・ローカル音声ツール',noteLimit:'先頭100音まで表示。MIDIにはすべての検出音を含みます。',elapsed:'解析時間',seconds:'秒',duration:'長さ',size:'容量',range:'音域'}
};
Object.assign(translations.en,{"stepReview": "02 / REVIEW", "reviewTitle": "See and compare the notes", "reviewHint": "Compare the original recording with a simple synthesized preview, then select a note to correct it.", "playbackSource": "Listen to", "originalAudio": "Original audio", "synthAudio": "Synthesized notes", "play": "Play", "pause": "Pause", "stop": "Stop", "playbackPosition": "Position", "playbackControls": "Playback controls", "timelineEmpty": "Choose an audio file to see its waveform.", "timelineUnits": "Time in seconds · Pitch", "zoomOut": "Zoom out", "zoomIn": "Zoom in", "waveformLabel": "Wave", "waveformDescription": "Original audio waveform and seconds timeline. Click to seek.", "pianoScrollLabel": "Piano roll. Scroll horizontally for time and vertically for pitch.", "pianoDescription": "Detected notes by pitch and source time.", "timelineGuide": "Scroll the note area to move in time or pitch. Tap a note or choose one below.", "selectedNote": "Selected note", "noNoteSelected": "Analyze audio to see the detected notes. No note editing in v0.2.", "playbackFailed": "Audio could not start. Press Play to retry, or try a current browser.", "playback_empty": "No audio loaded", "playback_stopped": "Stopped", "playback_starting": "Preparing playback…", "playback_playing": "Playing", "playback_paused": "Paused", "playback_ended": "Playback finished", "playback_disposed": "Playback stopped"});
Object.assign(translations.ja,{"stepReview": "02 / 音符を確認", "reviewTitle": "音符を見て、聴き比べる", "reviewHint": "元音声と簡易合成音を切り替えて確認し、音符を選んで修正できます。", "playbackSource": "試聴する音", "originalAudio": "元音声", "synthAudio": "音符の合成音", "play": "再生", "pause": "一時停止", "stop": "停止", "playbackPosition": "再生位置", "playbackControls": "再生の操作", "timelineEmpty": "音声を選ぶと波形を表示します。", "timelineUnits": "時間（秒）・音高", "zoomOut": "縮小", "zoomIn": "拡大", "waveformLabel": "波形", "waveformDescription": "元音声の波形と秒数。押すと再生位置を移動します。", "pianoScrollLabel": "ピアノロール。横に時間、縦に音高をスクロールできます。", "pianoDescription": "検出した音符の音高と元音声上の時刻。", "timelineGuide": "音符の領域をスクロールして時間・音高を移動できます。音符を押すか、下の一覧から選んでください。", "selectedNote": "選択した音符", "noNoteSelected": "解析すると検出した音符を表示します。v0.2では音符を編集できません。", "playbackFailed": "再生を開始できませんでした。「再生」で再試行するか、最新のブラウザーでお試しください。", "playback_empty": "音声がありません", "playback_stopped": "停止中", "playback_starting": "再生を準備中…", "playback_playing": "再生中", "playback_paused": "一時停止中", "playback_ended": "再生が終わりました", "playback_disposed": "再生を終了しました"});
Object.assign(translations.en,{"recordingTitle": "Or record a melody", "recordingHint": "Microphone access starts only when you press Record. Up to 59 seconds.", "recordingLevel": "Microphone level", "recordingDuration": "Recording duration", "record": "Record", "stopRecording": "Stop recording", "listenRecording": "Listen", "discardRecording": "Discard recording", "saveRecordingOptional": "Save original recording (optional)", "recordingFilename": "Recording filename", "downloadRecording": "Download recording", "recordingDownloaded": "Recording download started", "recordingLocalHint": "Microphone access from a local HTML file depends on your browser. If unavailable, open the HTTPS app or choose an audio file.", "recordingReadyHint": "Listen before analyzing. Recording does not start analysis automatically.", "recording_idle": "Microphone off", "recording_requesting": "Waiting for microphone permission…", "recording_recording": "Recording", "recording_stopping": "Finishing recording…", "recording_recorded": "Recording stopped", "recording_error": "Recording unavailable", "recording_disposed": "Microphone off", "recording_preparing": "Checking recorded audio…", "discardRecordingTitle": "Discard this recording?", "discardActiveRecordingBody": "Recording will stop and this take will be discarded. Cancel to keep recording.", "discardRecordingBody": "This recording has not been downloaded. Continuing will remove it and its detected notes.", "stopRecordingTitle": "Stop recording and continue?", "stopRecordingBody": "The microphone will turn off. This take will stay available to listen to or analyze.", "mobileNavigation": "Workflow pages", "tabInput": "Input", "tabNotes": "Notes", "tabExport": "Export", "recordingDecodeFailed": "This browser could not decode its recorded audio. Save the recording if needed, then choose a WAV or MP3 file.", "helpRecording": "To record, press Record and allow microphone access. Stop, listen, then explicitly press Analyze audio. Recording stops at 59 seconds or when the page is hidden; the microphone never plays through speakers. You can download the original take. Replacement/reset asks before discarding an unsaved take. On phones, use Input / Notes / Export tabs. Local-file microphone support varies; use the HTTPS app or file input if unavailable.", "scopeNote": "v0.3 supports file input and microphone recording. Notes are read-only. The simple synth does not reproduce the original instrument.", "noNoteSelected": "Analyze audio to see the detected notes. Notes are read-only.", "formatHint": "WAV / MP3. M4A, AAC, OGG, FLAC and WebM depend on your browser.", "unsupportedFormat": "Choose WAV, MP3, M4A, AAC, OGG, FLAC or WebM. Your browser must support the format.", "helpNoteStorage": "Audio and notes exist only in this page session. Reloading or closing the page loses them. Download your MIDI and any original recording first; mobile browsers may not show an exit warning.", "recordingError_insecureContext": "Microphone access needs a secure browser context. Open the HTTPS app or choose an audio file.", "recordingError_microphoneUnavailable": "Microphone access is unavailable here. Choose an audio file instead.", "recordingError_recorderUnavailable": "This browser cannot record audio. Choose an audio file instead.", "recordingError_audioContextUnavailable": "This browser is missing audio support. Try a current browser or choose a file.", "recordingError_recordingUnsupported": "No supported recording format was found. Choose an audio file instead.", "recordingError_permissionDenied": "Microphone permission was denied. You can retry after changing browser permission, or choose an audio file.", "recordingError_noMicrophone": "No microphone was found. Connect one and retry, or choose an audio file.", "recordingError_microphoneBusy": "The microphone could not start. Check other apps or your device, then retry or choose a file.", "recordingError_microphoneLost": "The microphone disconnected. The incomplete take was discarded. Reconnect and record again, or choose a file.", "recordingError_recordingFailed": "Recording failed. Try again or choose an audio file.", "recordingError_recordingTooLarge": "Recording exceeded 50 MiB and was discarded. Try a shorter take or choose a file.", "recordingError_recordingEmpty": "No audio was recorded. Record at least half a second, or choose a file.", "recordingError_recordingStopTimeout": "Recording did not finish in time. The microphone is off. Try again or choose a file."});
Object.assign(translations.ja,{"recordingTitle": "または、その場で録音", "recordingHint": "「録音」を押したときだけマイクを許可します。最大59秒。", "recordingLevel": "マイクの音量", "recordingDuration": "録音時間", "record": "録音", "stopRecording": "録音を停止", "listenRecording": "試聴", "discardRecording": "録音を破棄", "saveRecordingOptional": "元の録音を保存（任意）", "recordingFilename": "録音の保存ファイル名", "downloadRecording": "録音を保存", "recordingDownloaded": "録音の保存を開始しました", "recordingLocalHint": "ローカルHTMLからのマイク利用はブラウザーによります。使えない場合はHTTPS版を開くか、音声ファイルを選んでください。", "recordingReadyHint": "試聴してから解析できます。録音停止だけでは解析は始まりません。", "recording_idle": "マイクは停止中", "recording_requesting": "マイクの許可を待っています…", "recording_recording": "録音中", "recording_stopping": "録音を仕上げています…", "recording_recorded": "録音を停止しました", "recording_error": "録音できませんでした", "recording_disposed": "マイクは停止中", "recording_preparing": "録音した音声を確認中…", "discardRecordingTitle": "この録音を破棄しますか？", "discardActiveRecordingBody": "録音を停止して、今回の録音を破棄します。キャンセルすると録音を続けます。", "discardRecordingBody": "この録音はまだ保存していません。続けると録音と検出した音符を消去します。", "stopRecordingTitle": "録音を停止して移動しますか？", "stopRecordingBody": "マイクを停止します。録音した音声は保持し、試聴や解析に使えます。", "mobileNavigation": "作業ページ", "tabInput": "入力", "tabNotes": "音符", "tabExport": "保存", "recordingDecodeFailed": "このブラウザーで録音を読み取れませんでした。必要なら録音を保存し、WAVまたはMP3ファイルを選んでください。", "helpRecording": "「録音」を押してマイクを許可し、停止・試聴してから「音声を解析」を押します。最大59秒、またはページが非表示になると録音を停止します。マイク音声をスピーカーに流すことはありません。元の録音も任意で保存できます。未保存の録音を入力変更やリセットで破棄する前に確認します。スマートフォンは「入力・音符・保存」タブで切り替えます。ローカルHTMLで録音できない場合はHTTPS版かファイル入力をご利用ください。", "scopeNote": "v0.3はファイル入力とマイク録音に対応しています。音符の編集はできません。簡易合成音は元の楽器の音色を再現しません。", "noNoteSelected": "解析すると検出した音符を表示します。音符の編集はできません。", "formatHint": "WAV / MP3。M4A・AAC・OGG・FLAC・WebMはブラウザーの対応によります。", "unsupportedFormat": "WAV・MP3・M4A・AAC・OGG・FLAC・WebMを選んでください。ブラウザーの対応も必要です。", "helpNoteStorage": "音声と音符はこのページを開いている間だけ保持します。再読み込みや終了で失われるため、MIDIと必要な元の録音を先に保存してください。スマートフォンでは終了前の警告が出ない場合があります。", "recordingError_insecureContext": "マイク利用には安全な接続が必要です。HTTPS版を開くか、音声ファイルを選んでください。", "recordingError_microphoneUnavailable": "ここではマイクを利用できません。音声ファイルを選んでください。", "recordingError_recorderUnavailable": "このブラウザーは録音に対応していません。音声ファイルを選んでください。", "recordingError_audioContextUnavailable": "音声処理に対応していません。最新のブラウザーかファイル入力をお試しください。", "recordingError_recordingUnsupported": "録音に使える形式がありません。音声ファイルを選んでください。", "recordingError_permissionDenied": "マイクの許可がありません。ブラウザーの許可設定を変更して再試行するか、音声ファイルを選んでください。", "recordingError_noMicrophone": "マイクが見つかりません。接続して再試行するか、音声ファイルを選んでください。", "recordingError_microphoneBusy": "マイクを開始できません。他のアプリや端末の状態を確認して再試行するか、ファイルを選んでください。", "recordingError_microphoneLost": "マイクとの接続が切れ、未完成の録音を破棄しました。接続して録音し直すか、ファイルを選んでください。", "recordingError_recordingFailed": "録音に失敗しました。再試行するか、音声ファイルを選んでください。", "recordingError_recordingTooLarge": "録音が50 MiBを超えたため破棄しました。短く録音するか、ファイルを選んでください。", "recordingError_recordingEmpty": "音声を録音できませんでした。0.5秒以上録音するか、ファイルを選んでください。", "recordingError_recordingStopTimeout": "録音の終了に時間がかかりすぎました。マイクは停止しています。再試行するか、ファイルを選んでください。"});
Object.assign(translations.en,{resetRecordingBody:'The current audio, unsaved recording and detected notes will be removed. The microphone will stop. Download anything you need first.'});
Object.assign(translations.ja,{resetRecordingBody:'音声・未保存の録音・検出した音符を消去して、マイクを停止します。必要なものは先に保存してください。'});
Object.assign(translations.en,{"editNotes": "Edit selected note", "addNote": "Add note", "deleteNote": "Delete note", "undoDeletion": "Undo deletion", "undoDelete": "Undo deletion", "editPitch": "Pitch", "editPitchHint": "C4 = MIDI 60 · C♯4 / Db4 or 0–127", "editStart": "Start (s)", "editEnd": "End (s)", "applyNote": "Apply values", "pitchDown": "Pitch −1", "pitchUp": "Pitch +1", "startEarlier": "Start −0.05 s", "startLater": "Start +0.05 s", "endEarlier": "End −0.05 s", "endLater": "End +0.05 s", "editsPending": "Unsaved note edits", "originManual": "Manually added", "originDetected": "From automatic detection", "editingHint": "Select a note to correct its pitch or timing. Overlapping notes are allowed. Add inserts C4 at the playback position.", "helpEditing": "Select a note, then use the nearby pitch and timing buttons or type values and Apply. C4 is MIDI 60; timing steps are 0.05 seconds. Add inserts C4 at the playback position. Delete can be undone with Undo deletion. Display, synthesized playback and MIDI use the edited notes. Reanalysis or replacing the audio discards edits after confirmation. Full edit Undo/Redo is planned for v0.5.", "scopeNote": "v0.4: record, review and manually correct notes. The simple synth does not reproduce the original instrument.", "noNoteSelected": "No note selected. After analysis, you can add a note even when none were detected.", "noteDeleted": "Note deleted", "invalidPitch": "Enter a note name such as C4 or Db4, or an integer MIDI number from 0 to 127.", "invalidNoteTime": "Use finite seconds: 0 ≤ start < end ≤ audio duration. The note has not changed.", "discardEditsTitle": "Discard unsaved note edits?", "discardEditsBody": "Your current note edits have not been downloaded as MIDI. Continuing will discard them. Cancel to keep editing or save first.", "discardEdits": "Discard edits", "resetEditsBody": "The current audio, recording and unsaved note edits will be removed. Download anything you need first.", "resultTitle": "Save your notes", "noteDetails": "Current note details", "noteLimit": "Showing up to 100 notes. All current notes are included in MIDI."});
Object.assign(translations.ja,{"editNotes": "選択した音符を編集", "addNote": "音符を追加", "deleteNote": "音符を削除", "undoDeletion": "削除を元に戻す", "undoDelete": "削除を元に戻す", "editPitch": "音高", "editPitchHint": "C4 = MIDI 60・C♯4 / Db4 または0〜127", "editStart": "開始（秒）", "editEnd": "終了（秒）", "applyNote": "入力値を適用", "pitchDown": "音程 −1", "pitchUp": "音程 +1", "startEarlier": "開始 −0.05秒", "startLater": "開始 +0.05秒", "endEarlier": "終了 −0.05秒", "endLater": "終了 +0.05秒", "editsPending": "未保存の音符編集があります", "originManual": "手動で追加した音符", "originDetected": "自動検出した音符", "editingHint": "音符を選んで音程や時刻を修正できます。音符の重なりも保存します。追加すると再生位置にC4を置きます。", "helpEditing": "音符を選び、近くの音程・時刻ボタンで修正するか、値を入力して「入力値を適用」を押します。C4はMIDI 60、時刻の刻みは0.05秒です。追加すると再生位置にC4を置きます。削除は「削除を元に戻す」で戻せます。表示・簡易合成音・MIDIには編集後の音符を使います。再解析や音声の変更で編集が消える前に確認します。すべての編集のUndo/Redoはv0.5で追加予定です。", "scopeNote": "v0.4は録音・確認・音符の手動修正に対応しています。簡易合成音は元の楽器の音色を再現しません。", "noNoteSelected": "音符を選択してください。解析後は検出が0音でも音符を追加できます。", "noteDeleted": "音符を削除しました", "invalidPitch": "C4・Db4などの音名、または0〜127の整数のMIDI番号を入力してください。", "invalidNoteTime": "0 ≤ 開始 < 終了 ≤ 音声の長さとなる秒数を入力してください。音符は変更していません。", "discardEditsTitle": "未保存の音符編集を破棄しますか？", "discardEditsBody": "編集後の音符はまだMIDIに保存していません。続けると編集を破棄します。残す場合はキャンセルし、先に保存してください。", "discardEdits": "編集を破棄", "resetEditsBody": "音声・録音・未保存の音符編集を消去します。必要なものは先に保存してください。", "resultTitle": "音符を保存", "noteDetails": "現在の音符の詳細", "noteLimit": "最大100音を表示しています。MIDIには現在の全音符を含みます。"});
Object.assign(translations.en,{"undoEdit": "Undo", "redoEdit": "Redo", "sensitivityPreset": "Detection sensitivity", "fewer": "Fewer notes", "standard": "Standard", "more": "More notes", "custom": "Custom", "detectionAdvanced": "Advanced detection settings", "onsetThreshold": "Onset threshold", "frameThreshold": "Frame threshold", "minimumNoteSeconds": "Minimum note length (s)", "minimumPitch": "Lowest MIDI pitch", "maximumPitch": "Highest MIDI pitch", "detectionSettingsHint": "Settings apply only when you press Analyze audio. Lower thresholds may find more notes, including false detections.", "invalidDetectionSettings": "Use thresholds from 0 to 1, minimum length from 0.01 to 2 seconds, and integer pitches 0–127 with lowest ≤ highest.", "detectionWarning": "This analysis produced unusually many notes. Lower sensitivity or narrow the pitch range, and review the result before saving.", "helpDetection": "Choose Fewer, Standard or More notes before analyzing. Quiet noise can also produce notes. Fewer may reduce unwanted notes but can miss weak or short notes; compare with the original audio. Advanced settings control onset/frame thresholds, minimum length and MIDI pitch range. Applying settings requires Analyze audio; unsaved edits require confirmation. Failed or cancelled reanalysis keeps the previous notes and history. Undo/Redo keeps up to 100 edits. Use Ctrl/⌘+Z and Ctrl/⌘+Shift+Z outside text fields.", "helpEditing": "Select a note and use the pitch/timing controls or type values and Apply. Add inserts C4 at the playback position. Undo/Redo restores additions, deletions and changes. Display, synthesized playback and MIDI use the same edited notes.", "scopeNote": "v0.5: record, adjust detection, review and edit notes with Undo/Redo. The simple synth does not reproduce the original instrument.", "postprocessingHint": "Applying your selected detection settings."});
Object.assign(translations.ja,{"undoEdit": "元に戻す", "redoEdit": "やり直す", "sensitivityPreset": "検出感度", "fewer": "少なめ", "standard": "標準", "more": "多め", "custom": "カスタム", "detectionAdvanced": "検出の詳細設定", "onsetThreshold": "Onsetしきい値", "frameThreshold": "Frameしきい値", "minimumNoteSeconds": "最短音符長（秒）", "minimumPitch": "最低音（MIDI番号）", "maximumPitch": "最高音（MIDI番号）", "detectionSettingsHint": "設定は「音声を解析」を押すと適用します。しきい値を下げると、誤検出を含め音符が増える場合があります。", "invalidDetectionSettings": "しきい値は0〜1、最短長さは0.01〜2秒、音域は0〜127の整数で最低音≤最高音にしてください。", "detectionWarning": "音符が大幅に増えています。感度を下げるか音域を狭め、保存前に結果を確認してください。", "helpDetection": "解析前に感度「少なめ・標準・多め」を選べます。小さな雑音でも音符が出ることがあります。「少なめ」は余計な音符を減らせる場合がありますが、必要な弱い音や短い音も見落とすことがあるため、元音声と聴き比べてください。詳細設定ではOnset/Frameしきい値、最短長さ、MIDI音域を指定します。「音声を解析」で適用し、未保存の編集があれば確認します。再解析の失敗・中止時は前の音符と履歴を保持します。Undo/Redoは最大100操作です。入力欄以外ではCtrl/⌘+Z、Ctrl/⌘+Shift+Zも使えます。", "helpEditing": "音符を選び、音程・時刻ボタンか直接入力で修正します。追加は再生位置にC4を置きます。追加・削除・変更は「元に戻す／やり直す」に対応します。表示・簡易合成音・MIDIは同じ編集後の音符を使います。", "scopeNote": "v0.5は録音・検出設定・音符編集とUndo/Redoに対応しています。簡易合成音は元の楽器の音色を再現しません。", "postprocessingHint": "選択した検出設定を適用しています。"});
Object.assign(translations.en,{detectionSettingsTitle:'Detection settings',presetFewer:'Fewer notes',presetStandard:'Standard',presetMore:'More notes',presetCustom:'Custom'});
Object.assign(translations.ja,{detectionSettingsTitle:'検出設定',presetFewer:'少なめ',presetStandard:'標準',presetMore:'多め',presetCustom:'カスタム'});
Object.assign(translations.en,{"splitNote": "Split selected note", "splitSeconds": "Split at (s)", "previewSplit": "Preview split", "mergeNote": "Merge adjacent notes", "mergeNoteId": "Merge with", "previewMerge": "Preview merge", "mergeHint": "Same pitch only; consecutive, non-overlapping notes with a gap of up to 0.05 s.", "noMergeCandidate": "No eligible adjacent note", "cleanupTitle": "Clean up notes", "shortNoteSeconds": "Shorter than (s)", "previewRemoveShort": "Preview short-note removal", "shortNotesHint": "Review all notes shorter than this limit, including manual notes. Nothing is removed automatically.", "quantizeEnabled": "Enable optional grid correction", "gridSeconds": "Grid spacing (seconds)", "quantizeMode": "Correct", "quantizeBoth": "Start and end", "quantizeStart": "Start only", "quantizeEnd": "End only", "previewQuantize": "Preview grid correction", "quantizeHint": "Off by default. Snap to the nearest seconds-grid from zero; no tempo is estimated. Notes that would become invalid are skipped.", "cleanupPreviewTitle": "Review changes before applying", "cleanupBefore": "Before", "cleanupAfter": "After", "applyCleanup": "Apply these changes", "cancelCleanup": "Cancel preview", "cleanupChanged": "Affected notes", "cleanupSkipped": "Skipped notes", "cleanupShown": "Showing up to 100 changes", "cleanupEmpty": "No changes are needed.", "cleanupRemoved": "Removed", "cleanupApplied": "Note cleanup applied", "invalidCleanup": "Check the values. Split inside the selected note; short-note limit 0.01–2 s; grid 0.01–1 s. Merge only eligible adjacent notes.", "staleCleanup": "The notes changed. Preview again before applying.", "helpCleanup": "Split a selected note at an interior time, or merge it with an eligible same-pitch neighbor (gap up to 0.05 s). Clean up notes previews short-note removal and optional seconds-grid correction. Review the before/after list and Apply; each batch is one Undo step. Grid correction starts off, never estimates tempo, and skips invalid results. No cleanup happens automatically.", "scopeNote": "v0.6: record, adjust detection, edit and clean up notes with Undo/Redo. The simple synth does not reproduce the original instrument."});
Object.assign(translations.ja,{"splitNote": "選択音符を分割", "splitSeconds": "分割する時刻（秒）", "previewSplit": "分割をプレビュー", "mergeNote": "隣り合う音符を結合", "mergeNoteId": "結合する相手", "previewMerge": "結合をプレビュー", "mergeHint": "同じ音高で、重ならず、間隔が0.05秒以内の隣り合う音符だけを結合できます。", "noMergeCandidate": "結合できる隣接音符がありません", "cleanupTitle": "音符を整理", "shortNoteSeconds": "この長さ未満（秒）", "previewRemoveShort": "短い音符の削除をプレビュー", "shortNotesHint": "手動追加を含め、指定より短い音符を確認できます。自動では削除しません。", "quantizeEnabled": "任意のグリッド補正を有効にする", "gridSeconds": "グリッドの間隔（秒）", "quantizeMode": "補正する時刻", "quantizeBoth": "開始と終了", "quantizeStart": "開始のみ", "quantizeEnd": "終了のみ", "previewQuantize": "グリッド補正をプレビュー", "quantizeHint": "初期状態はOFFです。0秒からの最寄りの秒単位グリッドに合わせます。テンポは推定しません。不正な長さになる音符は変更しません。", "cleanupPreviewTitle": "適用前に変更を確認", "cleanupBefore": "変更前", "cleanupAfter": "変更後", "applyCleanup": "この変更を適用", "cancelCleanup": "プレビューを中止", "cleanupChanged": "対象の音符", "cleanupSkipped": "変更しない音符", "cleanupShown": "変更の先頭100件まで表示", "cleanupEmpty": "変更対象はありません。", "cleanupRemoved": "削除", "cleanupApplied": "音符の整理を適用しました", "invalidCleanup": "値を確認してください。分割は音符の内側、短い音符は0.01〜2秒、グリッドは0.01〜1秒です。結合は条件に合う隣接音符だけに行えます。", "staleCleanup": "音符が変わりました。もう一度プレビューしてください。", "helpCleanup": "選択音符の内側の時刻で分割するか、同じ音高で間隔0.05秒以内の隣接音符と結合できます。「音符を整理」では短い音符の削除と任意の秒単位グリッド補正をプレビューします。変更前後を確認して適用すると、まとめて1回のUndoで戻せます。グリッド補正は初期OFFで、テンポを推定せず、不正な結果は変更しません。自動で整理することはありません。", "scopeNote": "v0.6は録音・検出設定・音符編集と整理・Undo/Redoに対応しています。簡易合成音は元の楽器の音色を再現しません。"});
Object.assign(translations.en,{splitTime:'Split at (s)',mergeWith:'Merge with',mergeNone:'No eligible adjacent note',shortNoteThreshold:'Shorter than (s)',cleanupChange:'Change'});
Object.assign(translations.ja,{splitTime:'分割する時刻（秒）',mergeWith:'結合する相手',mergeNone:'結合できる隣接音符がありません',shortNoteThreshold:'この長さ未満（秒）',cleanupChange:'変更'});
Object.assign(translations.en,{helpPerformance:'Analysis uses bounded input windows and reuses the local model after successful runs. Cancel, changing audio during analysis, hiding the page or Reset stops active work. Returning does not restart it; press Analyze again. Completed notes remain after an interrupted reanalysis. The timeline draws visible content as you scroll. Input remains limited to 60 seconds; larger files are not supported.',scopeNote:'v0.7: local analysis with bounded windows, model reuse and visible-range timelines. The simple synth does not reproduce the original instrument.'});
Object.assign(translations.ja,{helpPerformance:'解析は入力を小さな区間に分け、完了後は端末内のモデルを再利用します。キャンセル・解析中の入力変更・ページを隠す操作・リセットで処理を停止します。戻っても自動再開しないため、もう一度「音声を解析」を押してください。再解析を中止しても前の完成済み音符は残ります。波形と音符はスクロールに合わせて表示範囲を描画します。入力上限は60秒のままで、それより長い音声には対応していません。',scopeNote:'v0.7は小区間での端末内解析・モデル再利用・可視範囲のタイムライン描画に対応しています。簡易合成音は元の楽器の音色を再現しません。'});
Object.assign(translations.en,{outputFormat:'File format',formatMidi:'MIDI (.mid)',formatCsv:'Note table (.csv)',downloadCsv:'Download CSV',csvDownloaded:'CSV download started',stepOutput:'03 / EXPORT',csvNote:'CSV saves the current note table: start/end in seconds, MIDI pitch and fixed velocity 96. It contains no audio. Times are not rounded to MIDI ticks.',midiNote:'MIDI contains notes, not audio. Fixed 120 BPM preserves timing in seconds; it is not an estimated tempo. Velocity is fixed at 96. Your music app chooses the sound, which can differ from this preview. Overlapping notes of the same pitch may play differently between apps.',discardEditsBody:'Your current note edits have not been downloaded. Continuing will discard them. Cancel to keep editing or save first.',helpExport:'Choose MIDI for a music app or CSV for a note table, edit the filename, then Download. Both use the current edited notes and contain no audio. CSV preserves the exact note times in seconds. MIDI uses fixed 120 BPM only to convert seconds to ticks, with fixed velocity 96 and no pitch bends. Same-pitch overlaps can be interpreted differently by music apps; CSV retains their exact individual times. The downloaded instrument sound may differ from this simple preview.',scopeNote:'Record, review and correct notes, then save MIDI or a CSV note table. The simple synth does not reproduce the original instrument.'});
Object.assign(translations.ja,{outputFormat:'保存形式',formatMidi:'MIDI（.mid）',formatCsv:'音符の表（.csv）',downloadCsv:'CSVを保存',csvDownloaded:'CSVの保存を開始しました',stepOutput:'03 / 書き出し',csvNote:'現在の音符を開始・終了の秒数、MIDI音高、固定ベロシティ96の表として保存します。音声は含まず、時刻をMIDIの刻みに丸めません。',midiNote:'MIDIは音符のデータで、音声ではありません。120 BPMは秒数を保つための固定値で、推定テンポではありません。ベロシティは96固定です。音色は再生する音楽アプリによって変わり、この試聴音とは異なる場合があります。同じ音高の重なった音符はアプリによって再生が異なることがあります。',discardEditsBody:'現在の音符編集はまだ保存していません。続けると編集を破棄します。編集を続けるには中止するか、先に保存してください。',helpExport:'音楽アプリにはMIDI、音符の表にはCSVを選び、保存名を編集して保存します。どちらも現在の編集済み音符から作られ、音声は含みません。CSVは各音符の秒数をそのまま保存します。MIDIの120 BPMは秒数をtickに換算するための固定値で、ベロシティは96固定、ピッチベンドは含みません。同じ音高の重なりは音楽アプリによって解釈が異なりますが、CSVには個々の時刻をそのまま残します。再生する音色はこの簡易試聴と異なる場合があります。',scopeNote:'録音・確認・音符の修正から、MIDIやCSVの音符表の保存まで対応しています。簡易合成音は元の楽器の音色を再現しません。'});
Object.assign(translations.en,{helpOffline:'Both normal and self-extracting HTML work offline in compatible browsers. Both require DecompressionStream to unpack embedded assets.',accuracyNote:'Transcription is an estimate. Review the notes and check exported MIDI in your music app.',postprocessingHint:'Applying your selected detection settings.'});
Object.assign(translations.ja,{helpOffline:'通常版と自己展開版は対応ブラウザーでオフライン利用できます。どちらも内包資産の展開にDecompressionStream対応が必要です。',accuracyNote:'採譜は推定です。音符を確認し、保存したMIDIも音楽アプリで確認してください。',postprocessingHint:'選択した検出設定を適用しています。'});
// Keep shared loss/help guidance correct for either supported note export.
for(const key of ['resultHint','resetBody','helpStep3','helpNoteStorage','noteLimit','helpEditing']){
 translations.en[key]=translations.en[key].replaceAll('MIDI','MIDI or CSV');
 translations.ja[key]=translations.ja[key].replaceAll('MIDI','MIDIまたはCSV');
}
const languageKey=APP_CONFIG.slug+':language';
function readStorage(key){try{return localStorage.getItem(key);}catch{return null;}}
function writeStorage(key,value){try{localStorage.setItem(key,value);}catch{}}
let language=readStorage(languageKey)||((navigator.language||'').startsWith('ja')?'ja':'en');
if(!translations[language])language='en';
function translate(key){return translations[language][key]||translations.en[key]||key;}
__UI_COMPONENTS__
const generation=core.createGeneration();
const state={phase:'empty',file:null,duration:0,samples:null,originalBuffer:null,notes:[],progress:0,error:null,inputError:null,elapsed:0,sourceKind:null,detectionWarning:false};
let editor=null, editError=null, editRevision=0, cleanupPending=null, cleanupError=null;
const settingsFields=['onsetThreshold','frameThreshold','minimumNoteSeconds','minimumPitch','maximumPitch'];
const settingsKeys={onsetThreshold:'onsetThreshold',frameThreshold:'frameThreshold',minimumNoteSeconds:'minDurationSeconds',minimumPitch:'minPitchMidi',maximumPitch:'maxPitchMidi'};
let settingsError=false;
function readDetectionSettings(){
 const values=Object.fromEntries(settingsFields.map(key=>[settingsKeys[key],$('#'+key).value.trim()===''?NaN:Number($('#'+key).value)]));
 try{const settings=AudioMidiSettings.validate(values);settingsError=false;return settings;}catch(error){settingsError=error.field||'settings';return null;}
}
function invalidSettingsFields(){return settingsError==='pitchRange'?['minimumPitch','maximumPitch']:settingsFields.filter(key=>settingsKeys[key]===settingsError);}
function fillDetectionSettings(values){for(const key of settingsFields)$('#'+key).value=String(values[settingsKeys[key]]);settingsError=false;}
const review=AudioMidiReview.create({translate,onEdit:editNotes,onSelection:()=>{editError=null;clearCleanup();review.setEditing({mergeCandidates:editor?.mergeCandidates(review.selectedId())||[]});renderCleanup();}});
function editingEnabled(){return !!editor&&!busy()&&!recording?.active()&&!recording?.preparing();}
function clearEditing(){clearCleanup();$('#quantizeEnabled').checked=false;editor=null;editError=null;editRevision++;AppToast.dismiss();}
function syncEdited(note){
 clearCleanup();
 state.notes=editor.snapshot();state.phase=state.notes.length?'result':'no-notes';state.error=null;editError=null;editRevision++;
 render();if(note&&state.notes.some(current=>current.id===note.id))review.select(note.id);
}
function editNotes(action){
 if(!editingEnabled())return;
 if(action.type.startsWith('preview')){previewCleanup(action);return;}
 try{
  let note=null;
  if(action.type==='update'){
   const patch={...action.patch};if('pitchInput' in patch){patch.pitchMidi=AudioMidiEditing.parsePitch(patch.pitchInput);delete patch.pitchInput;}
   note=editor.update(action.id,patch);
  }else if(action.type==='add'){
   const start=Math.max(0,Math.min(state.duration-.05,review.snapshot().position));
   note=editor.add({pitchMidi:60,startSeconds:start,endSeconds:Math.min(state.duration,start+.5)});
  }else if(action.type==='delete'){
   note=editor.remove(action.id);if(!note)return;
   const session=editor;syncEdited();const revision=editRevision;
   showToast('noteDeleted',{actionLabel:translate('undoDelete'),duration:7000,onAction:()=>{if(editor===session&&editRevision===revision&&editingEnabled())editNotes({type:'undo'});}});return;
  }else if(action.type==='undo'){AppToast.dismiss();note=editor.undo();}
  else if(action.type==='redo'){AppToast.dismiss();note=editor.redo();}
  if(note){AppToast.dismiss();syncEdited(note);}else{editError=null;render();}
 }catch(error){editError=error.code==='pitch'?'invalidPitch':'invalidNoteTime';render();}
}
function clearCleanup(){cleanupPending=null;cleanupError=null;}
function previewCleanup(action){
 clearCleanup();
 try{
  const plan=action.type==='previewSplit'?editor.previewSplit(action.id,action.seconds):action.type==='previewMerge'?editor.previewMerge(action.id,action.otherId):action.type==='previewRemoveShort'?editor.previewRemoveShort(action.threshold):editor.previewQuantize(action.gridSeconds,action.mode);
  if(!plan)throw new Error('missing');cleanupPending={plan,session:editor,revision:editRevision};
 }catch{cleanupError='invalidCleanup';}
 renderCleanup();if(cleanupPending)$('#cleanupPreview').scrollIntoView({block:'nearest'});
}
function renderCleanup(){
 const pending=cleanupPending,plan=pending?.plan;
 $('#cleanupError').hidden=!cleanupError;$('#cleanupError').textContent=cleanupError?translate(cleanupError):'';
 $('#cleanupPreview').hidden=!plan;
 if(!plan)return;
 $('#cleanupSummary').textContent=`${translate('cleanupChanged')}: ${plan.count} · ${translate('cleanupSkipped')}: ${plan.skippedCount||0}. ${plan.changes.length?translate('cleanupShown'):translate('cleanupEmpty')}`;
 const describe=note=>note?`${pitchName(note.pitchMidi)} · ${note.startSeconds}–${note.endSeconds} s`:'—';
 $('#cleanupRows').replaceChildren(...plan.changes.slice(0,100).map((change,index)=>{const row=document.createElement('tr');for(const text of [String(index+1),describe(change.before),describe(change.after)]){const cell=document.createElement('td');cell.textContent=text;row.append(cell);}return row;}));
 $('#applyCleanupButton').disabled=!editingEnabled()||!plan.changes.length||pending.session!==editor||pending.revision!==editRevision;
}
function applyCleanup(){
 if(!editingEnabled()||!cleanupPending)return;
 const pending=cleanupPending;
 if(pending.session!==editor||pending.revision!==editRevision){clearCleanup();cleanupError='staleCleanup';renderCleanup();return;}
 try{
  const note=editor.applyPlan(pending.plan);clearCleanup();if(!note){renderCleanup();return;}
  const session=editor;syncEdited(note);const revision=editRevision;
  showToast('cleanupApplied',{actionLabel:translate('undoEdit'),duration:7000,onAction:()=>{if(editor===session&&editRevision===revision&&editingEnabled())editNotes({type:'undo'});}});
 }catch{clearCleanup();cleanupError='staleCleanup';renderCleanup();}
}
async function confirmEdits(){
 if(!editor?.dirty())return true;
 const session=editor,revision=editRevision,token=generation.capture();
 const ok=await AppConfirm.ask({title:translate('discardEditsTitle'),message:translate('discardEditsBody'),confirmLabel:translate('discardEdits'),tone:'danger'});
 return ok&&editor===session&&revision===editRevision&&generation.isCurrent(token);
}
let worker=null,workerUrl=null,decodeContext=null,recording=null,mobile=null;
let sourceRequest=0,sourcePermission=null;
const busy=()=>['decoding','loading-model','analyzing','postprocessing'].includes(state.phase);
function stopWorker(){if(worker){worker.terminate();worker=null;}if(workerUrl){URL.revokeObjectURL(workerUrl);workerUrl=null;}}
function closeDecoder(){const context=decodeContext;decodeContext=null;if(context&&context.state!=='closed')context.close().catch(()=>{});}
function invalidate({keepIdleWorker=false}={}){const token=generation.next();if(!keepIdleWorker||busy())stopWorker();closeDecoder();return token;}
function pitchName(pitch){return ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][pitch%12]+(Math.floor(pitch/12)-1);}
function render(){
 document.body.dataset.phase=state.phase;
 const invalidFields=invalidSettingsFields();
 $('#detectionSettingsError').hidden=!settingsError;$('#detectionSettingsError').textContent=settingsError?[...invalidFields.map(translate),translate('invalidDetectionSettings')].join(' · '):'';
 for(const key of settingsFields)$('#'+key).setAttribute('aria-invalid',String(invalidFields.includes(key)));
 $('#detectionWarning').hidden=!state.detectionWarning;$('#detectionWarning').textContent=translate('detectionWarning');
 for(const key of [...settingsFields,'sensitivityPreset'])$('#'+key).disabled=busy()||!!recording?.active();
 $('#inputError').hidden=!state.inputError;$('#inputError').textContent=state.inputError?translate(state.inputError):'';
 $('#sourceInfo').hidden=!state.file;$('#sourceName').textContent=state.file?.name||'';
 $('#sourceMeta').textContent=state.file?`${translate('size')}: ${(state.file.size/1048576).toFixed(2)} MiB${state.duration?' · '+translate('duration')+': '+state.duration.toFixed(2)+' '+translate('seconds'):''}`:'';
 $('#analyzeButton').disabled=busy()||!state.samples||recording?.active()||recording?.preparing();
 $('#cancelButton').hidden=!busy();$('#resetButton').disabled=state.phase==='empty'&&!recording?.active()&&!recording?.hasRecording();
 $('#downloadButton').disabled=state.phase!=='result'||!state.notes.length||recording?.active();
 const csv=$('#outputFormat').value==='csv';
 $('#outputExtension').textContent=csv?'.csv':'.mid';
 $('#downloadButton').textContent=translate(csv?'downloadCsv':'download');
 $('#midiNote').textContent=translate(csv?'csvNote':'midiNote');
 $('#statusText').textContent=translate(state.phase);
 $('#statusHint').textContent=translate(state.error||state.phase+'Hint');
 $('#progressBar').hidden=!busy();
 if(state.phase==='analyzing'||state.phase==='postprocessing')$('#progressBar').value=state.progress;else $('#progressBar').removeAttribute('value');
 $('#noteCount').textContent=['result','no-notes'].includes(state.phase)?state.notes.length:'—';
 $('#resultMeta').textContent=state.notes.length?`${translate('range')}: ${pitchName(Math.min(...state.notes.map(n=>n.pitchMidi)))}–${pitchName(Math.max(...state.notes.map(n=>n.pitchMidi)))} · ${translate('elapsed')}: ${(state.elapsed/1000).toFixed(1)} ${translate('seconds')}`:'';
 $('#notesDetails').hidden=!state.notes.length;
 $('#noteRows').replaceChildren(...state.notes.slice(0,100).map(n=>{const row=document.createElement('div');row.className='note-row';[`${pitchName(n.pitchMidi)} (${n.pitchMidi})`,n.startSeconds.toFixed(3),n.endSeconds.toFixed(3)].forEach(text=>{const cell=document.createElement('span');cell.textContent=text;row.append(cell);});return row;}));
 $('#noteLimit').textContent=state.notes.length>100?translate('noteLimit'):'';
 review.setSession(state.originalBuffer,state.notes);review.setLocked(!!recording?.active());review.setEditing({enabled:editingEnabled(),dirty:!!editor?.dirty(),canUndo:!!editor?.canUndo(),canRedo:!!editor?.canRedo(),mergeCandidates:editor?.mergeCandidates(review.selectedId())||[],error:editError?translate(editError):null});review.render();
 renderCleanup();
 recording?.render();
 if(mobile){
  mobile.setEnabled('notes',!!state.originalBuffer||!!recording?.active());
  mobile.setEnabled('export',state.phase==='result'&&!!state.notes.length&&!recording?.active());
  if(mobile.button(mobile.currentPage())?.disabled)mobile.showPage('input',{scroll:false});
 }
}
function applyLanguage(){
 document.documentElement.lang=language;
 document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=translate(el.dataset.i18n);});
 document.querySelectorAll('[data-i18n-title]').forEach(el=>{el.title=translate(el.dataset.i18nTitle);});
 document.querySelectorAll('[data-i18n-aria-label]').forEach(el=>el.setAttribute('aria-label',translate(el.dataset.i18nAriaLabel)));
 // Translate an active toast without restarting its dismissal timer.
 if($('#appToast').classList.contains('show')){if(!$('#appToastAction').hidden)$('#appToastAction').textContent=translate('undoEdit');const message=$('#appToastMessage');if(message.dataset.messageKey)message.textContent=translate(message.dataset.messageKey);}
 $('#languageButton').textContent=language==='ja'?'EN':'JA';$('#languageButton').setAttribute('aria-label',language==='ja'?'英語に切り替え':'Switch to Japanese');
 document.title=language==='ja'?APP_CONFIG.nameJa:APP_CONFIG.name;$('#brandName').textContent=document.title;$('#footerName').textContent=document.title;render();
}
async function selectFiles(files,{recorded=false}={}){
 if(files.length!==1){if(files.length){state.inputError='multipleFiles';render();}return;}
 const file=files[0],error=core.validateFile(file);
 if(error){state.inputError=error;render();return false;}
 const request=++sourceRequest,requestGeneration=generation.capture();
 if(!recorded){
  // Concurrent file selections share the same loss-confirmation decision; only
  // the latest valid request may install a source after it resolves.
  if(!sourcePermission)sourcePermission=(async()=>await confirmEdits()&&await recording.replace())();
  const permission=sourcePermission;let allowed;
  try{allowed=await permission;}finally{if(sourcePermission===permission)sourcePermission=null;}
  if(!allowed)return false;
 }
 if(request!==sourceRequest||!generation.isCurrent(requestGeneration))return false;
 clearEditing();
 const token=invalidate({keepIdleWorker:true});Object.assign(state,{phase:'decoding',file,duration:0,samples:null,originalBuffer:null,notes:[],error:null,inputError:null,progress:0,elapsed:0,sourceKind:recorded?'recording':'file',detectionWarning:false});
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
  state.samples=samples;state.originalBuffer=audio;state.phase='ready';render();return true;
 }catch(error){if(generation.isCurrent(token)){stopWorker();state.phase='error';state.error=['invalidDuration','browserUnsupported'].includes(error.message)?error.message:(recorded?'recordingDecodeFailed':'decodeFailed');render();}return false;}
 finally{if(decodeContext===context)closeDecoder();}
}
async function analyze(){
 if(busy()||!state.samples||recording.active()||recording.preparing())return;
 const settings=readDetectionSettings();if(!settings){render();$('#detectionAdvanced').open=true;const invalidField=invalidSettingsFields()[0];if(invalidField)$('#'+invalidField).focus();return;}
 if(!await confirmEdits())return;
 if(busy()||!state.samples||recording.active()||recording.preparing())return;
 clearCleanup();AppToast.dismiss();review.pause();
 const previousCount=state.notes.length;
 const token=generation.next();Object.assign(state,{phase:'loading-model',error:null,inputError:null,progress:0});render();
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
   if(!generation.isCurrent(token)||worker!==activeWorker||event.data.jobId!==token)return;
   const result=event.data;
   if(result.phase==='complete'){
    editor=AudioMidiEditing.createSession(core.normalizeNotes(result.notes,state.duration),state.duration);state.notes=editor.snapshot();state.elapsed=result.elapsedMs;editRevision++;editError=null;
    state.detectionWarning=state.notes.length>1000||(previousCount>0&&state.notes.length>100&&state.notes.length>previousCount*3);
    state.phase=state.notes.length?'result':'no-notes';state.progress=1;
   }else if(result.phase==='error'){restoreAnalysis('analysisFailed');stopWorker();}
   else{state.phase=result.phase;state.progress=result.progress||0;}
   render();
  };
  activeWorker.onerror=event=>{console.error('Audio worker failed:',event.message);event.preventDefault();if(generation.isCurrent(token)){restoreAnalysis('analysisFailed');stopWorker();render();}};
  const copy=new Float32Array(state.samples);
  const payload={jobId:token,settings,samples:copy};
  if(activeWorker.modelJson){payload.modelJson=activeWorker.modelJson;payload.weights=activeWorker.modelWeights.buffer;}
  activeWorker.postMessage(payload,[copy.buffer]);
  // Bootstrap data is needed only once. The idle worker owns the loaded model.
  activeWorker.modelJson=null;activeWorker.modelWeights=null;
 }catch(error){console.error('Audio runtime preparation failed:',error);if(generation.isCurrent(token)){stopWorker();restoreAnalysis('analysisFailed');render();}}
}
function restoreAnalysis(error=null){state.phase=editor?(state.notes.length?'result':'no-notes'):(error?'error':'cancelled');state.error=error;state.progress=0;}
function clearSource(){
 clearEditing();invalidate();$('#outputFormat').value='mid';Object.assign(state,{phase:'empty',file:null,samples:null,originalBuffer:null,notes:[],duration:0,error:null,inputError:null,sourceKind:null,detectionWarning:false});outputFilename.value='audio-to-midi-notes';render();
}
recording=AudioMidiRecordingUI.create({translate,onChange:render,isBusy:busy,confirm:options=>AppConfirm.ask(options),toast:showToast,
 beforeReplace:confirmEdits,onStart:()=>{review.pause();clearSource();},onRecording:file=>selectFiles([file],{recorded:true}),
 onDiscard:()=>{if(state.sourceKind==='recording')clearSource();},
 onListen:()=>{mobile.showPage('notes');review.playOriginal();}
});
mobile=AppMobileBottomBar.mount($('#mobileBottomBar'),{initialPage:'input',pageTopOffset:90,
 beforePageChange:async key=>{if(!await recording.leave())return false;return key==='input'||(key==='notes'?!!state.originalBuffer:state.phase==='result');},
 onPageChange:({key})=>{if(key==='notes')review.reveal();else review.pause();}
});
$('#audioFile').addEventListener('change',event=>{const files=Array.from(event.target.files);event.target.value='';selectFiles(files);});
const drop=$('#dropZone');
for(const type of ['dragenter','dragover'])drop.addEventListener(type,event=>{event.preventDefault();drop.classList.add('dragging');});
for(const type of ['dragleave','drop'])drop.addEventListener(type,event=>{event.preventDefault();drop.classList.remove('dragging');});
drop.addEventListener('drop',event=>selectFiles(Array.from(event.dataTransfer.files)));
window.addEventListener('dragover',event=>event.preventDefault());window.addEventListener('drop',event=>event.preventDefault());
fillDetectionSettings(AudioMidiSettings.presets.standard);
$('#sensitivityPreset').addEventListener('change',()=>{const preset=AudioMidiSettings.presets[$('#sensitivityPreset').value];if(preset)fillDetectionSettings(preset);render();});
for(const key of settingsFields)$('#'+key).addEventListener('input',()=>{$('#sensitivityPreset').value='custom';if(settingsError)readDetectionSettings();render();});
document.addEventListener('keydown',event=>{
 if(event.defaultPrevented||event.isComposing||event.altKey||!(event.ctrlKey||event.metaKey)||document.querySelector('dialog[open]'))return;
 if(event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
 const key=event.key.toLowerCase();const action=key==='z'?(event.shiftKey?'redo':'undo'):key==='y'&&!event.metaKey?'redo':null;
 if(action&&editingEnabled()&&(action==='undo'?editor.canUndo():editor.canRedo())){event.preventDefault();editNotes({type:action});}
});
$('#applyCleanupButton').addEventListener('click',applyCleanup);
$('#cancelCleanupButton').addEventListener('click',()=>{clearCleanup();renderCleanup();});
for(const id of ['splitSeconds','mergeNoteId','shortNoteSeconds','quantizeEnabled','gridSeconds','quantizeMode'])$('#'+id).addEventListener('input',()=>{clearCleanup();renderCleanup();});
$('#analyzeButton').addEventListener('click',analyze);
$('#cancelButton').addEventListener('click',()=>{invalidate();restoreAnalysis();render();});
$('#resetButton').addEventListener('click',async()=>{
 const revision=editRevision;const token=generation.capture(); // A cancelled dialog must not invalidate an active job.
 if(!await AppConfirm.ask({title:translate('resetTitle'),message:translate(editor?.dirty()?'resetEditsBody':recording.active()||recording.unsaved()?'resetRecordingBody':'resetBody'),confirmLabel:translate('reset'),tone:'danger'}))return;
 if(!generation.isCurrent(token)||revision!==editRevision)return;
 recording.clear();clearSource();
});
$('#downloadButton').addEventListener('click',()=>{
 if(state.phase!=='result'||!state.notes.length||recording.active())return;
 const csv=$('#outputFormat').value==='csv';
 const filename=csv?core.safeCsvName(outputFilename.value):core.safeMidiName(outputFilename.value);outputFilename.value=filename.replace(/\.(?:mid|csv)$/,'');
 const data=csv?core.encodeCsv(state.notes):core.encodeMidi(state.notes);
 const url=URL.createObjectURL(new Blob([data],{type:csv?'text/csv;charset=utf-8':'audio/midi'}));blobUrls.add(url);
 const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;document.body.append(anchor);anchor.click();anchor.remove();
 setTimeout(()=>{URL.revokeObjectURL(url);blobUrls.delete(url);},60000);editor?.markSaved();editRevision++;clearCleanup();render();showToast(csv?'csvDownloaded':'downloaded');
});
$('#outputFormat').addEventListener('change',render);
$('#languageButton').addEventListener('click',()=>{language=language==='ja'?'en':'ja';writeStorage(languageKey,language);applyLanguage();});
const helpDialog=$('#helpDialog');AppDialog.watch(helpDialog);$('#helpButton').addEventListener('click',()=>AppDialog.open(helpDialog));$('#closeHelpButton').addEventListener('click',()=>AppDialog.close(helpDialog));
helpDialog.addEventListener('click',event=>{if(event.target!==helpDialog)return;const r=helpDialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)AppDialog.close(helpDialog);});
$('#licensesDetails').addEventListener('toggle',()=>{if($('#licensesDetails').open)$('#licenseText').textContent=THIRD_PARTY_NOTICES;});
window.addEventListener('pagehide',event=>{
 const wasBusy=busy();invalidate();review.pause();
 if(event.persisted)recording.suspend();else recording.dispose();
 if(event.persisted){
  // BFCache restores this same document: keep completed data, cancel interrupted work coherently.
  if(wasBusy)restoreAnalysis();
 }else{review.dispose();state.samples=null;state.originalBuffer=null;state.notes=[];state.phase='empty';}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){review.pause();recording.suspend();if(busy()){invalidate();restoreAnalysis();render();}}});
window.addEventListener('beforeunload',event=>{if(recording.active()||recording.unsaved()||editor?.dirty()){event.preventDefault();event.returnValue='';}});
window.addEventListener('pageshow',event=>{if(event.persisted)render();});
$('#versionBadge').textContent='v'+APP_CONFIG.version;$('#buildVersion').textContent=APP_CONFIG.version;$('#builtAt').textContent=BUILD_MANIFEST.generatedAtUtc;$('#dependencyCount').textContent=BUILD_MANIFEST.dependencies.length;
applyLanguage();
