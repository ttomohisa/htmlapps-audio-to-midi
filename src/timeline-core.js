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
  function ticks(view){
    const step=[.1,.2,.5,1,2,5,10,20,30,60].find(n=>n*view.pixelsPerSecond>=72)||60;
    const out=[];for(let i=0;i*step<=view.duration;i++){const seconds=Number((i*step).toFixed(6));out.push({seconds,x:seconds*view.pixelsPerSecond});}return out;
  }
  function waveformPeaks(channels,bins=1200){
    if(!channels.length||!channels[0].length)return [];
    const length=channels[0].length,count=Math.min(length,Math.max(1,Math.min(2400,Math.floor(bins)||1200))),out=[];
    for(let bin=0;bin<count;bin++){let min=0,max=0;const start=Math.floor(bin*length/count),end=Math.floor((bin+1)*length/count);for(const channel of channels)for(let i=start;i<end;i++){const value=channel[i];if(Number.isFinite(value)){min=Math.min(min,value);max=Math.max(max,value);}}out.push({min,max});}return out;
  }
  return Object.freeze({ROW_HEIGHT,MIN_PITCH,MAX_PITCH,pitchName,geometry,noteRect,xToTime,ticks,waveformPeaks});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=AudioMidiTimeline;
