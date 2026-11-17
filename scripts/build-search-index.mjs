import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import '../style-atlas/dist/search.js';
const file=new URL('../style-atlas/dist/catalog.json',import.meta.url),c=JSON.parse(await fs.readFile(file,'utf8'));
const edits=JSON.parse(await fs.readFile(new URL('../style-atlas/records/search/overrides.json',import.meta.url),'utf8'));
for(const [id,record]of Object.entries(edits)){if(!c.styles.some(s=>s.id===id)||!Array.isArray(record.tags)||!record.evidence)throw Error('Invalid editorial search tags: '+id);}
c.search={version:1,language:'pt-BR',sourceSha256:createHash('sha256').update(JSON.stringify(c.styles.map(AtlasSearch.fields))).digest('hex'),styleTags:Object.fromEntries(c.styles.map(s=>[s.id,AtlasSearch.tagsFor(s,edits[s.id]?.tags||[])]))};
await fs.writeFile(file,JSON.stringify(c,null,2)+'\n');
console.log(`${c.styles.length} styles indexed; ${Object.values(c.search.styleTags).reduce((n,t)=>n+t.length,0)} editorial keyword associations.`);
