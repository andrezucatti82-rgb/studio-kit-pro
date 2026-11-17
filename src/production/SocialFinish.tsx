import React,{useId} from 'react';
import {AbsoluteFill,useCurrentFrame} from 'remotion';
import type {SocialFinishing} from './graph-types';

// Conservative, explicit social-video finish. Existing noisy footage may use grainAmount:0.
// Captions outside this wrapper keep their own contrast; this does not relight scene geometry.
export function SocialFinish({options,children}:{options?:SocialFinishing;children:React.ReactNode}){
 const frame=useCurrentFrame(),id='finish-'+useId().replace(/[^A-Za-z0-9_-]/g,'');
 if(!options)return <>{children}</>;
 const o=options,table=`${o.shadowLift} 0.5 ${1-o.highlightCompression}`;
 return <AbsoluteFill>
  <svg width="0" height="0" aria-hidden="true"><defs><filter id={id+'-tone'} colorInterpolationFilters="sRGB"><feComponentTransfer><feFuncR type="table" tableValues={table}/><feFuncG type="table" tableValues={table}/><feFuncB type="table" tableValues={table}/></feComponentTransfer></filter></defs></svg>
  <AbsoluteFill style={{filter:`url(#${id}-tone) brightness(${o.brightness}) contrast(${o.contrast}) saturate(${o.saturation})`}}>{children}</AbsoluteFill>
  {o.grainAmount>0&&<AbsoluteFill style={{opacity:o.grainAmount,mixBlendMode:'soft-light',pointerEvents:'none'}}><svg width="100%" height="100%" aria-hidden="true"><defs><filter id={id+'-grain'} x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="3" stitchTiles="stitch" seed={o.seed+Math.floor(frame/2)}/><feColorMatrix type="saturate" values="0"/></filter></defs><rect width="100%" height="100%" filter={`url(#${id}-grain)`}/></svg></AbsoluteFill>}
 </AbsoluteFill>;
}
