import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import '../style-atlas/dist/search.js';
const file=new URL('../style-atlas/dist/catalog.json',import.meta.url),c=JSON.parse(await fs.readFile(file,'utf8'));
const edits=JSON.parse(await fs.readFile(new URL('../style-atlas/records/search/overrides.json',import.meta.url),'utf8'));
for(const [id,record]of Object.entries(edits)){if(!c.styles.some(s=>s.id===id)||!Array.isArray(record.tags)||!record.evidence)throw Error('Invalid editorial search tags: '+id);}
const colors=JSON.parse(await fs.readFile(new URL('../style-atlas/records/search/colors.json',import.meta.url),'utf8'));
if(Object.keys(colors.styles).length!==c.styles.length)throw Error('Reference colors must cover the complete catalogue');
const verifyMedia=process.argv.includes('--verify-media');
const presentation=JSON.parse((await fs.readFile(new URL('../style-atlas/dist/frame-presentation.js',import.meta.url),'utf8')).split('window.AtlasFramePresentation=')[1].trim().replace(/;$/,''));
for(const s of c.styles){const i=s.sequence.heroIndex??1,frame=s.sequence.frames[i],record=colors.styles[s.id],crop=presentation[s.id]?.[i]?.[0]||frame.crop||[0,0,1,1];if(record?.source!==frame.src||JSON.stringify(record.crop)!==JSON.stringify(crop)||!record.colors?.length)throw Error('Stale reference color evidence: '+s.id);if(verifyMedia){const hash=createHash('sha256').update(await fs.readFile(new URL('../style-atlas/dist/'+frame.src,import.meta.url))).digest('hex');if(hash!==record.sourceSha256)throw Error('Changed reference image: rerun color analysis for '+s.id);}}
const styleColors=Object.fromEntries(c.styles.map(s=>[s.id,colors.styles[s.id].colors.map(c=>c.tag)]));
const analysis=Object.fromEntries(c.styles.map(s=>[s.id,AtlasSearch.analyze(s,edits[s.id]?.tags||[],styleColors[s.id])]));
c.search={version:1,language:'pt-BR',sourceSha256:createHash('sha256').update(JSON.stringify(c.styles.map(AtlasSearch.fields))).digest('hex'),referenceColorsSha256:createHash('sha256').update(JSON.stringify(colors.styles)).digest('hex'),styleColors,styleTags:Object.fromEntries(Object.entries(analysis).map(([id,a])=>[id,a.tags]))};
await fs.writeFile(file,JSON.stringify(c,null,2)+'\n');
const report={version:2,styleCount:c.styles.length,tagAssociations:Object.values(c.search.styleTags).reduce((n,t)=>n+t.length,0),referenceFramesAnalyzed:Object.keys(colors.styles).length,analysisBasis:'positive catalogue descriptions, intended commercial uses, declared palettes and measured reference colors; not a claim of visual or audiovisual review',styleDataSha256:createHash('sha256').update(JSON.stringify(c.styles)).digest('hex'),styles:analysis};
await fs.writeFile(new URL('../style-atlas/records/search/enrichment.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(`${c.styles.length} styles indexed; ${Object.values(c.search.styleTags).reduce((n,t)=>n+t.length,0)} editorial keyword associations.`);
