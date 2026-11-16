export const clamp=value=>Math.max(0,Math.min(1,value));
// Cubic-bezier timing, solved on x (the editor's graph curve), not sampled as a linear y curve.
export function bezierProgress(progress,[x1,y1,x2,y2]=[.22,.75,.2,1]) {
 const x=clamp(progress);if(x===0||x===1)return x;
 const cubic=(t,a,b)=>3*(1-t)**2*t*a+3*(1-t)*t*t*b+t**3;
 let lo=0,hi=1;for(let i=0;i<25;i++){const mid=(lo+hi)/2;if(cubic(mid,x1,x2)<x)lo=mid;else hi=mid;}
 return cubic((lo+hi)/2,y1,y2);
}
export function motionAt(frame,start,duration,curve){return bezierProgress((frame-start)/duration,curve);}
export function beatEnvelope(frame,fps,bpm=100){const phase=(frame/fps)%(60/bpm);return Math.exp(-phase*15);}
export function morphPoints(from,to,progress) {
 if(from.length!==to.length || from.length<3)throw Error('Morph needs equal compatible point counts');
 return from.map(([x,y],i)=>[x+(to[i][0]-x)*progress,y+(to[i][1]-y)*progress]);
}
export const motionRegistry=[
 {name:'KineticType',purpose:'Word/character reveals, overlapping timing and reading hold',parameters:['text','frame','animation'],duration:'plan.animation.durationFrames + stagger',curve:'plan.animation.easing',constraints:'Entry must leave >=1 second to read',renderer:'Remotion 4'},
 {name:'TrackMatte',purpose:'Reveal original media with an animated rectangular matte',parameters:['progress','children'],duration:'frame based',curve:'custom cubic bezier',constraints:'Does not create new source coverage',renderer:'Remotion 4'},
 {name:'TrimPath',purpose:'Draw a connector to the conclusion',parameters:['progress','color'],duration:'frame based',curve:'custom cubic bezier',constraints:'SVG normalized path length',renderer:'Remotion 4'},
 {name:'ShapeMorph',purpose:'Compatible polygon interpolation from narrow strip to frame',parameters:['progress','color'],duration:'frame based',curve:'custom cubic bezier',constraints:'Equal topology; no arbitrary path morph claim',renderer:'Remotion 4'},
 {name:'GraphicParallax',purpose:'Separate vector foreground and background planes',parameters:['frame','distance'],duration:'scene duration',curve:'custom cubic bezier',constraints:'Graphics only; preserves original media view',renderer:'Remotion 4'},
];
