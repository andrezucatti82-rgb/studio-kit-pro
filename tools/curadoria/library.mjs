import {readFile, realpath, mkdir, rm, mkdtemp, writeFile} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {pipeline} from 'node:stream/promises';
import {Transform} from 'node:stream';
import path from 'node:path';

const catalog = JSON.parse(await readFile(new URL('../../.agents/skills/video-multimarcas/references/curadoria/fontes.json', import.meta.url), 'utf8')).sources;
const CC0 = 'https://creativecommons.org/publicdomain/zero/1.0/';
const LIMIT = 128 * 1024 * 1024;
const APIS = {
  commons: 'https://commons.wikimedia.org/w/api.php',
  openverse: 'https://api.openverse.org/v1/',
  polyhaven: 'https://api.polyhaven.com/',
  ambientcg: 'https://ambientcg.com/api/v2/full_json',
  met: 'https://collectionapi.metmuseum.org/public/collection/v1/',
  metSearch: 'https://collectionapi.metmuseum.org/public/collection/v1.1/search',
};
const headers = {'User-Agent': 'StudioKitPro-Curadoria/1.0 (https://github.com/andrezucatti82-rgb/studio-kit-pro)'};

export function sources({type, includeReferences = false} = {}) {
  return catalog.filter(item => (!type || item.types.includes(type)) && (includeReferences || item.policy !== 'reference'));
}
function url(base, parameters) {
  const result = new URL(base);
  for (const [key, value] of Object.entries(parameters)) result.searchParams.set(key, value);
  return result;
}
async function getJson(address) {
  const response = await fetch(address, {headers, redirect:'error', signal:AbortSignal.timeout(35000)});
  if (!response.ok) throw Error('Fonte indisponível: ' + new URL(address).host + ' HTTP ' + response.status);
  return response.json();
}
const clean = value => String(value || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 300);
const licenseValue = (meta, key) => meta?.[key]?.value;
export function commonsRights(meta) {
  const licenseUrl = String(licenseValue(meta, 'LicenseUrl') || '');
  const flag = key => /^(1|true|yes)$/i.test(String(licenseValue(meta, key) || '').trim());
  const restrictions = clean(licenseValue(meta, 'Restrictions'));
  const cc0 = /^https?:\/\/creativecommons\.org\/publicdomain\/zero\/1\.0(?:\/(?:deed(?:\.[a-z-]+)?|legalcode(?:\.[a-z-]+)?)?)?$/i.test(licenseUrl);
  return {
    license: cc0 ? 'CC0' : clean(licenseValue(meta,'LicenseShortName')) || 'indeterminada',
    licenseUrl, creator:clean(licenseValue(meta,'Artist')),
    downloadable:cc0 && !restrictions && !flag('AttributionRequired'),
    restrictions,
  };
}
async function commons(parameters) {
  const data = await getJson(url(APIS.commons, {
    action:'query', format:'json', formatversion:2, prop:'imageinfo', iiprop:'url|mime|size|extmetadata|sha1',
    iiextmetadatafilter:'LicenseShortName|LicenseUrl|Artist|AttributionRequired|Restrictions', ...parameters,
  }));
  if (data.error) throw Error('Commons: ' + clean(data.error.info));
  return (data.query?.pages || []).filter(page => page.imageinfo?.[0]).map(page => {
    const info = page.imageinfo[0], rights = commonsRights(info.extmetadata);
    return {source:'commons', id:String(page.pageid), title:page.title, page:info.descriptionurl,
      mime:info.mime, bytes:info.size, ...rights, files:rights.downloadable ? [{id:'original', url:info.url, bytes:info.size}] : []};
  });
}
const assetName = id => {
  if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,99}$/i.test(id)) throw Error('ID de ativo inválido');
  return id;
};
const numericId = id => {
  if (typeof id !== 'string' || !/^\d{1,14}$/.test(id)) throw Error('Identificador numérico inválido');
  return id;
};
const preset = {
  source:'naturalearth', id:'countries-110m', title:'Admin 0 countries 1:110m',
  page:'https://www.naturalearthdata.com/downloads/110m-cultural-vectors/110m-admin-0-countries/',
  creator:'Natural Earth', license:'Domínio público (dedicação da fonte)',
  licenseUrl:'https://www.naturalearthdata.com/about/terms-of-use/', downloadable:true,
  files:[{id:'zip', url:'https://naturalearth.s3.amazonaws.com/110m_cultural/ne_110m_admin_0_countries.zip'}],
};
const aileron = {
  source:'aileron', id:'aileron-0102', title:'Aileron 1.02', page:'https://dotcolon.net/fonts/aileron/',
  creator:'Sora Sagano', license:'CC0', licenseUrl:'https://fontsource.org/fonts/aileron/about', downloadable:true,
  files:[{id:'otf-zip',url:'https://dotcolon.net/files/fonts/aileron_0102.zip',
    sha256:'a93a1327f44912a7b1410ad0056fec3e904074413b0bd9da550f6175587cf958'}],
};
const ambient = async (parameters) => (await getJson(url(APIS.ambientcg, parameters))).foundAssets || [];
function medium(item, fileType) {
  if (fileType === 'vector') return item.mime === 'image/svg+xml';
  return !fileType || item.mime?.startsWith(fileType + '/');
}
const polyType = {hdri:0, texture:1, '3d':2};
export async function search({source, query, type, limit = 12, strict = false}) {
  query = String(query || '').trim();
  if (!query || query.length > 180 || !Number.isInteger(limit) || limit < 1 || limit > 25) throw Error('Informe uma consulta de até 180 caracteres e limite de 1 a 25.');
  if (source === 'commons') {
    const known = {video:'video|office', audio:'audio', image:'bitmap|drawing', vector:'drawing'};
    const media = type && known[type] ? ' filetype:' + known[type] : '';
    const pages = await commons({generator:'search', gsrnamespace:6, gsrsearch:query + media + (strict ? ' incategory:CC-Zero' : ''), gsrlimit:limit});
    return pages.filter(item => (!known[type] || medium(item,type)) && (!strict || item.downloadable));
  }
  if (source === 'openverse') {
    const segment = type === 'audio' ? 'audio/' : 'images/';
    if (type && !['image','audio'].includes(type)) throw Error('Openverse indexa imagem e áudio.');
    const data = await getJson(url(new URL(segment, APIS.openverse),
      {q:query, license:'cc0,pdm', page_size:limit}));
    return (data.results || []).map(item => ({
      source, id:item.id, title:item.title, creator:item.creator, page:item.foreign_landing_url,
      license:item.license, licenseUrl:item.license_url, downloadable:false,
      review:'Confirme os direitos e o download na fonte original.',
    }));
  }
  if (source === 'polyhaven') {
    const data = await getJson(new URL('assets', APIS.polyhaven));
    const words = query.toLowerCase().split(/\s+/);
    return Object.entries(data).filter(([id,item]) => (polyType[type] === undefined || item.type === polyType[type]) &&
      words.every(word => [id,item.name,item.description,...(item.tags || [])].join(' ').toLowerCase().includes(word)))
      .slice(0,limit).map(([id,item]) => ({source,id,title:item.name,page:'https://polyhaven.com/a/'+id,license:'CC0',availableVia:'inspect'}));
  }
  if (source === 'ambientcg') {
    const dataType = {texture:'Material','3d':'3DModel',hdri:'HDRI'}[type];
    return (await ambient({q:query, limit,...(dataType?{type:dataType}:{})})).map(item =>
      ({source,id:item.assetId,title:item.displayName,page:'https://ambientcg.com/view?id='+item.assetId,license:'CC0',availableVia:'inspect'}));
  }
  if (source === 'met') {
    const data = await getJson(url(APIS.metSearch,{q:query,hasImages:'true',limit}));
    return (data.objectIDs || []).slice(0,limit).map(id => ({source,id:String(id),page:'https://www.metmuseum.org/art/collection/search/'+id,availableVia:'inspect'}));
  }
  if (source === 'naturalearth') return /map|terra|earth|countr|país|pais|geogra/i.test(query) ? [preset] : [];
  if (source === 'aileron') return /aileron|font|tipo|sans/i.test(query) ? [aileron] : [];
  throw Error('Fonte sem adaptador de busca. Use o catálogo e o caminho oficial.');
}
function collectFiles(node, parts = [], result = []) {
  if (!node || typeof node !== 'object') return result;
  if (typeof node.url === 'string') {
    result.push({id:parts.join('/'), url:node.url, bytes:node.size, dependencies:Object.keys(node.include || {})});
    return result;
  }
  for (const [key, value] of Object.entries(node)) collectFiles(value,[...parts,key],result);
  return result;
}
export async function inspect({source,id}) {
  if (source === 'commons') {
    const [item] = await commons({pageids:numericId(id)});
    if (!item) throw Error('Item indisponível no Commons.');
    return item;
  }
  if (source === 'naturalearth' && id === preset.id) return preset;
  if (source === 'aileron' && id === aileron.id) return aileron;
  if (source === 'polyhaven') {
    const name = assetName(id);
    const [info,files] = await Promise.all(['info/','files/'].map(prefix => getJson(new URL(prefix+name, APIS.polyhaven))));
    return {source,id,title:info.name,creator:Object.keys(info.authors || {}).join(', '),page:'https://polyhaven.com/a/'+name,
      license:'CC0',licenseUrl:CC0,downloadable:true,files:collectFiles(files)};
  }
  if (source === 'ambientcg') {
    const name = assetName(id);
    const [item] = await ambient({id:name,include:'downloadData',limit:1});
    if (!item || item.assetId.toLowerCase() !== name.toLowerCase()) throw Error('ID não encontrado no ambientCG.');
    const files = Object.values(item.downloadFolders || {}).flatMap(folder =>
      Object.values(folder.downloadFiletypeCategories || {}).flatMap(category => category.downloads || []));
    return {source,id:item.assetId,title:item.displayName,creator:'ambientCG',page:'https://ambientcg.com/view?id='+item.assetId,
      license:'CC0',licenseUrl:CC0,downloadable:true,
      files:files.map(file => ({id:file.fileName,url:file.fullDownloadPath,bytes:file.size}))};
  }
  if (source === 'met') {
    const item = await getJson(new URL('objects/'+numericId(id),APIS.met));
    const downloadable = item.isPublicDomain === true && !!item.primaryImage;
    return {source,id,title:item.title,creator:item.artistDisplayName || 'The Metropolitan Museum of Art',
      page:item.objectURL,license:downloadable?'CC0 (Met Open Access)':'Indeterminada',licenseUrl:'https://www.metmuseum.org/policies/image-resources',
      downloadable,files:downloadable?[{id:'original',url:item.primaryImage}]:[]};
  }
  throw Error('Inspeção automática indisponível. Consulte a ficha no provedor.');
}
const hosts = {
  commons:['upload.wikimedia.org'], polyhaven:['dl.polyhaven.org','cdn.polyhaven.com'],
  ambientcg:['ambientcg.com','cdn.ambientcg.com','download.ambientcg.com','acg-download.struffelproductions.com'], met:['images.metmuseum.org'],
  naturalearth:['naturalearth.s3.amazonaws.com'], aileron:['dotcolon.net'],
};
const extension = /\.(?:png|jpe?g|webp|gif|svg|tiff?|pdf|webm|mp4|mov|ogv|ogg|wav|flac|mp3|hdr|exr|zip|blend|fbx|obj|glb|gltf|bin|usd[azc]?)$/i;
function checkedAddress(value, source) {
  const address = new URL(value);
  if (address.protocol !== 'https:' || address.username || address.password || address.port || !hosts[source]?.includes(address.hostname)) {
    throw Error('Endereço fora dos domínios oficiais permitidos.');
  }
  return address;
}
async function downloadResponse(value,source) {
  let address = checkedAddress(value,source);
  for (let i=0; i<4; i++) {
    const response = await fetch(address,{headers,redirect:'manual',signal:AbortSignal.timeout(120000)});
    if ([301,302,303,307,308].includes(response.status)) {
      await response.body?.cancel();
      address = checkedAddress(new URL(response.headers.get('location'),address),source);
      continue;
    }
    if (!response.ok || !response.body || /text\/html|application\/json/i.test(response.headers.get('content-type') || '')) {
      await response.body?.cancel();
      throw Error('Arquivo oficial indisponível: HTTP '+response.status);
    }
    return response;
  }
  throw Error('Redirecionamentos demais no download.');
}
export async function download({source,id,variant,project},root = process.cwd()) {
  if (typeof project !== 'string' || !/^[\p{L}\p{N}][\p{L}\p{N}_-]{0,100}$/u.test(project)) throw Error('Use o nome da pasta existente dentro de projects/.');
  const workspace = await realpath(root);
  const projectPath = path.join(workspace,'projects',project);
  if (await realpath(projectPath) !== projectPath) throw Error('A pasta do projeto não pode ser um link simbólico.');
  const output = path.join(projectPath,'curadoria');
  await mkdir(output,{recursive:true});
  if (await realpath(output) !== output) throw Error('A pasta de saída não pode ser um link simbólico.');
  const item = await inspect({source,id});
  if (!item.downloadable) throw Error('Direitos insuficientes para baixar automaticamente. Consulte a página do item.');
  const file = item.files.find(candidate => candidate.id === variant) || (!variant && item.files.length === 1 ? item.files[0] : null);
  if (!file) throw Error('Escolha a variante exata retornada por inspect.');
  if (file.dependencies?.length) throw Error('Variante com dependências. Baixe o conjunto no botão oficial da página.');
  if (file.bytes > LIMIT) throw Error('Arquivo maior que 128 MiB. Escolha uma variante menor ou use o download oficial.');
  const address = checkedAddress(file.url,source);
  const filename = path.basename(address.searchParams.get('file') || decodeURIComponent(address.pathname))
    .replace(/[^\p{L}\p{N}._-]/gu,'_').slice(-150);
  if (!extension.test(filename)) throw Error('Extensão fora dos formatos previstos.');
  const folder = await mkdtemp(path.join(output, source+'-'));
  try {
    const response = await downloadResponse(address,source);
    const digest = createHash('sha256');
    let bytes = 0;
    await pipeline(response.body, new Transform({transform(chunk,enc,callback) {
      bytes += chunk.length;
      if (bytes>LIMIT) return callback(Error('Arquivo excede 128 MiB.'));
      digest.update(chunk);
      callback(null,chunk);
    }}),createWriteStream(path.join(folder,filename),{flags:'wx'}));
    if (!bytes || (file.bytes && file.bytes !== bytes)) throw Error('Tamanho do arquivo diverge da ficha.');
    const sha256 = digest.digest('hex');
    if (file.sha256 && file.sha256 !== sha256) throw Error('SHA-256 diverge do original fixado.');
    const {files,...rights} = item;
    const receipt = {...rights, variant:file.id, originalUrl:file.url, file:filename, bytes,
      sha256, checkedAt:new Date().toISOString(), review:'Conferir imagem, pessoas, marcas, contexto e direitos de terceiros antes da edição.'};
    await writeFile(path.join(folder,'proveniencia.json'), JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
    return {...receipt, path:path.relative(workspace,path.join(folder,filename))};
  } catch(error) {
    await rm(folder,{recursive:true,force:true});
    throw error;
  }
}
