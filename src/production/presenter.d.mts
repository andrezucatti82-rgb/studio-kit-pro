import type {AnchorTrack} from './graph-types';
export function anchorPositionAt(track:AnchorTrack,frame:number,width:number,height:number):{x:number;y:number};
export function layerVisibleAt(active:{fromFrame:number;durationFrames:number}|undefined,frame:number):boolean;
