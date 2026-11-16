import React from 'react';
import type {EditPlan} from './types';
import {motionAt,morphPoints} from './motion.mjs';
export function KineticType({text,frame,animation}:{text:string;frame:number;animation:EditPlan['scenes'][number]['animation']}){
 let unit=0;
 function animated(token:string,key:string){const p=motionAt(frame,animation.delayFrames+unit++*animation.staggerFrames,animation.durationFrames,animation.easing);return <span key={key} style={{display:'inline-block',clipPath:`inset(0 0 ${100*(1-p)}% 0)`,transform:`translateY(${(1-p)*.75}em)`,opacity:p,letterSpacing:animation.tracking*(1-p)}}>{token}</span>;}
 return <>{text.split(/(\s+)/u).map((word,i)=>/^\s+$/u.test(word)?<React.Fragment key={i}>{word}</React.Fragment>:animation.unit==='word'?animated(word,String(i)):<span key={i} style={{display:'inline-block',whiteSpace:'nowrap'}}>{Array.from(word).map((character,j)=>animated(character,`${i}-${j}`))}</span>)}</>;
}
export function TrackMatte({progress,children}:{progress:number;children:React.ReactNode}){return <div style={{width:'100%',height:'100%',clipPath:`inset(0 ${100*(1-progress)}% 0 0)`,overflow:'hidden'}}>{children}</div>;}
export function TrimPath({progress,color}:{progress:number;color:string}){return <svg viewBox="0 0 1000 100" style={{width:'100%',overflow:'visible'}} aria-hidden><path d="M 0 50 C 250 50 220 10 490 50 S 790 90 960 50" pathLength="1" stroke={color} strokeWidth="3" fill="none" strokeDasharray="1" strokeDashoffset={1-progress}/><circle cx={960} cy={50} r={8*progress} fill={color}/></svg>;}
export function ShapeMorph({progress,color}:{progress:number;color:string}){const points=morphPoints([[0,40],[100,40],[100,60],[0,60]],[[0,0],[100,0],[100,100],[0,100]],progress);return <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{width:'100%',height:'100%'}} aria-hidden><polygon points={points.map(p=>p.join(',')).join(' ')} fill={color}/></svg>;}
