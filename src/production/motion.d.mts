export function clamp(value:number):number;
export function bezierProgress(progress:number,curve?:number[]):number;
export function motionAt(frame:number,start:number,duration:number,curve?:number[]):number;
export function beatEnvelope(frame:number,fps:number,bpm?:number):number;
export function morphPoints(from:number[][],to:number[][],progress:number):number[][];
export const motionRegistry:{name:string;purpose:string;parameters:string[];duration:string;curve:string;constraints:string;renderer:string}[];
