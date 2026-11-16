const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function musicGainAt(frame,tracks,fps){
 const attack=Math.max(1,Math.round(fps*.15)),release=Math.max(1,Math.round(fps*.3));let gain=1;
 for(const t of tracks){if(t.role!=='narration')continue;const end=t.fromFrame+t.durationFrames;let candidate=1;
  if(frame>=t.fromFrame-attack&&frame<t.fromFrame)candidate=1-.7*smooth((frame-t.fromFrame+attack)/attack);
  else if(frame>=t.fromFrame&&frame<end)candidate=.3;
  else if(frame>=end&&frame<end+release)candidate=.3+.7*smooth((frame-end)/release);
  gain=Math.min(gain,candidate);
 }
 return gain;
}
