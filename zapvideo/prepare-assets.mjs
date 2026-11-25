import {createHash} from 'node:crypto';
import {cp, mkdir, readFile, rm, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';

const from = path.resolve('style-atlas/dist'), out = path.resolve('.cache/zapvideo/assets');
const catalog = await readFile(path.join(from,'catalog.json'));
const hash = createHash('sha256').update(catalog).digest('hex');
const localSizeLimit = 25 * 1024 ** 2;
await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});
await cp(from,out,{recursive:true,filter:async file => {
  const relative = path.relative(from,file);
  if (relative === 'catalog.json' || /\.php(?:$|[./\\])/i.test(relative)) return false;
  const info = await stat(file);
  if (info.isFile() && info.size > localSizeLimit) throw new Error(`Arquivo excede o limite de Static Assets: ${relative}`);
  return true;
}});
const sourceCatalog=JSON.parse(catalog);
const styleIndex=sourceCatalog.styles.map(style=>({
  id:style.id,label:style.name,family:style.family,familyName:style.familyName,
  caption:String(style.signature || '').slice(0,170),uses:String(style.uses || '').slice(0,180),
  tags:sourceCatalog.search?.styleTags?.[style.id]?.slice(0,24) || [],
  specialty:style.presenterEditing?.sector || '',
  needsPerson:Boolean(style.presenterEditing || style.preset?.avatar),
  frames:(style.sequence?.frames || []).slice(0,4).map(frame=>({
    image:'/'+(frame.crop?frame.src:frame.thumbnail || frame.src), label:frame.label,
    caption:(frame.caption || frame.action || '').slice(0,160), ...(frame.crop?{crop:frame.crop}:{}),
  })),
}));
await writeFile(path.join(out,'zapvideo-style-index.json'),JSON.stringify(styleIndex));
const {build} = await import('esbuild');
await build({entryPoints:['zapvideo/zip-browser.mjs'], bundle:true, format:'esm', outfile:path.join(out,'zapvideo-zip.mjs')});
await writeFile(path.join(out,'zapvideo-runtime.js'),
  `globalThis.ATLAS_CATALOG_URL = '/catalog.json?v=${hash}';\nglobalThis.ATLAS_HANDOFF_ENDPOINT = '/api/zapvideo/handoff';\n`);
for (const name of ['index.html','download.html']) {
  const target = path.join(out,name);
  const html = await readFile(target,'utf8');
  const meta = name === 'index.html' ? '<link rel="canonical" href="https://zapvideo.com.br/catalogo">' : '';
  await writeFile(target,html.replace('</head>',meta+'<script src="/zapvideo-runtime.js"></script></head>'));
}
await writeFile(path.join(out,'catalog-version.json'),JSON.stringify({key:`catalog/${hash}.json`,sha256:hash,bytes:catalog.length}));
console.log(JSON.stringify({catalogKey:`catalog/${hash}.json`,bytes:catalog.length,directory:out}));
