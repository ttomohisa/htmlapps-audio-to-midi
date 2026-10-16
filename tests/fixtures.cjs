const makeWav=({duration=2.5,sampleRate=44100,channels=1,notes=[{pitch:60,start:.25,end:2.25}],noise=false}={})=>{
 const frames=Math.round(duration*sampleRate),buffer=Buffer.alloc(44+frames*channels*2);
 buffer.write('RIFF');buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(channels,22);buffer.writeUInt32LE(sampleRate,24);buffer.writeUInt32LE(sampleRate*channels*2,28);buffer.writeUInt16LE(channels*2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(frames*channels*2,40);
 let seed=1729;
 for(let i=0;i<frames;i++){const t=i/sampleRate;let value=0;if(noise){seed=(1664525*seed+1013904223)>>>0;value=(seed/4294967296*2-1)*.3;}else for(const n of notes){if(t>=n.start&&t<n.end)value+=.6/Math.max(1,notes.filter(x=>t>=x.start&&t<x.end).length)*Math.sin(2*Math.PI*440*Math.pow(2,(n.pitch-69)/12)*t)*Math.min(1,(t-n.start)/.015,(n.end-t)/.015);}
  for(let c=0;c<channels;c++)buffer.writeInt16LE(Math.round(Math.max(-1,Math.min(1,value))*32767),44+(i*channels+c)*2);
 }return buffer;
};
module.exports={makeWav};
