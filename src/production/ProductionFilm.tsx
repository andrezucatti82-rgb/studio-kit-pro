import React from 'react';
import {AbsoluteFill,Audio,Freeze,Img,OffthreadVideo,Sequence,staticFile,useCurrentFrame} from 'remotion';
import {buildTimeline} from '../timeline.mjs';
import type {RenderPlan} from './types';
import {KineticType,TrackMatte,TrimPath,ShapeMorph} from './Motion';
import {beatEnvelope,motionAt} from './motion.mjs';

function Shot({plan,index}:{plan:RenderPlan;index:number}){
 const frame=useCurrentFrame(),s=plan.scenes[index],{paper,ink,accent}=plan.direction;
 const wide=plan.output.width>plan.output.height,media=plan.media[index];
 const entry=motionAt(frame,0,Math.max(1,s.transition.durationFrames),s.animation.easing);
 const mask=motionAt(frame,plan.output.fps*.6,plan.output.fps*.8,s.animation.easing);
 const settle=motionAt(frame,0,s.durationFrames,s.animation.easing);
 const pulse=beatEnvelope(frame+plan.scenes.slice(0,index).reduce((sum,v)=>sum+v.durationFrames,0),plan.output.fps);
 const closing=s.kind==='connect',opening=s.kind==='organize';
 const titleStyle:React.CSSProperties={position:'absolute',left:'5%',right:wide?(opening?'36%':'5%'):'5%',top:closing?'27%':opening?'25%':'17%',fontSize:wide?(opening?(s.title.length>38?80:96):80):(s.title.length>45?62:74),fontWeight:700,lineHeight:1.08,letterSpacing:-3,zIndex:4};
 const clip=s.transition.type==='shape-reveal'?`inset(0 ${100*(1-entry)}% 0 0)`:undefined;
 const mediaStyle:React.CSSProperties={position:'absolute',left:wide?(opening?'70%':'36%'):'8%',right:wide?'5%':'8%',top:wide?(opening?'24%':'47%'):'53%',height:wide?(opening?'42%':'33%'):'25%',background:ink,overflow:'hidden',boxShadow:`0 ${12+settle*5}px 30px #152d371a`,zIndex:2};
 return <AbsoluteFill style={{background:paper,color:ink,overflow:'hidden',clipPath:clip}}>
  <div style={{position:'absolute',left:'5%',right:'5%',top:'6%',display:'flex',justifyContent:'space-between',fontSize:wide?17:19,letterSpacing:3,fontWeight:700,borderBottom:`1px solid ${ink}40`,paddingBottom:15}}><span>UMA IDEIA EM MOVIMENTO</span><span>{String(index+1).padStart(2,'0')}</span></div>
  <div style={{position:'absolute',right:-100,top:'14%',width:wide?500:380,height:wide?500:380,border:`1px solid ${ink}18`,borderRadius:'50%',transform:`translateX(${-settle*s.camera.distance}px)`}}/>
  {opening&&['EXCESSO','PRESSA','RUÍDO'].map((text,i)=>{const p=motionAt(frame,8+i*3,plan.output.fps*1.1,s.animation.easing);return <div key={text} style={{position:'absolute',left:`${7+i*24}%`,top:`${23+i*18}%`,fontSize:wide?67:55,fontWeight:700,color:`${ink}25`,transform:`translate(${(i%2?1:-1)*p*350}px,${p*60}px) rotate(${i%2?4:-4}deg)`,opacity:1-p,zIndex:3}}>{text}</div>;})}
  <div style={titleStyle}><KineticType text={s.title} frame={frame} animation={s.animation}/></div>
  {!closing&&<div style={mediaStyle}><TrackMatte progress={s.effects.includes('track-matte')?mask:1}>{media.kind==='video'?<OffthreadVideo src={staticFile(media.src)} volume={plan.audio.sourceVolume} style={{width:'100%',height:'100%',objectFit:'contain'}}/>:<Img src={staticFile(media.src)} style={{width:'100%',height:'100%',objectFit:'contain'}}/>}</TrackMatte></div>}
  {closing&&<><div style={{position:'absolute',left:'5%',right:'5%',top:'57%',zIndex:3}}><TrimPath progress={motionAt(frame,plan.output.fps*1.8,plan.output.fps*1.2,s.animation.easing)} color={accent}/></div><div style={{position:'absolute',left:'5%',top:'68%',fontSize:wide?27:30,letterSpacing:3,fontWeight:700}}>CLAREZA. DIREÇÃO. PRESENÇA.</div></>}
  <div style={{position:'absolute',left:'5%',bottom:closing?'27%':'20%',width:wide?90:70,height:5,background:accent,transform:`scaleX(${.72+pulse*.28})`,transformOrigin:'left',zIndex:3}}/>
  {s.effects.includes('shape-morph')&&<div style={{position:'absolute',right:'5%',bottom:'20%',width:wide?110:75,height:wide?110:75,transform:`translateY(${-settle*s.camera.distance*.5}px)`,opacity:.12}}><ShapeMorph progress={motionAt(frame,plan.output.fps,plan.output.fps*1.4,s.animation.easing)} color={accent}/></div>}
  <div style={{position:'absolute',left:'5%',right:'5%',bottom:'5%',fontSize:wide?13:15,color:`${ink}aa`,letterSpacing:2,display:'flex',justifyContent:'space-between'}}><span>ESTUDO EDITORIAL · MÍDIA ORIGINAL</span><span>PRÉVIA PARA REVISÃO</span></div>
 </AbsoluteFill>;
}
export function ProductionFilm({plan}:{plan:RenderPlan}){
 const frame=useCurrentFrame(),timeline=buildTimeline(plan.scenes.map(s=>({...s,transition:{type:s.transition.type==='cut'?'cut':'dissolve',durationFrames:s.transition.durationFrames}})));
 const caption=plan.captions.find(c=>frame/plan.output.fps>=c.start&&frame/plan.output.fps<c.end);
 return <AbsoluteFill style={{background:plan.direction.paper,fontFamily:'Geist, sans-serif'}}>
  <style>{`@font-face{font-family:Geist;src:url('${staticFile('fonts/Geist-Regular.ttf')}')}@font-face{font-family:Geist;src:url('${staticFile('fonts/Geist-Bold.ttf')}');font-weight:700}*{box-sizing:border-box}`}</style>
  {timeline.clips.map(c=><Sequence key={plan.scenes[c.index].id} from={c.from} durationInFrames={c.durationInFrames+c.overlapAfter}><HeldShot plan={plan} index={c.index}/></Sequence>)}
  {caption&&<div style={{position:'absolute',left:'5%',right:'5%',bottom:'10%',display:'flex',justifyContent:'center',zIndex:10}}><span style={{background:plan.direction.ink,color:plan.direction.paper,fontSize:plan.output.width>plan.output.height?26:27,lineHeight:1.35,padding:'10px 18px',maxWidth:'100%',textAlign:'center',borderRadius:3}}>{caption.text}</span></div>}
  <Audio src={staticFile(plan.musicSrc)} volume={plan.audio.musicVolume}/>
 </AbsoluteFill>;
}
function HeldShot({plan,index}:{plan:RenderPlan;index:number}){const f=useCurrentFrame(),duration=plan.scenes[index].durationFrames;return <Freeze frame={duration-1} active={f>=duration}><Shot plan={plan} index={index}/></Freeze>;}
