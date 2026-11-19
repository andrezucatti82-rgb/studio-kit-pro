import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import '../style-atlas/dist/search.js';
const overrides=JSON.parse(await fs.readFile(new URL('../style-atlas/records/search/overrides.json',import.meta.url)));
const S=globalThis.AtlasSearch,c=JSON.parse(await fs.readFile(new URL('../style-atlas/dist/catalog.json',import.meta.url))),index=S.createIndex(c.styles,c.search),ids=q=>index.search(q).map(r=>r.style.id);
test('all styles have reproducible, nonempty hidden tags without changing visual styles',()=>{
 assert.equal(createHash('sha256').update(JSON.stringify(c.styles)).digest('hex'),'73d73dbbd704365ed51877578f93f06a1f959a1984367a887c309e15d7cc6fe0','search enrichment must preserve all published style contracts');assert.equal(c.search.version,1);assert.equal(Object.keys(c.search.styleTags).length,c.styles.length);assert.equal(c.search.sourceSha256,createHash('sha256').update(JSON.stringify(c.styles.map(S.fields))).digest('hex'));
 for(const s of c.styles){assert.deepEqual(c.search.styleTags[s.id],S.tagsFor(s,overrides[s.id]?.tags||[],c.search.styleColors?.[s.id]||[]));assert(c.search.styleTags[s.id].length>=3,s.id);assert.equal(new Set(c.search.styleTags[s.id]).size,c.search.styleTags[s.id].length);}
});
test('dog synonyms find actual dog descriptions across the complete catalogue, never a substring in education',()=>{
 const expected=c.styles.filter(s=>overrides[s.id]?.tags.includes('cachorro')||S.fields(s).some(v=>/\b(cachorro|cachorros|cão|cães|canino|dog)\b/i.test(v))).map(s=>s.id).sort();assert(expected.includes('pet-em-uso-cotidiano'));assert(expected.includes('ads26-pets-a-compra-acompanha-o-porte'));
 for(const q of ['cachorro','cachorros','cão','cao','CÃES','dog'])assert.deepEqual(ids(q).sort(),expected,q);
 assert(ids('cachorro').includes('ads26-pets-a-agua-encontra-o-desenho-do-produto'));assert(!ids('cachorro').includes('ads26-pets-a-cama-encontra-o-lugar-do-gato'));assert(!ids('cachorro').includes('ads26-pets-a-compra-certa-para-o-aquario'));assert(!ids('cachorro').includes('bauhaus'));assert(ids('pets').length>ids('cachorro').length);assert(ids('pets').includes('ads26-turismo-o-pet-tambem-tem-condicoes-de-hospedagem'));
});
test('accent and explicit plural aliases preserve results for hands, graphics and properties',()=>{
 for(const group of [['mão','mãos','mao','maos'],['gráfico','gráficos','grafico'],['imóvel','imóveis','imovel']])for(const q of group)assert.deepEqual(ids(q).sort(),ids(group[0]).sort(),q);
 assert(ids('mãos').length>10);assert(ids('gráficos').length>10);assert(ids('imóveis').length>10);
});
test('multiple search concepts can occur in different fields and exact titles rank first',()=>{
 const styles=[{id:'a',name:'Outro',signature:'Um cão em uma sala.',resources:['Vidro'],kind:'Anúncio'},{id:'b',name:'Vidro',signature:'Objeto azul'},{id:'c',name:'Cachorro em vidro',motion:'Demonstração'}],idx=S.createIndex(styles);
 assert.deepEqual(idx.search('cachorro vidro').map(r=>r.style.id),['c','a']);assert.deepEqual(idx.search('vídeo de cachorro vidro').map(r=>r.style.id),['c','a']);assert.equal(idx.search('vidro')[0].style.id,'b');assert.equal(idx.search('sala cachorro')[0].style.id,'a');
});
test('technical and subject tags remain specific, and declared presenter avatar support is searchable',()=>{
 assert(ids('planta baixa').includes('explicador-diagrama-ao-lado'));assert(ids('avatar diagrama').some(id=>id.startsWith('explicador-')));assert(ids('CRM').includes('pipeline-comercial-em-acao'));
 const compound=S.createIndex([{id:'bath',name:'Rotina',signature:'Banho e tosa'}]);for(const q of ['banho','tosa','banho e tosa'])assert.equal(compound.search(q).length,1,q);
 const idx=S.createIndex([{id:'one',name:'Produto azul',motion:'A câmera mostra o produto. Sem neon ou 3D. Zoom em foto não substitui ação.',resources:['Letreiros, legendas sincronizadas, diagramas e CTA recompostos em código editável'],requirements:'Não criar cachorro nem gráfico.'}]);
 for(const q of ['neon','3D','zoom','cachorro','gráfico','diagrama'])assert.equal(idx.search(q).length,0,q);
});
test('prefix matching, empty searches and hostile inputs do not turn into regex or HTML',()=>{
 assert(ids('cachorr').includes('pet-em-uso-cotidiano'));assert.equal(ids('').length,c.styles.length);assert.equal(ids('zzqxnqzz').length,0);assert.equal(ids('<script>alert(1)</script>').length,0);assert.equal(ids('[').length,c.styles.length);
});

test('commercial presenter subjects support common singulars, plurals and business names',()=>{
 for(const group of [['flor','flores','floricultura'],['confeitaria','confeitarias'],['moto','motos','motocicleta'],['livro','livros'],['papelaria','papelarias'],['bar','bares','pubs']]){
  const expected=ids(group[0]).sort();assert(expected.some(id=>id.startsWith('explicador-')),group[0]);
  for(const q of group)assert.deepEqual(ids(q).sort(),expected,q);
 }
 assert(ids('flores').includes('explicador-floriculturas-um-arranjo-nasce-do-gesto'));
 assert(ids('motocicleta').includes('explicador-revendas-veiculos-o-detalhe-que-muda-o-uso'));
 assert(ids('pubs').includes('explicador-bares-a-noite-tem-programacao'));
});

test('implant education and the current housing programme are discoverable by aliases',()=>{
 for(const q of ['implante','implantes','implantes dentários'])assert.deepEqual(ids(q).sort(),ids('implante').sort());
 assert(ids('implantes').includes('explicador-dentistas-implante-pilar-e-coroa-em-conversa'));
 assert.deepEqual(ids('MCMV').sort(),ids('minha casa minha vida').sort());assert(ids('MCMV').length>=5);
});

test('business specialisms find their new authored directions by the terms customers use',()=>{
 for(const q of ['gestor de tráfego','tráfego pago','mídia paga'])assert.deepEqual(ids(q).sort(),ids('tráfego pago').sort());
 for(const [q,id]of [['performance','explicador-agencias-do-anuncio-ao-caixa-com-evidencias'],['gestor de tráfego','explicador-trafego-pago-o-clique-tem-um-caminho'],['e-commerce','explicador-ecommerce-a-margem-se-abre-por-pedido'],['IA negócios','explicador-ia-negocios-a-resposta-mostra-de-onde-veio']])assert(ids(q).includes(id),q);
});

test('similar styles are deterministic, distinct and retain the source niche without editing catalogue',()=>{
 const source=c.styles.find(s=>s.presenterEditing?.sector==='Dentistas')||c.styles.find(s=>/implante/.test(s.id)),before=JSON.stringify(c);
 const result=S.similar(c.styles,source);assert.equal(result.length,24);assert.ok(!result.some(s=>s.id===source.id));assert.equal(new Set(result.map(s=>s.id)).size,24);assert.deepEqual(result.map(s=>s.id),S.similar(c.styles,source).map(s=>s.id));assert.equal(result[0].family,source.family);assert.equal(JSON.stringify(c),before);assert.deepEqual(S.similar(c.styles,null),[]);
});

test('reference colors cover every style and are discovery metadata with source evidence',async()=>{
 const colors=JSON.parse(await fs.readFile(new URL('../style-atlas/records/search/colors.json',import.meta.url)));
 assert.equal(colors.imageFilesModified,false);assert.equal(Object.keys(c.search.styleColors).length,1425);
 assert.equal(c.search.referenceColorsSha256,createHash('sha256').update(JSON.stringify(colors.styles)).digest('hex'));
 for(const s of c.styles){const record=colors.styles[s.id];assert.equal(record.source,s.sequence.frames[s.sequence.heroIndex??1].src);assert.match(record.sourceSha256,/^[a-f0-9]{64}$/);assert(record.colors.length>0);for(const color of c.search.styleColors[s.id])assert(c.search.styleTags[s.id].includes(color),s.id+': '+color);}
});

test('business uses, products, channels and palette combinations remain useful across families',()=>{
 assert(ids('vender capacho').includes('ads26-casa-o-capacho-vira-ponto-de-encontro'));
 assert(ids('floricultura reels').includes('explicador-floriculturas-um-arranjo-nasce-do-gesto'));
 assert(ids('dentista azul').length>0);assert(ids('perfume').length>0);assert(ids('azul').length>100);
 const generated=S.createIndex([{id:'coffee',name:'Café artesanal',resources:['vídeo IA'],uses:'Vender um café'},{id:'business',name:'IA para negócios',uses:'Explicar inteligência artificial'}]);
 assert.deepEqual(generated.search('IA').map(r=>r.style.id),['business']);
 const palette={id:'blue',name:'Modelo neutro',presenterEditing:{finishProfile:{palette:['#0033ff','#ffffff']}}};assert(S.tagsFor(palette).includes('azul'));assert(S.tagsFor(palette).includes('branco'));
 assert(S.tagsFor({name:'Editorial',signature:'Tipografia sem serifa.'}).includes('sem serifa'));
});

test('autocomplete offers only nonempty searches, supports multiple terms and bounded typo corrections',()=>{
 const suggestions=index.suggest('cachorr');assert(suggestions.some(s=>s.query==='cachorro'));assert(suggestions.length<=6);
 for(const item of suggestions)assert(index.search(item.query).length>0,item.query);
 assert(index.suggest('dentista az').some(s=>s.query==='dentista azul'));
 assert(index.suggest('cachoro').some(s=>s.query==='cachorro'&&s.correction));
 assert.deepEqual(index.suggest('zzqxnqzz'),[]);assert.deepEqual(index.suggest(''),[]);assert.deepEqual(index.suggest('c'),[]);
 assert.deepEqual(index.suggest('dent',{filter:()=>false}),[]);
 for(const item of index.suggest('cachorr',{filter:s=>s.family==='ads-pets'}))assert(index.search(item.query).some(r=>r.style.family==='ads-pets'));
 assert(!index.suggest('dent').some(s=>s.label==='Imagem dentro da tipografia'));
 const first=index.suggest('implan');assert.deepEqual(first,index.suggest('implan'));assert.equal(new Set(first.map(s=>S.normalize(s.query))).size,first.length);
 assert.deepEqual(index.suggest('<script>alert(1)</script>'),[]);
 const brief=index.suggest('br');assert.equal(new Set(brief.map(s=>S.normalize(s.query))).size,brief.length,'keyword-only predictions must not duplicate the last rows');
});
