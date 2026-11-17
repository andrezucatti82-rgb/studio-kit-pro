import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import '../style-atlas/dist/search.js';
const overrides=JSON.parse(await fs.readFile(new URL('../style-atlas/records/search/overrides.json',import.meta.url)));
const S=globalThis.AtlasSearch,c=JSON.parse(await fs.readFile(new URL('../style-atlas/dist/catalog.json',import.meta.url))),index=S.createIndex(c.styles,c.search),ids=q=>index.search(q).map(r=>r.style.id);
test('all styles have reproducible, nonempty hidden tags without changing visual styles',()=>{
 assert.equal(c.search.version,1);assert.equal(Object.keys(c.search.styleTags).length,c.styles.length);assert.equal(c.search.sourceSha256,createHash('sha256').update(JSON.stringify(c.styles.map(S.fields))).digest('hex'));
 for(const s of c.styles){assert.deepEqual(c.search.styleTags[s.id],S.tagsFor(s,overrides[s.id]?.tags||[]));assert(c.search.styleTags[s.id].length>=3,s.id);assert.equal(new Set(c.search.styleTags[s.id]).size,c.search.styleTags[s.id].length);}
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
