/* Waveform/piano-roll view and selected-note controls. All positions are original
 * clip seconds. The caller owns note mutations, validation and edit history. */
const AudioMidiReview = (() => {
  function create({translate,onEdit,onSelection}) {
    const $=id=>document.getElementById(id), t=AudioMidiTimeline;
    const card=$('reviewCard'), panel=$('timelinePanel'), piano=$('pianoScroll'), wave=$('waveScroll');
    const svg=$('pianoRoll'), waveform=$('waveform'), pitchLabels=$('pitchLabels'), picker=$('notePicker');
    const seek=$('seekPosition'), mode=$('playbackMode');
    let buffer=null, notes=[], peaks=[], selected=null, zoom=80, view=null, lastWidth=0, error=false, player=null, locked=false, needsReveal=false;
    const editFields={pitch:$('editPitch'),start:$('editStart'),end:$('editEnd')};
    const splitSeconds=$('splitSeconds'),mergePicker=$('mergeNoteId'),quantizeEnabled=$('quantizeEnabled');
    const editing={enabled:false,dirty:false,canUndo:false,canRedo:false,error:null,mergeCandidates:[]};
    let fieldSignature,mergeSignature;
    function node(name,attributes={},text){const el=document.createElementNS('http://www.w3.org/2000/svg',name);for(const [key,value] of Object.entries(attributes))el.setAttribute(key,String(value));if(text!==undefined)el.textContent=text;return el;}
    function selectedNote(){return notes.find(n=>n.id===selected);}
    function refreshMergeCandidates(){
      const candidates=selectedNote()&&Array.isArray(editing.mergeCandidates)?editing.mergeCandidates.filter(note=>note.id!==selected):[];
      const labels=candidates.map(note=>`${translate('editPitch')}: ${t.pitchName(note.pitchMidi)} · ${translate('editStart')}: ${note.startSeconds.toFixed(3)} s · ${translate('editEnd')}: ${note.endSeconds.toFixed(3)} s`);
      const signature=JSON.stringify([selected,candidates.map(note=>note.id),labels,translate('mergeNone')]);
      if(signature!==mergeSignature){
        const previous=mergePicker.value;mergeSignature=signature;
        const options=candidates.map((note,index)=>{const option=document.createElement('option');option.value=note.id;option.textContent=labels[index];return option;});
        if(!options.length){const option=document.createElement('option');option.value='';option.textContent=translate('mergeNone');options.push(option);}
        mergePicker.replaceChildren(...options);
        if(candidates.some(note=>note.id===previous))mergePicker.value=previous;
      }
      return candidates.length>0;
    }
    function refreshEditor(){
      const note=selectedNote(),enabled=!!buffer&&editing.enabled&&!locked&&typeof onEdit==='function';
      $('noteEditor').dataset.enabled=String(enabled);$('noteEditor').dataset.dirty=String(!!editing.dirty);
      $('addNoteButton').disabled=!enabled;$('undoNoteButton').disabled=!enabled||!editing.canUndo;
      $('redoNoteButton').disabled=!enabled||!editing.canRedo;
      for(const id of ['deleteNoteButton','applyNoteButton','pitchDown','pitchUp','startEarlier','startLater','endEarlier','endLater'])$(id).disabled=!enabled||!note;
      for(const field of Object.values(editFields))field.disabled=!enabled||!note;
      $('noteDirty').hidden=!editing.dirty;$('noteDirty').textContent=translate('editsPending');
      $('noteOrigin').hidden=!note;$('noteOrigin').textContent=note?translate(note.origin==='manual'?'originManual':'originDetected'):'';
      $('noteOrigin').dataset.origin=note?.origin||'';
      const editError=editing.error;
      $('noteEditError').hidden=!editError;$('noteEditError').textContent=editError||'';
      // The application provides the localized validation message. Keep the
      // attempted text intact so an invalid field can be corrected in place.
      for(const field of Object.values(editFields))field.setAttribute('aria-invalid',String(!!editError));
      splitSeconds.disabled=!enabled||!note;$('splitNoteButton').disabled=!enabled||!note;
      splitSeconds.min=note?String(note.startSeconds):'0';splitSeconds.max=note?String(note.endSeconds):'';
      const hasMergeCandidates=refreshMergeCandidates();
      mergePicker.disabled=!enabled||!note||!hasMergeCandidates;$('mergeNotesButton').disabled=mergePicker.disabled;
      $('shortNoteSeconds').disabled=!enabled;$('previewShortButton').disabled=!enabled||!notes.length;
      quantizeEnabled.disabled=!enabled;
      for(const id of ['gridSeconds','quantizeMode','previewQuantizeButton'])$(id).disabled=!enabled||!quantizeEnabled.checked||!notes.length;
    }
    function fillEditor(){
      const note=selectedNote(),signature=note?JSON.stringify([note.id,note.pitchMidi,note.startSeconds,note.endSeconds]):null;
      if(signature===fieldSignature)return;
      fieldSignature=signature;
      editFields.pitch.value=note?t.pitchName(note.pitchMidi):'';
      // String preserves the stored timing precision. Rounded display text must
      // never be read back as the model value when applying a different field.
      editFields.start.value=note?String(note.startSeconds):'';
      editFields.end.value=note?String(note.endSeconds):'';
      // Re-rendering transport, validation or language must preserve the user's
      // split draft. Only a different selected note/model resets its midpoint.
      splitSeconds.value=note?String(note.startSeconds+(note.endSeconds-note.startSeconds)/2):'';
    }
    function selectedDetails(){
      const note=selectedNote();
      picker.value=selected||'';
      $('selectedNoteDetails').textContent=note?`${t.pitchName(note.pitchMidi)} (MIDI ${note.pitchMidi}) · ${translate('start')}: ${note.startSeconds.toFixed(3)} s · ${translate('end')}: ${note.endSeconds.toFixed(3)} s`:translate('noNoteSelected');
      $('selectedNoteDetails').dataset.noteId=note?.id||'';
      for(const el of svg.querySelectorAll('[data-note-id]'))el.classList.toggle('selected',el.dataset.noteId===selected);
      refreshEditor();
    }
    function select(id){
      const next=notes.some(note=>note.id===id)?id:null,changed=selected!==next;
      selected=next;
      if(changed){editing.error=null;fillEditor();}
      selectedDetails();showSelection();
      if(changed&&typeof onSelection==='function')onSelection(selected);
      return selected;
    }
    function emitEdit(type,patch){
      if(!buffer||locked||!editing.enabled||typeof onEdit!=='function')return;
      if((type==='update'||type==='delete')&&!selectedNote())return;
      if(type==='undo'&&!editing.canUndo)return;
      if(type==='redo'&&!editing.canRedo)return;
      const action={type};if(type==='update'||type==='delete')action.id=selected;if(patch)action.patch=patch;
      onEdit(action);
    }
    function emitCleanup(type,values){
      if(!buffer||locked||!editing.enabled||typeof onEdit!=='function')return;
      if((type==='previewSplit'||type==='previewMerge')&&!selectedNote())return;
      if(type==='previewMerge'&&(mergePicker.disabled||!mergePicker.value))return;
      if(type==='previewQuantize'&&!quantizeEnabled.checked)return;
      onEdit({type,...values});
    }
    function adjust(field,amount){
      const note=selectedNote();if(note)emitEdit('update',{[field]:note[field]+amount});
    }
    function applyFields(){
      const seconds=field=>field.value.trim()===''?NaN:Number(field.value);
      emitEdit('update',{pitchInput:editFields.pitch.value,startSeconds:seconds(editFields.start),endSeconds:seconds(editFields.end)});
    }
    function syncScroll(){wave.scrollLeft=piano.scrollLeft;pitchLabels.style.transform=`translateY(${-piano.scrollTop}px)`;}
    function showSelection(){
      const note=notes.find(n=>n.id===selected);if(!note||!view)return;
      const r=t.noteRect(note,view);piano.scrollTop=r.y-piano.clientHeight/2;
      if(r.x<piano.scrollLeft||r.x>piano.scrollLeft+piano.clientWidth-20)piano.scrollLeft=Math.max(0,r.x-piano.clientWidth/3);
      syncScroll();
    }
    function revealPosition(){
      if(!needsReveal||!buffer||piano.clientWidth<=0||piano.clientHeight<=0)return;
      if(selected)showSelection();else{piano.scrollTop=(127-72)*22-44;syncScroll();}
      needsReveal=false;
    }
    function updateTransport(){
      if(!player)return;const state=player.snapshot(),available=!!buffer&&!locked,hasNotes=!!notes.length;
      card.dataset.playback=state.status;card.dataset.mode=state.mode;card.dataset.position=state.position.toFixed(6);card.dataset.activeSources=String(state.activeSources);
      mode.value=state.mode;mode.disabled=!available;mode.querySelector('[value="synth"]').disabled=!hasNotes;
      $('playButton').disabled=!available||['starting','playing'].includes(state.status)||(state.mode==='synth'&&!hasNotes);
      $('pauseButton').disabled=!['starting','playing'].includes(state.status);$('stopButton').disabled=!available;
      seek.disabled=!available;seek.max=String(state.duration);seek.value=String(state.position);
      seek.setAttribute('aria-valuetext',`${state.position.toFixed(2)} / ${state.duration.toFixed(2)} s`);
      $('playbackTime').textContent=`${state.position.toFixed(2)} / ${state.duration.toFixed(2)} s`;
      $('transportStatus').textContent=translate('playback_'+state.status);
      $('playbackError').hidden=!error;$('playbackError').textContent=error?translate('playbackFailed'):'';
      if(view){
        const x=state.position*view.pixelsPerSecond;
        for(const line of card.querySelectorAll('.playhead')){line.setAttribute('x1',x);line.setAttribute('x2',x);}
        if(state.status==='playing'&&(x<piano.scrollLeft||x>piano.scrollLeft+piano.clientWidth-24)){piano.scrollLeft=Math.max(0,x-40);syncScroll();}
      }
    }
    function guard(action){if(locked)return;try{error=false;const result=action();if(result&&typeof result.catch==='function')result.catch(()=>{error=true;updateTransport();});}catch(_){error=true;}updateTransport();}
    player=AudioMidiPlayback.createPlayer({onChange:updateTransport});
    function draw(){
      if(!buffer||piano.clientWidth<=0)return;
      // Reserve the real piano viewport, including non-overlay scrollbar width.
      // A wider waveform viewport would clamp its right-edge scroll too early.
      svg.setAttribute('height',128*t.ROW_HEIGHT);
      const width=Math.max(1,piano.clientWidth);lastWidth=width;wave.style.width=`${width}px`;
      view=t.geometry(buffer.duration,zoom,width);zoom=view.pixelsPerSecond;
      for(const el of [svg,waveform])el.setAttribute('width',view.width);
      svg.setAttribute('height',view.height);pitchLabels.setAttribute('height',view.height);
      const rows=[],labels=[],ticks=t.ticks(view);
      for(let pitch=127;pitch>=0;pitch--){
        const y=(127-pitch)*view.rowHeight,black=[1,3,6,8,10].includes(pitch%12);
        rows.push(node('rect',{x:0,y,width:view.width,height:view.rowHeight,fill:black?'#f0f0ed':'#ffffff'}));
        rows.push(node('line',{x1:0,x2:view.width,y1:y,y2:y,stroke:'#dadbd6','stroke-width':.5}));
        labels.push(node('text',{x:42,y:y+15,'text-anchor':'end','font-size':11,fill:'#666963'},t.pitchName(pitch)));
      }
      for(const tick of ticks)rows.push(node('line',{x1:tick.x,x2:tick.x,y1:0,y2:view.height,stroke:'#bfc1ba','stroke-width':.5}));
      for(const note of notes){const r=t.noteRect(note,view);const el=node('rect',{x:r.x,y:r.y,width:Math.max(2,r.width),height:r.height,rx:3,class:'piano-note','data-note-id':note.id,'data-pitch':note.pitchMidi,'data-start':note.startSeconds,'data-end':note.endSeconds,'data-origin':note.origin||'detected'});el.append(node('title',{},`${t.pitchName(note.pitchMidi)} · ${note.startSeconds.toFixed(3)}–${note.endSeconds.toFixed(3)} s`));rows.push(el);}
      rows.push(node('line',{class:'playhead',x1:0,x2:0,y1:0,y2:view.height}));
      svg.replaceChildren(...rows);pitchLabels.replaceChildren(...labels);
      const waveNodes=[node('rect',{x:0,y:0,width:view.width,height:96,fill:'#fafbf9'})];
      for(const tick of ticks){waveNodes.push(node('text',{x:tick.x+3,y:14,'font-size':10,fill:'#666963'},`${tick.seconds}s`));waveNodes.push(node('line',{x1:tick.x,x2:tick.x,y1:20,y2:96,stroke:'#dadbd6'}));}
      const path=peaks.map((peak,i)=>{const x=(i+.5)/peaks.length*view.width;return `M${x.toFixed(2)},${(60-peak.max*30).toFixed(2)}V${(60-peak.min*30).toFixed(2)}`;}).join('');
      waveNodes.push(node('path',{d:path,stroke:'#16624f','stroke-width':Math.max(1,view.width/Math.max(1,peaks.length)),fill:'none'}));
      waveNodes.push(node('line',{class:'playhead',x1:0,x2:0,y1:20,y2:96}));waveform.replaceChildren(...waveNodes);
      $('zoomLevel').textContent=`${(zoom/80).toFixed(2).replace(/\.?0+$/,'')}×`;
      $('zoomOut').disabled=zoom<=Math.max(20,width/buffer.duration);$('zoomIn').disabled=zoom>=Math.max(320,width/buffer.duration*4);
      syncScroll();selectedDetails();updateTransport();
    }
    function setSession(nextBuffer,nextNotes){
      const sourceChanged=nextBuffer!==buffer, notesChanged=nextNotes!==notes;
      if(!sourceChanged&&!notesChanged)return;
      const previousSelected=selected;
      buffer=nextBuffer;notes=nextNotes;error=false;
      if(sourceChanged){zoom=80;selected=null;fieldSignature=undefined;editing.error=null;peaks=buffer?t.waveformPeaks(Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i))):[];player.load(buffer,notes);player.setMode('original');piano.scrollLeft=0;}
      else player.setNotes(notes);
      if(!notes.some(n=>n.id===selected))selected=notes[0]?.id||null;
      if(selected!==previousSelected)editing.error=null;
      fillEditor();
      picker.replaceChildren(...notes.map((n,i)=>{const option=document.createElement('option');option.value=n.id;option.textContent=`${i+1}. ${t.pitchName(n.pitchMidi)} · ${n.startSeconds.toFixed(3)}–${n.endSeconds.toFixed(3)} s`;return option;}));
      picker.disabled=!notes.length;panel.hidden=!buffer;$('timelineEmpty').hidden=!!buffer;
      if(buffer){needsReveal=sourceChanged||notesChanged;draw();revealPosition();}
      else{needsReveal=false;view=null;svg.replaceChildren();waveform.replaceChildren();pitchLabels.replaceChildren();selectedDetails();}
      updateTransport();
      // Do not call back from render/setEditing; only a real selection transition
      // (including replacing the source or deleting the selected note) notifies.
      if(selected!==previousSelected&&typeof onSelection==='function')onSelection(selected);
    }
    function render(){selectedDetails();updateTransport();}
    function changeZoom(factor){if(!view)return;const center=(piano.scrollLeft+piano.clientWidth/2)/view.pixelsPerSecond;zoom=Math.max(20,Math.min(Math.max(320,piano.clientWidth/buffer.duration*4),zoom*factor));draw();piano.scrollLeft=Math.max(0,center*view.pixelsPerSecond-piano.clientWidth/2);syncScroll();}
    $('playButton').addEventListener('click',()=>guard(()=>player.play()));
    $('pauseButton').addEventListener('click',()=>guard(()=>player.pause()));
    $('stopButton').addEventListener('click',()=>guard(()=>player.stop()));
    mode.addEventListener('change',()=>guard(()=>player.setMode(mode.value)));
    seek.addEventListener('input',()=>guard(()=>player.seek(Number(seek.value))));
    $('zoomIn').addEventListener('click',()=>changeZoom(2));$('zoomOut').addEventListener('click',()=>changeZoom(.5));
    picker.addEventListener('change',()=>select(picker.value));
    svg.addEventListener('click',event=>{const note=event.target.closest('[data-note-id]');if(note)select(note.dataset.noteId);});
    $('addNoteButton').addEventListener('click',()=>emitEdit('add'));
    $('deleteNoteButton').addEventListener('click',()=>emitEdit('delete'));
    $('undoNoteButton').addEventListener('click',()=>emitEdit('undo'));
    $('redoNoteButton').addEventListener('click',()=>emitEdit('redo'));
    $('applyNoteButton').addEventListener('click',applyFields);
    $('splitNoteButton').addEventListener('click',()=>emitCleanup('previewSplit',{id:selected,seconds:Number(splitSeconds.value)}));
    $('mergeNotesButton').addEventListener('click',()=>emitCleanup('previewMerge',{id:selected,otherId:mergePicker.value}));
    $('previewShortButton').addEventListener('click',()=>emitCleanup('previewRemoveShort',{threshold:Number($('shortNoteSeconds').value)}));
    $('previewQuantizeButton').addEventListener('click',()=>emitCleanup('previewQuantize',{gridSeconds:Number($('gridSeconds').value),mode:$('quantizeMode').value}));
    quantizeEnabled.addEventListener('change',refreshEditor);
    for(const field of Object.values(editFields))field.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.isComposing){event.preventDefault();applyFields();}});
    for(const [id,field,amount] of [['pitchDown','pitchMidi',-1],['pitchUp','pitchMidi',1],['startEarlier','startSeconds',-.05],['startLater','startSeconds',.05],['endEarlier','endSeconds',-.05],['endLater','endSeconds',.05]])$(id).addEventListener('click',()=>adjust(field,amount));
    waveform.addEventListener('click',event=>{if(view)guard(()=>player.seek(t.xToTime(event.clientX-waveform.getBoundingClientRect().left,view)));});
    piano.addEventListener('scroll',syncScroll,{passive:true});
    const observer=new ResizeObserver(()=>{if(buffer&&piano.clientWidth>0&&(needsReveal||Math.abs(piano.clientWidth-lastWidth)>1)){draw();revealPosition();}});observer.observe(piano);
    return Object.freeze({setSession,render,selectedId:()=>selected,select,setEditing:value=>{Object.assign(editing,value);refreshEditor();},reveal:()=>{draw();revealPosition();},setLocked:value=>{locked=!!value;if(locked)player.pause();updateTransport();refreshEditor();},playOriginal:()=>guard(()=>{player.setMode('original');return player.play();}),pause:()=>guard(()=>player.pause()),dispose:()=>{observer.disconnect();player.dispose();buffer=null;notes=[];peaks=[];},snapshot:()=>player.snapshot()});
  }
  return Object.freeze({create});
})();
