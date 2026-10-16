/* Read-only geometry in source seconds. Shared by browser rendering and contracts. */
const AudioMidiTimeline = (() => {
  const ROW_HEIGHT=22, MIN_PITCH=0, MAX_PITCH=127;
  function pitchName(pitch){return ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][pitch%12]+(Math.floor(pitch/12)-1);}
  function geometry(duration,pixelsPerSecond=80,viewportWidth=0){
    duration=Number.isFinite(duration)&&duration>0?duration:1;
    const scale=Math.max(20,Math.min(Math.max(320,viewportWidth/duration*4),Number(pixelsPerSecond)||80),Math.max(0,viewportWidth)/duration);
    return {duration,pixelsPerSecond:scale,width:Math.max(1,duration*scale),height:128*ROW_HEIGHT,rowHeight:ROW_HEIGHT};
  }
  function noteRect(note,view){return {x:note.startSeconds*view.pixelsPerSecond,y:(MAX_PITCH-note.pitchMidi)*ROW_HEIGHT+2,width:(note.endSeconds-note.startSeconds)*view.pixelsPerSecond,height:ROW_HEIGHT-4};}
  function xToTime(x,view){return Math.max(0,Math.min(view.duration,x/view.pixelsPerSecond));}
  // Bounds are in full SVG/source coordinates; the SVG itself stays full size.
  function visibleRange(view,{scrollLeft=0,scrollTop=0,width=0,height=0,overscanX=160,overscanY=44}={}){
    const finite=value=>Number.isFinite(value)?Math.max(0,value):0;
    const left=Math.min(view.width,Math.max(0,finite(scrollLeft)-finite(overscanX)));
    const right=Math.min(view.width,finite(scrollLeft)+finite(width)+finite(overscanX));
    const top=Math.min(view.height,Math.max(0,finite(scrollTop)-finite(overscanY)));
    const bottom=Math.min(view.height,finite(scrollTop)+finite(height)+finite(overscanY));
    return {left,right,top,bottom,startSeconds:left/view.pixelsPerSecond,endSeconds:right/view.pixelsPerSecond,
      minPitch:Math.max(MIN_PITCH,MAX_PITCH-Math.floor(bottom/ROW_HEIGHT)),
      maxPitch:Math.min(MAX_PITCH,MAX_PITCH-Math.floor(top/ROW_HEIGHT))};
  }
  function ticks(view,range){
    const step=[.1,.2,.5,1,2,5,10,20,30,60].find(n=>n*view.pixelsPerSecond>=72)||60;
    const start=range?Math.max(0,Math.floor(range.startSeconds/step)):0,end=range?Math.min(view.duration,range.endSeconds):view.duration;
    const out=[];for(let i=start;i*step<=end;i++){const seconds=Number((i*step).toFixed(6));out.push({seconds,x:seconds*view.pixelsPerSecond});}return out;
  }
  // A balanced interval tree per pitch avoids full-array scans on scroll and
  // still finds sustained notes that began far before the visible time range.
  // Tree records retain the original note objects without sorting/mutating them.
  function createNoteIndex(notes){
    const pitches=Array.from({length:128},()=>[]),byId=new Map();
    notes.forEach((note,order)=>{pitches[note.pitchMidi].push({note,order});byId.set(note.id,note);});
    function tree(items,from=0,to=items.length){
      if(from>=to)return null;
      const middle=(from+to)>>1,entry=items[middle],left=tree(items,from,middle),right=tree(items,middle+1,to);
      return {entry,left,right,maxEnd:Math.max(entry.note.endSeconds,left?.maxEnd||0,right?.maxEnd||0)};
    }
    const roots=pitches.map(items=>tree(items.sort((a,b)=>a.note.startSeconds-b.note.startSeconds||a.order-b.order)));
    function query(range){
      const found=[];
      function visit(branch){
        if(!branch||branch.maxEnd<range.startSeconds)return;
        visit(branch.left);
        const entry=branch.entry,note=entry.note;
        if(note.startSeconds>range.endSeconds)return;
        if(note.endSeconds>=range.startSeconds)found.push(entry);
        visit(branch.right);
      }
      for(let pitch=range.minPitch;pitch<=range.maxPitch;pitch++)visit(roots[pitch]);
      // Preserve original stacking/hit-test order for overlapping notes.
      return found.sort((a,b)=>a.order-b.order).map(entry=>entry.note);
    }
    return Object.freeze({query,get:id=>byId.get(id)});
  }
  function waveformRange(peaks,view,range){
    return {start:Math.max(0,Math.floor(range.left/view.width*peaks.length)),end:Math.min(peaks.length,Math.ceil(range.right/view.width*peaks.length))};
  }
  function waveformPeaks(channels,bins=1200){
    if(!channels.length||!channels[0].length)return [];
    const length=channels[0].length,count=Math.min(length,Math.max(1,Math.min(2400,Math.floor(bins)||1200))),out=[];
    for(let bin=0;bin<count;bin++){let min=0,max=0;const start=Math.floor(bin*length/count),end=Math.floor((bin+1)*length/count);for(const channel of channels)for(let i=start;i<end;i++){const value=channel[i];if(Number.isFinite(value)){min=Math.min(min,value);max=Math.max(max,value);}}out.push({min,max});}return out;
  }
  return Object.freeze({ROW_HEIGHT,MIN_PITCH,MAX_PITCH,pitchName,geometry,noteRect,xToTime,visibleRange,ticks,createNoteIndex,waveformRange,waveformPeaks});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=AudioMidiTimeline;
