import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {commonsRights,sources,search,download} from '../tools/curadoria/library.mjs';

test('curation separates discovery links and opt-in reference-only sources',()=>{
  const strict=sources();
  const all=sources({includeReferences:true});
  assert(all.length>=50);
  assert.equal(new Set(all.map(source=>source.id)).size,all.length);
  assert(all.some(source=>source.id==='youtube-nasa'));
  assert(!strict.some(source=>source.id==='youtube-nasa'));
  assert(sources({type:'video'}).every(source=>source.types.includes('video')));
});
test('Commons cannot authorize a download based on ambiguous licenses or restrictions',()=>{
  const meta=(license,extra={})=>({LicenseUrl:{value:license}, ...extra});
  const zero='https://creativecommons.org/publicdomain/zero/1.0/';
  assert.equal(commonsRights(meta(zero)).downloadable,true);
  assert.equal(commonsRights(meta(zero+'deed.en',{Copyrighted:{value:'True'}})).downloadable,true);
  for (const license of ['','https://creativecommons.org/publicdomain/mark/1.0/','https://creativecommons.org/licenses/by/4.0','https://creativecommons.org.example.org/publicdomain/zero/1.0/']) {
    assert.equal(commonsRights(meta(license)).downloadable,false);
  }
  assert.equal(commonsRights(meta(zero,{Restrictions:{value:'personality rights'}})).downloadable,false);
  assert.equal(commonsRights(meta(zero,{AttributionRequired:{value:'True'}})).downloadable,false);
});
test('offline routes block path traversal and unknown download sources',async()=>{
  await assert.rejects(download({source:'commons',id:'1',project:'../somewhere'}),/projects/);
  await assert.rejects(search({source:'arbitrary',query:'example'}),/sem adaptador/);
  assert.equal((await search({source:'naturalearth',query:'mapa'}))[0].id,'countries-110m');
});
test('project MCP negotiates a protocol and exposes four executable tools on stdio',()=>{
  const lines=[
    {jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-06-18'}},
    {jsonrpc:'2.0',method:'notifications/initialized'},
    {jsonrpc:'2.0',id:2,method:'tools/list'},
    {jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'listar_fontes',arguments:{type:'font',includeReferences:true}}},
    {jsonrpc:'2.0',id:4,method:'tools/call',params:{name:'baixar_ativo',arguments:{source:'commons',id:'1',project:'../client'}}},
  ];
  const input=lines.map(line=>JSON.stringify(line)).join('\n')+'\n';
  const raw=execFileSync(process.execPath,['tools/curadoria/mcp.mjs'],{input,encoding:'utf8'});
  const [init,list,found,blocked]=raw.trim().split('\n').map(line=>JSON.parse(line));
  assert.equal(init.result.protocolVersion,'2025-06-18');
  assert.equal(list.result.tools.length,4);
  assert(JSON.parse(found.result.content[0].text).length>=3);
  assert.equal(blocked.result.isError,true);
});
