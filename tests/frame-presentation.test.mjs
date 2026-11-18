import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
test('presentation crops address only their original logical panels and never mutate media contracts',async()=>{
 const catalog=JSON.parse(await readFile(new URL('style-atlas/dist/catalog.json',root),'utf8')),original=JSON.stringify(catalog);
 const ctx={};ctx.window=ctx;vm.createContext(ctx);
 for(const name of ['frame-presentation.js','gallery-views.js'])vm.runInContext(await readFile(new URL('style-atlas/dist/'+name,root),'utf8'),ctx);
 let frames=0,changed=0;
 for(const style of catalog.styles)for(const [i,source]of style.sequence.frames.entries()){
  frames++;const view=ctx.AtlasViews.frameView(style,i);
  assert.equal(view.src,source.src);assert.equal(view.thumbnail,source.thumbnail);
  if(ctx.AtlasFramePresentation[style.id]?.[i]){
   changed++;const [x,y,w,h]=view.crop,[sx,sy,sw,sh]=source.crop||[0,0,1,1];
   assert(x>=sx-1e-8&&y>=sy-1e-8&&x+w<=sx+sw+1e-8&&y+h<=sy+sh+1e-8,style.id+':'+i);
   assert(w>0&&h>0&&view.width>0&&view.height>0);
   assert.match(ctx.AtlasViews.picture(style,i),/reference-panel/);
  }
 }
 const report=JSON.parse(await readFile(new URL('style-atlas/records/frame-framing/report.json',root),'utf8'));
 assert.equal(frames,5700);assert.equal(changed,report.adjustedFrames);assert(changed>0);
 assert.equal(JSON.stringify(catalog),original);
 const example=catalog.styles.find(s=>s.id==='natural-advocacia-antes-da-assinatura-uma-conversa');
 for(let i=0;i<4;i++)assert(ctx.AtlasFramePresentation[example.id][i],'the reported white border must be handled in all four moments');
});
