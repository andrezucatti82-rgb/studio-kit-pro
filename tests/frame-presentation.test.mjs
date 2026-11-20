import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
test('presentation crops address only their original logical panels and never mutate media contracts',async()=>{
 const catalog=JSON.parse(await readFile(new URL('style-atlas/dist/catalog.json',root),'utf8')),original=JSON.stringify(catalog);
 const ctx={};ctx.window=ctx;vm.createContext(ctx);
 for(const name of ['frame-presentation.js','gallery-views.js'])vm.runInContext(await readFile(new URL('style-atlas/dist/'+name,root),'utf8'),ctx);
 ctx.AtlasSearch={styleCode:id=>id};
 for(const style of catalog.styles){
  assert(style.uses.trim().length>0,style.id);
  const summary='<section class="direction-use direction-summary"><h3>Resumo do estilo</h3><p>'+ctx.AtlasViews.esc(style.uses)+'</p></section>';
  assert(ctx.AtlasViews.detail(style,{requirementsHtml:()=>'',readinessHtml:()=>''}).includes(summary),style.id);
 }
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
 assert.equal(frames,5820);assert.equal(changed,report.adjustedFrames);assert(changed>0);
 assert.equal(JSON.stringify(catalog),original);
 const example=catalog.styles.find(s=>s.id==='natural-advocacia-antes-da-assinatura-uma-conversa');
 for(let i=0;i<4;i++)assert(ctx.AtlasFramePresentation[example.id][i],'the reported white border must be handled in all four moments');
 const jewelry=report.frames.filter(f=>f.style==='natural-joias-do-gesto-a-assinatura');assert.equal(jewelry.length,4);for(const frame of jewelry){assert.equal(frame.edgeRule,'coherent_light_frame');assert(frame.insetPixels.every(n=>n>0),'warm paper must be handled on every side');}
 const smile=report.frames.filter(f=>f.style==='explicador-orbita-frente-tras');
 assert.deepEqual(smile.map(f=>f.insetPixels),[[5,5,4,4],[3,5,5,4],[5,3,4,5],[3,3,5,5]]);
 const bench=catalog.styles.find(s=>s.id==='conceito-em-exemplo-e-nao-exemplo');
 for(const [i,edges] of [[1,[0]],[2,[1]],[3,[0,1]]]){
  const original=bench.sequence.frames[i],view=ctx.AtlasViews.frameView(bench,i);
  const audit=report.frames.find(f=>f.style===bench.id&&f.frame===i);
  assert.equal(original.crop,undefined);
  assert.equal(audit.edgeRule,'gray_hairline');
  assert.deepEqual(audit.grayHairlineEdges,edges);
  for(const edge of edges)assert(audit.insetPixels[edge]>=3);
  assert(view.crop);
  assert(ctx.AtlasViews.picture(bench,i,'','',true).includes(original.thumbnail));
 }
 assert.equal(ctx.AtlasViews.frameView(bench,0).crop,undefined);
 const fashion=report.frames.filter(f=>f.style==='natural-moda-feminina-uma-peca-o-seu-dia');
 assert.equal(fashion.length,4);
 assert(fashion.every(f=>f.insetPixels.every(n=>n>0)),'the pale margin must be trimmed on all four sides');
 assert.deepEqual(fashion[0].paleMarginEdges,[3]);
 assert.deepEqual(fashion[3].paleMarginEdges,[1,3]);
});
