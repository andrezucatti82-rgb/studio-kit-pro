import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const root=new URL('../style-atlas/dist/',import.meta.url);
const catalog=JSON.parse(readFileSync(new URL('catalog.json',root),'utf8'));
const ctx={};vm.createContext(ctx);vm.runInContext(readFileSync(new URL('folio-model.js',root),'utf8'),ctx);
const model=ctx.FolioCollections;

test('preview frames follow each original panel, including portrait and landscape artwork',()=>{
 for(const s of catalog.styles){
  const frame=s.sequence.frames[s.sequence.heroIndex??1];
  const [w,h]=model.previewRatio(s).split('/').map(Number);
  assert.equal(w/h,frame.width/frame.height,s.id);
 }
 assert.equal(model.previewRatio({image:{width:1600,height:900}}),'1600/900');
 assert.equal(model.previewRatio({image:{width:900,height:1600}}),'900/1600');
 assert.equal(model.previewRatio({image:{width:0,height:0}}),'3/4');
});

test('each Fólio discovery goal reaches the complete real catalogue with no orphan family',()=>{
 for(const goal of model.goals){
  const collections=model.definitions.filter(c=>c.goal===goal.id);
  for(const s of catalog.styles)assert.ok(collections.some(c=>model.matchesCollection(s,c)),`${goal.id}: ${s.id} is unreachable`);
 }
 for(const c of model.definitions){
  assert.ok(catalog.styles.some(s=>model.matchesCollection(s,c)),`${c.id} is empty`);
  for(const id of c.families)assert.ok(catalog.families.some(f=>f.id===id),`${c.id}: unknown ${id}`);
 }
});

test('a niche keeps actual presenter sectors distinct and has real references for every option',()=>{
 const options=model.niches(catalog.styles);assert.equal(options.length,53);
 for(const niche of options)assert.ok(catalog.styles.some(s=>model.matchesNiche(s,niche.id,options)),niche.id);
 const dentists=catalog.styles.filter(s=>s.presenterEditing?.sector==='dentistas');
 assert.ok(dentists.length>=10);assert.ok(dentists.every(s=>model.matchesNiche(s,'dentistas',options)));
 const fitness=catalog.styles.find(s=>s.presenterEditing?.sector==='fitness');
 assert.equal(model.matchesNiche(fitness,'dentistas',options),false);
 assert.equal(model.matchesNiche(fitness,'',options),true);
 assert.equal(model.matchesNiche(fitness,'unknown',options),false);
});

test('shelf diversification keeps every original ID once and brings different businesses forward',()=>{
 const source=catalog.styles.filter(s=>s.presenterEditing),preferred=[source[5].id,source[5].id,'missing'];
 const ordered=model.diversify(source,preferred);
 assert.equal(ordered[0].id,source[5].id);assert.equal(ordered.length,source.length);
 assert.equal(new Set(ordered.map(s=>s.id)).size,source.length);
 assert.ok(new Set(ordered.slice(1,9).map(s=>s.presenterEditing.sector)).size>=7);
 assert.deepEqual([...source].map(s=>s.id),catalog.styles.filter(s=>s.presenterEditing).map(s=>s.id));
});
