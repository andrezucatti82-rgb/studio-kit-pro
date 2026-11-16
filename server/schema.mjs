import {z} from 'zod';

export const STYLE_ID = 'campanha-frase-que-reorganiza-o-quadro';
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
const text = z.string().trim().min(1).max(180);
const frame = z.number().int().nonnegative();
export const captionSchema = z.object({start: z.number().nonnegative(), end: z.number().positive(), text}).strict();
export const requestSchema = z.object({
  prompt: z.string().trim().min(3).max(4000), styleId: z.literal(STYLE_ID),
  assetIds: z.array(id).min(1).max(8).refine(values=>new Set(values).size===values.length,'Duplicate asset IDs'), musicAssetId: id.optional(),
  durationSeconds: z.number().int().min(10).max(60).default(30),
  format: z.enum(['16:9', '9:16', '1:1', '4:5']).default('16:9'),
  fps: z.union([z.literal(24), z.literal(30)]).default(30),
  captions: z.array(captionSchema).max(12).default([]),
}).strict();
const easing = z.tuple([z.number().min(0).max(1), z.number().min(-1).max(2), z.number().min(0).max(1), z.number().min(-1).max(2)]);
export const planSchema = z.object({
  schemaVersion: z.literal(1), styleId: z.literal(STYLE_ID), objective: z.string().min(3).max(4000),
  provider: z.enum(['deterministic', 'openai']),
  output: z.object({format: z.enum(['16:9','9:16','1:1','4:5']), width: z.number().int().positive().max(1920), height: z.number().int().positive().max(1920), fps: z.union([z.literal(24),z.literal(30)]), durationFrames: frame.min(240).max(1800), codec: z.literal('h264')}).strict(),
  direction: z.object({paper: z.literal('#eeeadd'), ink: z.literal('#152d37'), accent: z.literal('#003dea'), font: z.literal('Geist'), movement: z.string().min(1), sound: z.string().min(1)}).strict(),
  fidelity: z.object({fit: z.literal('contain'), preserveOriginals: z.literal(true), inventAngles: z.literal(false), avatar: z.literal(false)}).strict(),
  resources: z.array(z.enum(['Remotion','FFmpeg','Geist OFL','video-multimarcas'])).min(1).max(4),
  audio: z.object({musicAssetId: id.optional(), proceduralScore: z.boolean(), bpm: z.literal(100), sourceVolume: z.number().min(0).max(1), musicVolume: z.number().min(0).max(1)}).strict(),
  scenes: z.array(z.object({
    id, assetId: id, sourceStartSeconds: z.number().nonnegative().max(3600), durationFrames: frame.min(30),
    title: text.max(70), caption: text, kind: z.enum(['organize','reveal','connect']),
    initialState: text, action: text, result: text,
    transition: z.object({type: z.enum(['cut','shape-reveal']), durationFrames: frame.max(24), reason: text}).strict(),
    animation: z.object({unit: z.enum(['word','character']), delayFrames: frame.max(30), staggerFrames: frame.min(1).max(6), durationFrames: frame.min(6).max(60), easing, tracking: z.number().min(-2).max(8)}).strict(),
    camera: z.object({type: z.literal('graphic-parallax'), distance: z.number().min(0).max(30)}).strict(),
    effects: z.array(z.enum(['track-matte','trim-path','shape-morph'])).max(3),
  }).strict()).min(3).max(8),
  captions: z.array(captionSchema).min(1).max(12),
}).strict();

export const dimensions = {'16:9':[1280,720], '9:16':[720,1280], '1:1':[1080,1080], '4:5':[864,1080]};
export function validatePlan(value, assets, request) {
  const plan = planSchema.parse(value), {output} = plan;
  const [width,height] = dimensions[output.format];
  if (output.width !== width || output.height !== height) throw Error('Resolution does not match format');
  if (request && (plan.objective !== request.prompt || plan.styleId !== request.styleId || output.format !== request.format || output.fps !== request.fps || output.durationFrames !== request.durationSeconds * request.fps || plan.audio.musicAssetId !== request.musicAssetId)) throw Error('Plan changed the requested brief or output');
  if (plan.scenes.reduce((n,s)=>n+s.durationFrames,0) !== output.durationFrames) throw Error('Scene durations do not match output');
  if (!plan.scenes.some(s=>s.kind==='organize') || !plan.scenes.some(s=>s.kind==='connect')) throw Error('Style requires reorganization and a connecting conclusion');
  const sceneIds = new Set();
  let cursor=0;
  for (const scene of plan.scenes) {
    if (sceneIds.has(scene.id)) throw Error('Duplicate scene ID'); sceneIds.add(scene.id);
    const asset=assets.find(a=>a.id===scene.assetId);
    if (!asset || !['image','video'].includes(asset.kind) || (request && !request.assetIds.includes(asset.id))) throw Error('Unknown visual asset');
    if (scene.transition.type==='cut' ? scene.transition.durationFrames!==0 : scene.transition.durationFrames<1) throw Error('Invalid transition');
    if (cursor===0 && scene.transition.type!=='cut') throw Error('First scene must start with a cut');
    if (scene.transition.durationFrames >= scene.durationFrames) throw Error('Transition exceeds scene');
    if (scene.kind==='connect'&&!scene.effects.includes('trim-path')) throw Error('Connecting conclusion requires its trim path');
    if (scene.kind!=='connect'&&scene.effects.includes('trim-path')) throw Error('Trim path belongs to the connecting conclusion');
    if (scene.kind==='connect'&&scene.effects.includes('track-matte')) throw Error('Track matte requires a scene with media');
    const count=scene.animation.unit==='word'?scene.title.split(/\s+/u).length:Array.from(scene.title).length;
    if (scene.animation.delayFrames+(count-1)*scene.animation.staggerFrames+scene.animation.durationFrames > scene.durationFrames-output.fps) throw Error('Animation leaves insufficient reading time');
    if (asset.kind==='video' && scene.sourceStartSeconds+scene.durationFrames/output.fps > asset.durationSeconds+1/output.fps) throw Error('Source clip is too short');
    if (asset.kind==='image' && scene.sourceStartSeconds!==0) throw Error('Images cannot be trimmed');
    cursor+=scene.durationFrames;
  }
  let end=0;
  for (const caption of plan.captions) {
    if (caption.start<end || caption.end<=caption.start || caption.end>output.durationFrames/output.fps+0.0001) throw Error('Invalid caption timing');
    end=caption.end;
  }
  if (plan.audio.musicAssetId && !assets.some(a=>a.id===plan.audio.musicAssetId && a.kind==='audio')) throw Error('Unknown music asset');
  if (plan.audio.proceduralScore === Boolean(plan.audio.musicAssetId)) throw Error('Choose one music source');
  return plan;
}
