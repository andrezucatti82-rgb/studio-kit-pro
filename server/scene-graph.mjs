import {z} from 'zod';
import {dimensions} from './schema.mjs';

const id=z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),hash=z.string().regex(/^[a-f0-9]{64}$/);
const frame=z.number().int().nonnegative(),unit=z.number().min(0).max(1),color=z.string().regex(/^#[0-9a-fA-F]{6}$/);
const easing=z.tuple([unit,z.number().min(-1).max(2),unit,z.number().min(-1).max(2)]);
export const graphRequestSchema=z.object({
 requestVersion:z.literal(2),prompt:z.string().min(3).max(12000),styleId:id,selectedStyleIds:z.array(id).min(1).max(10),
 contextSha256:hash,assetIds:z.array(id).max(100),durationSeconds:z.number().min(1).max(3600),format:z.enum(['16:9','9:16','1:1','4:5']),fps:z.union([z.literal(24),z.literal(30)]),phase:z.enum(['sample','full']),
}).strict().superRefine((r,c)=>{if(r.styleId!==r.selectedStyleIds[0]||new Set(r.selectedStyleIds).size!==r.selectedStyleIds.length)c.addIssue({code:'custom',message:'Keep one principal and unique selected styles'});if(new Set(r.assetIds).size!==r.assetIds.length)c.addIssue({code:'custom',message:'Duplicate assets'});if(r.phase==='sample'&&r.durationSeconds>15)c.addIssue({code:'custom',message:'Representative sample must be <=15 seconds'});});
const animation=z.object({property:z.enum(['x','y','opacity','scale','rotation','reveal','tracking','pathProgress']),keyframes:z.array(z.object({frame,value:z.number().finite(),easing:easing.default([.22,.75,.2,1])}).strict()).min(2).max(40)}).strict();
const anchorTrack=z.object({sourceAssetId:id,sourceStartSeconds:z.number().nonnegative().max(3600),origin:z.enum(['manual','externally_measured']),space:z.literal('output-normalized'),offsetX:z.number().min(-1).max(1).default(0),offsetY:z.number().min(-1).max(1).default(0),points:z.array(z.object({frame,x:unit,y:unit,confidence:unit.min(.7)}).strict()).min(2).max(20000)}).strict();
const base={id,x:unit,y:unit,width:unit.min(.005),height:unit.min(.005),opacity:unit.default(1),rotation:z.number().min(-180).max(180).default(0),scale:z.number().min(.25).max(2).default(1),animations:z.array(animation).max(8).default([]),active:z.object({fromFrame:frame,durationFrames:frame.min(1)}).strict().optional(),anchorTrack:anchorTrack.optional()};
const font=z.string().min(1).max(80).regex(/^[A-Za-z0-9 -]+$/);
const text=z.object({...base,type:z.literal('text'),text:z.string().min(1).max(220),font:font.default('Geist'),weight:z.union([z.literal(400),z.literal(700)]).default(700),fontSize:z.number().min(16).max(220),color,align:z.enum(['left','center','right']).default('left'),kinetic:z.enum(['none','word','character','speech']).default('none'),staggerFrames:frame.max(12).default(2),enterFrames:frame.min(1).max(90).default(24),speechWords:z.array(z.object({text:z.string().min(1).max(100),fromFrame:frame,toFrame:frame.min(1)}).strict()).min(1).max(100).optional(),highlightColor:color.optional()}).strict();
const media=z.object({...base,type:z.literal('media'),assetId:id,sourceStartSeconds:z.number().nonnegative().max(3600).default(0),fit:z.literal('contain').default('contain'),volume:unit.default(0),radius:unit.max(.5).default(0),maskAssetId:id.optional(),maskStartSeconds:z.number().nonnegative().max(3600).optional()}).strict();
const shape=z.object({...base,type:z.literal('shape'),shape:z.enum(['rect','ellipse']),fill:color,radius:unit.max(.5).default(0)}).strict();
const vector=z.object({...base,type:z.literal('path'),d:z.string().min(1).max(3000).regex(/^[MmLlHhVvCcSsQqTtAaZz0-9eE+.,\s-]+$/),color,strokeWidth:z.number().min(.1).max(30),progress:unit.default(1)}).strict();
export const graphPlanSchema=z.object({
 schemaVersion:z.literal(2),provider:z.literal('agent'),styleId:id,selectedStyleIds:z.array(id).min(1).max(10),contextSha256:hash,objective:z.string().min(3).max(12000),
 output:z.object({format:z.enum(['16:9','9:16','1:1','4:5']),width:z.number().int().positive().max(1920),height:z.number().int().positive().max(1920),fps:z.union([z.literal(24),z.literal(30)]),durationFrames:frame.min(24).max(108000),codec:z.literal('h264')}).strict(),
 fidelity:z.object({preserveOriginals:z.literal(true),inventAngles:z.literal(false),avatar:z.boolean()}).strict(),
 scenes:z.array(z.object({id,durationFrames:frame.min(2),role:z.enum(['opening','body','details','demonstration','closing']),background:color,initialState:z.string().min(1).max(500),action:z.string().min(1).max(500),result:z.string().min(1).max(500),transition:z.object({type:z.enum(['cut','dissolve','wipe']),durationFrames:frame.max(60),reason:z.string().min(1).max(300)}).strict(),layers:z.array(z.discriminatedUnion('type',[text,media,shape,vector])).min(1).max(40)}).strict()).min(1).max(180),
 audio:z.object({proceduralScore:z.boolean().default(false),bpm:z.number().min(40).max(200).default(100),tracks:z.array(z.object({assetId:id,role:z.enum(['narration','music','sfx']),fromFrame:frame,sourceStartSeconds:z.number().nonnegative().default(0),durationFrames:frame.min(1),volume:unit,fadeFrames:frame.max(90).default(8),loop:z.boolean().default(false)}).strict()).max(40)}).strict(),
 captions:z.array(z.object({start:z.number().nonnegative(),end:z.number().positive(),text:z.string().min(1).max(180)}).strict()).max(2000),
 captionFont:font.default('Geist'),
 styleBindings:z.array(z.object({styleId:id,aspect:id,scope:z.enum(['film','opening','body','details','demonstration','closing']),sceneIds:z.array(id).min(1).max(180),decision:z.string().min(5).max(1000),implementation:z.enum(['layers','original-media','generated-media']),referenceIds:z.array(z.string().min(1).max(200)).min(1).max(40)}).strict()).min(1).max(1000),
 limitations:z.array(z.string().min(1).max(500)).max(30),
}).strict();

export function validateGraphPlan(raw,assets,request,context){
 const p=graphPlanSchema.parse(raw),o=p.output,[width,height]=dimensions[o.format];
 if(width!==o.width||height!==o.height)throw Error('Resolution does not match selected format');
 if(p.scenes.reduce((n,s)=>n+s.durationFrames,0)!==o.durationFrames)throw Error('Explicit scene durations must equal output duration');
 if(p.styleId!==p.selectedStyleIds[0]||new Set(p.selectedStyleIds).size!==p.selectedStyleIds.length)throw Error('Invalid principal/selected styles');
 if(request&&(p.objective!==request.prompt||p.styleId!==request.styleId||JSON.stringify(p.selectedStyleIds)!==JSON.stringify(request.selectedStyleIds)||p.contextSha256!==request.contextSha256||o.format!==request.format||o.fps!==request.fps||o.durationFrames!==Math.round(request.durationSeconds*request.fps)))throw Error('Plan changed the imported request');
 const sceneIds=new Set(),byAsset=new Map(assets.map(a=>[a.id,a]));
 const asset=(id,kind)=>{const a=byAsset.get(id);if(!a||request&&!request.assetIds.includes(id)||kind&&!kind.includes(a.kind))throw Error('Unknown or incompatible input asset');return a;};
 for(const [i,s]of p.scenes.entries()){
  if(sceneIds.has(s.id))throw Error('Duplicate scene ID');sceneIds.add(s.id);
  const previous=p.scenes[i-1];
  if(s.transition.type==='cut'?s.transition.durationFrames!==0:!previous||s.transition.durationFrames<1||s.transition.durationFrames>=Math.min(s.durationFrames,previous.durationFrames))throw Error('Transition must fit both adjacent shots');
  const layerIds=new Set();for(const l of s.layers){
   if(layerIds.has(l.id))throw Error('Duplicate layer ID');layerIds.add(l.id);
   if(l.x+l.width>1.001||l.y+l.height>1.001)throw Error('Layer exceeds output bounds');
   if(l.active&&l.active.fromFrame+l.active.durationFrames>s.durationFrames)throw Error('Layer visibility exceeds shot');
   if(l.type==='media'){
    const a=asset(l.assetId,['image','video']);if(a.kind==='video'&&l.sourceStartSeconds+s.durationFrames/o.fps>a.durationSeconds+1/o.fps)throw Error('Source video is too short');if(a.kind==='image'&&l.sourceStartSeconds!==0)throw Error('Image cannot be trimmed');
    if(l.maskStartSeconds!==undefined&&!l.maskAssetId)throw Error('Mask time requires a mask asset');
    if(l.maskAssetId){const mask=asset(l.maskAssetId,['image','video']);if(a.kind!=='video'||mask.width!==a.width||mask.height!==a.height)throw Error('Mask must match the original video dimensions');if(mask.hasAudio)throw Error('Mask must not contain audio');if(mask.kind==='video'&&(l.maskStartSeconds??l.sourceStartSeconds)+s.durationFrames/o.fps>mask.durationSeconds+1/o.fps)throw Error('Mask video is too short');if(mask.kind==='image'&&(l.maskStartSeconds??0)!==0)throw Error('Static mask cannot be trimmed');}
   }
   if(l.anchorTrack){
    const t=l.anchorTrack,a=asset(t.sourceAssetId,['video']),start=l.active?.fromFrame??0,end=start+(l.active?.durationFrames??s.durationFrames)-1;
    if(t.sourceStartSeconds+s.durationFrames/o.fps>a.durationSeconds+1/o.fps||!s.layers.some(v=>v.type==='media'&&v.assetId===a.id&&Math.abs(v.sourceStartSeconds-t.sourceStartSeconds)<.001))throw Error('Anchor track must bind the original trimmed presenter video');
    if(l.animations.some(v=>['x','y'].includes(v.property)))throw Error('Anchor track conflicts with position animation');
    if(t.points[0].frame>start||t.points.at(-1).frame<end)throw Error('Anchor track must cover the visible interval');
    let last=-1;for(const point of t.points){if(point.frame<=last||point.frame>=s.durationFrames)throw Error('Anchor points must be ordered inside the shot');last=point.frame;const x=point.x+t.offsetX-l.width/2,y=point.y+t.offsetY-l.height/2;if(x<0||y<0||x+l.width>1.001||y+l.height>1.001)throw Error('Tracked layer exceeds output bounds');}
   }
   if(l.type==='text'&&l.kinetic==='speech'){
    if(!l.speechWords||l.speechWords.map(w=>w.text).join(' ').replace(/\s+/gu,' ').trim()!==l.text.replace(/\s+/gu,' ').trim())throw Error('Speech timing must preserve the exact text');
    let end=0;for(const w of l.speechWords){if(w.fromFrame<end||w.toFrame<=w.fromFrame||w.toFrame>s.durationFrames)throw Error('Invalid speech word timing');end=w.toFrame;}
   }else if(l.type==='text'&&l.speechWords)throw Error('Speech words require speech kinetic mode');
   if(l.type==='text'&&!['none','speech'].includes(l.kinetic)){const count=l.kinetic==='word'?l.text.split(/\s+/u).length:Array.from(l.text.replace(/\s/gu,'')).length;if(l.enterFrames+(count-1)*l.staggerFrames>s.durationFrames-Math.min(o.fps,s.durationFrames/3))throw Error('Kinetic text needs a readable hold');}
   const properties=new Set();for(const a of l.animations){if(properties.has(a.property))throw Error('Duplicate animated property');properties.add(a.property);let last=-1;for(const k of a.keyframes){if(k.frame<=last||k.frame>=s.durationFrames)throw Error('Keyframes must be ordered and inside the shot');last=k.frame;const range=['opacity','reveal','pathProgress'].includes(a.property)?[0,1]:a.property==='scale'?[.25,2]:a.property==='rotation'?[-180,180]:a.property==='tracking'?[-10,30]:[-1,2];if(k.value<range[0]||k.value>range[1])throw Error('Animation value outside operator bounds');}}
  }
 }
 for(const t of p.audio.tracks){const a=asset(t.assetId,['audio','video']);if(t.loop&&(t.role!=='music'||t.sourceStartSeconds!==0))throw Error('Looping is allowed only for an authorized music track starting at zero');if(!a.hasAudio||!t.loop&&t.sourceStartSeconds+t.durationFrames/o.fps>a.durationSeconds+1/o.fps||t.fromFrame+t.durationFrames>o.durationFrames)throw Error('Audio timing exceeds source/output');}
 let end=0;for(const c of p.captions){if(c.start<end||c.end<=c.start||c.end>o.durationFrames/o.fps)throw Error('Invalid caption timing');if(c.text.length>Math.floor(o.width*.88/((o.width>o.height?28:30)*.6))*2)throw Error('Split long captions into readable timed cues');end=c.end;}
 for(const b of p.styleBindings){if(!p.selectedStyleIds.includes(b.styleId)||b.sceneIds.some(id=>!sceneIds.has(id)))throw Error('Style binding refers to an unselected style/unknown shot');if(b.scope!=='film'&&b.sceneIds.some(id=>p.scenes.find(s=>s.id===id).role!==b.scope))throw Error('Style contribution used outside selected scope');}
 for(const id of p.selectedStyleIds)if(!p.styleBindings.some(b=>b.styleId===id))throw Error('Selected style silently omitted');
 if(context){
  if(context.contextSha256!==p.contextSha256)throw Error('Imported context changed');
  if(context.availableFontPairs){const pairs=p.scenes.flatMap(s=>s.layers.filter(l=>l.type==='text').map(l=>`${l.font}:${l.weight}`));if(p.captions.length)pairs.push(`${p.captionFont}:400`);if(pairs.some(pair=>!context.availableFontPairs.includes(pair)))throw Error('Font file/license not available in the verified runtime');}
  if(context.typographySelection){const fonts=new Set([context.typographySelection.heading,context.typographySelection.body]);if(p.scenes.some(s=>s.layers.some(l=>l.type==='text'&&!fonts.has(l.font)))||p.captions.length&&p.captionFont!==context.typographySelection.body)throw Error('Preserve the explicit typography selected in the site');}
  const avatarAllowed=context.combination.entries.some(e=>context.styles.find(s=>s.id===e.styleId)?.avatar&&e.contributions.some(c=>['style_direction','presenter'].includes(c.aspect)));
  if(p.fidelity.avatar&&!avatarAllowed)throw Error('Avatar requires an explicit presenter selection');
  for(const entry of context.combination.entries){
   const style=context.styles.find(s=>s.id===entry.styleId),fullAd=style?.advertising?.narrationRequired&&entry.contributions.some(c=>c.aspect==='style_direction'&&c.scope==='film');
   if(fullAd&&(!p.audio.tracks.some(t=>t.role==='narration')||!p.captions.length))throw Error('Selected narrated ad requires actual narration and synchronized captions');
   for(const contribution of entry.contributions){const matches=p.styleBindings.filter(b=>b.styleId===entry.styleId&&b.aspect===contribution.aspect&&(contribution.scope==='propose'||b.scope===contribution.scope));if(!matches.length)throw Error(`Unbound selected contribution: ${entry.styleId}/${contribution.aspect}/${contribution.scope}`);}
  }
  for(const b of p.styleBindings){const e=context.combination.entries.find(e=>e.styleId===b.styleId);if(!e?.contributions.some(c=>c.aspect===b.aspect&&(c.scope==='propose'||c.scope===b.scope)))throw Error('Plan imported an unselected characteristic');const refs=context.referenceManifest.styles.find(s=>s.styleId===b.styleId)?.frames.map(f=>`${b.styleId}:frame:${f.number}`)??[];if(b.referenceIds.some(id=>!refs.includes(id)))throw Error('Binding must identify actual selected reference frames');}
 }
 return p;
}
