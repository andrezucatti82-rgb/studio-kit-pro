import React,{useEffect,useRef,useState} from 'react';
import {AbsoluteFill,Audio,Freeze,Img,OffthreadVideo,Sequence,cancelRender,continueRender,delayRender,staticFile,useCurrentFrame} from 'remotion';
import {buildTimeline} from '../timeline.mjs';
import {bezierProgress} from './motion.mjs';
import {KineticType} from './Motion';
import {musicGainAt} from './audio.mjs';
import type {GraphAnimation,GraphLayer,RenderGraphPlan} from './graph-types';

function valueAt(animation:GraphAnimation,frame:number){const k=animation.keyframes;if(frame<=k[0].frame)return k[0].value;for(let i=1;i<k.length;i++)if(frame<=k[i].frame){const a=k[i-1],b=k[i],t=bezierProgress((frame-a.frame)/(b.frame-a.frame),b.easing);return a.value+(b.value-a.value)*t;}return k[k.length-1].value;}
function Layer({layer:l,sceneId,plan}:{layer:GraphLayer;sceneId:string;plan:RenderGraphPlan}){
 const textRef=useRef<HTMLDivElement>(null),[handle]=useState(()=>l.type==='text'?delayRender(`Verify editable text ${l.id}`):null);
 useEffect(()=>{if(handle===null||l.type!=='text')return;let cancelled=false;document.fonts.load(`${l.weight} ${l.fontSize}px "${l.font}"`).then(()=>{if(cancelled)return;const element=textRef.current;if(!element||element.getBoundingClientRect().height>l.height*plan.output.height+1||element.scrollWidth>l.width*plan.output.width+1)throw Error(`Text does not fit approved layer ${sceneId}/${l.id}; adjust type size or layout without dropping copy`);continueRender(handle);}).catch(cancelRender);return()=>{cancelled=true;};},[handle,l,plan.output.height,plan.output.width,sceneId]);
 const f=useCurrentFrame(),props:Record<string,number>={x:l.x,y:l.y,opacity:l.opacity,scale:l.scale,rotation:l.rotation,reveal:1,tracking:0,pathProgress:l.type==='path'?l.progress:1};
 for(const animation of l.animations)props[animation.property]=valueAt(animation,f);
 const style:React.CSSProperties={position:'absolute',left:props.x*plan.output.width,top:props.y*plan.output.height,width:l.width*plan.output.width,height:l.height*plan.output.height,opacity:Math.max(0,Math.min(1,props.opacity)),transform:`rotate(${props.rotation}deg) scale(${props.scale})`,transformOrigin:'center',clipPath:`inset(0 ${100*(1-Math.max(0,Math.min(1,props.reveal)))}% 0 0)`};
 let content:React.ReactNode;
 if(l.type==='media'){const media=plan.media[`${sceneId}:${l.id}`],css:React.CSSProperties={width:'100%',height:'100%',objectFit:'contain',borderRadius:l.radius*100+'%'};content=media.kind==='video'?<OffthreadVideo src={staticFile(media.src)} volume={l.volume} style={css}/>:<Img src={staticFile(media.src)} style={css}/>;}
 else if(l.type==='shape')content=<div style={{width:'100%',height:'100%',background:l.fill,borderRadius:l.shape==='ellipse'?'50%':l.radius*100+'%'}}/>;
 else if(l.type==='path')content=<svg viewBox="0 0 1000 1000" preserveAspectRatio="none" style={{width:'100%',height:'100%',overflow:'visible'}}><path d={l.d} fill="none" stroke={l.color} strokeWidth={l.strokeWidth} pathLength="1" strokeDasharray="1" strokeDashoffset={1-props.pathProgress}/></svg>;
 else content=<div ref={textRef} style={{fontFamily:l.font,fontWeight:l.weight,fontSize:l.fontSize,lineHeight:1.1,textAlign:l.align,color:l.color,letterSpacing:props.tracking,whiteSpace:'pre-wrap',overflowWrap:'break-word'}}>{l.kinetic==='none'?l.text:<KineticType text={l.text} frame={f} animation={{unit:l.kinetic,delayFrames:0,staggerFrames:l.staggerFrames,durationFrames:l.enterFrames,easing:[.22,.75,.2,1],tracking:props.tracking}}/>}</div>;
 return <div style={style}>{content}</div>;
}
function Scene({plan,index}:{plan:RenderGraphPlan;index:number}){const f=useCurrentFrame(),s=plan.scenes[index],t=s.transition,p=t.type==='cut'?1:bezierProgress(f/t.durationFrames);return <AbsoluteFill style={{background:s.background,overflow:'hidden',opacity:t.type==='dissolve'?p:1,clipPath:t.type==='wipe'?`inset(0 ${100*(1-p)}% 0 0)`:undefined}}>{s.layers.map(l=><Layer key={l.id} layer={l} plan={plan} sceneId={s.id}/>)}</AbsoluteFill>;}
function Held({plan,index}:{plan:RenderGraphPlan;index:number}){const f=useCurrentFrame(),last=plan.scenes[index].durationFrames-1;return <Freeze frame={last} active={f>last}><Scene plan={plan} index={index}/></Freeze>;}
export function GraphFilm({plan}:{plan:RenderGraphPlan}){
 const frame=useCurrentFrame(),timeline=buildTimeline(plan.scenes),cap=plan.captions.find(c=>frame/plan.output.fps>=c.start&&frame/plan.output.fps<c.end);
 return <AbsoluteFill style={{background:plan.scenes[0].background,fontFamily:'Geist'}}>
  <style>{plan.fontSources.map(f=>`@font-face{font-family:'${f.family}';font-weight:${f.weight};src:url('${staticFile(f.src)}')}`).join('')+'*{box-sizing:border-box}'}</style>
  {timeline.clips.map(c=><Sequence key={plan.scenes[c.index].id} from={c.from} durationInFrames={c.durationInFrames+c.overlapAfter}><Held plan={plan} index={c.index}/></Sequence>)}
  {plan.renderAudio.map((t,i)=><Sequence key={i} from={t.fromFrame} durationInFrames={t.durationFrames}><Audio src={staticFile(t.src)} volume={f=>{const fade=Math.min(1,f/Math.max(1,t.fadeFrames),(t.durationFrames-f)/Math.max(1,t.fadeFrames));return t.volume*fade*(t.role==='music'?musicGainAt(f+t.fromFrame,plan.renderAudio,plan.output.fps):1);}}/></Sequence>)}
  {plan.musicSrc&&<Audio src={staticFile(plan.musicSrc)} volume={f=>plan.audio.proceduralScore ? .28*musicGainAt(f,plan.renderAudio,plan.output.fps):0}/>}
  {cap&&<div style={{position:'absolute',left:'6%',right:'6%',bottom:'9%',display:'flex',justifyContent:'center'}}><span style={{background:'#142b35ed',color:'#fff',fontFamily:plan.captionFont,fontSize:plan.output.width>plan.output.height?28:30,lineHeight:1.3,padding:'10px 18px',textAlign:'center'}}>{cap.text}</span></div>}
 </AbsoluteFill>;
}
