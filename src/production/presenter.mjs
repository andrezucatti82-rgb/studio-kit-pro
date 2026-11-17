// Tracks contain measured positions in the output frame, never inferred gestures.
export function anchorPositionAt(track, frame, width, height) {
 const points=track.points;
 let a=points[0],b=a;
 if(frame>=points.at(-1).frame)a=b=points.at(-1);
 else for(let i=1;i<points.length;i++)if(frame<=points[i].frame){a=points[i-1];b=points[i];break;}
 const t=a===b?0:Math.max(0,Math.min(1,(frame-a.frame)/(b.frame-a.frame)));
 return {x:a.x+(b.x-a.x)*t+(track.offsetX??0)-width/2,y:a.y+(b.y-a.y)*t+(track.offsetY??0)-height/2};
}
export function layerVisibleAt(active,frame){return !active||(frame>=active.fromFrame&&frame<active.fromFrame+active.durationFrames);}
