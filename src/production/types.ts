export type EditPlan = {
 schemaVersion:1; styleId:string; objective:string; provider:'deterministic'|'openai';
 output:{format:'16:9'|'9:16'|'1:1'|'4:5';width:number;height:number;fps:24|30;durationFrames:number;codec:'h264'};
 direction:{paper:string;ink:string;accent:string;font:string;movement:string;sound:string};
 fidelity:{fit:'contain';preserveOriginals:true;inventAngles:false;avatar:false}; resources:string[];
 audio:{musicAssetId?:string;proceduralScore:boolean;bpm:100;sourceVolume:number;musicVolume:number};
 scenes:{id:string;assetId:string;sourceStartSeconds:number;durationFrames:number;title:string;caption:string;kind:'organize'|'reveal'|'connect';initialState:string;action:string;result:string;transition:{type:'cut'|'shape-reveal';durationFrames:number;reason:string};animation:{unit:'word'|'character';delayFrames:number;staggerFrames:number;durationFrames:number;easing:[number,number,number,number];tracking:number};camera:{type:'graphic-parallax';distance:number};effects:('track-matte'|'trim-path'|'shape-morph')[]}[];
 captions:{start:number;end:number;text:string}[];
};
export type RenderPlan = EditPlan & {media:{src:string;kind:'image'|'video';hasAudio:boolean}[];musicSrc:string};
