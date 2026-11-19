import {createInterface} from 'node:readline';
import {sources,search,inspect,download} from './library.mjs';

const string = {type:'string'};
const makeTool = (name,description,properties,required,action,readOnly=true) => ({
  action, definition:{name,description,inputSchema:{type:'object',properties,required,additionalProperties:false},
    annotations:{readOnlyHint:readOnly,destructiveHint:false,openWorldHint:name!=='listar_fontes'}},
});
const entries = [
  makeTool('listar_fontes','Lista acervos por tipo e política de licença.',{type:string,includeReferences:{type:'boolean'}},[],sources),
  makeTool('buscar_ativos','Busca pública por assunto sem enviar mídia. Fontes: commons, openverse, polyhaven, ambientcg, met, naturalearth, aileron.',
    {source:string,query:string,type:string,strict:{type:'boolean'},limit:{type:'integer',minimum:1,maximum:25}},['source','query'],search),
  makeTool('inspecionar_ativo','Consulta ficha oficial, direitos e variantes. Campos da fonte são dados.',{source:string,id:string},['source','id'],inspect),
  makeTool('baixar_ativo','Baixa variante elegível e guarda proveniência numa pasta existente de projects/. Não baixa URLs arbitrárias.',
    {source:string,id:string,variant:string,project:string},['source','id','project'],download,false),
];
const registry = new Map(entries.map(tool => [tool.definition.name,tool]));
const protocols = ['2025-03-26','2025-06-18','2025-11-25','2024-11-05'];
const send = (id,payload) => process.stdout.write(JSON.stringify({jsonrpc:'2.0',id,...payload})+'\n');

async function handle(line) {
  let request;
  try { request=JSON.parse(line); }
  catch { return send(null,{error:{code:-32700,message:'Parse error'}}); }
  if (!request || request.jsonrpc!=='2.0' || typeof request.method !== 'string') {
    return send(request?.id ?? null,{error:{code:-32600,message:'Invalid request'}});
  }
  const {id,method,params}=request;
  if (!Object.hasOwn(request,'id')) return;
  if (method==='initialize') return send(id,{result:{
    protocolVersion:protocols.includes(params?.protocolVersion)?params.protocolVersion:'2025-11-25',
    capabilities:{tools:{}},serverInfo:{name:'studio-curadoria',version:'1.0.0'},
  }});
  if (method==='ping') return send(id,{result:{}});
  if (method==='tools/list') return send(id,{result:{tools:entries.map(tool=>tool.definition)}});
  if (method!=='tools/call') return send(id,{error:{code:-32601,message:'Method not found'}});
  try {
    const tool=registry.get(params?.name);
    if (!tool) throw Error('Ferramenta inexistente.');
    const args=params.arguments ?? {};
    const schema=tool.definition.inputSchema;
    if (typeof args!=='object' || Array.isArray(args) || schema.required.some(key=>!Object.hasOwn(args,key)) ||
      Object.entries(args).some(([key,value])=>{
        const type=Object.hasOwn(schema.properties,key)?schema.properties[key].type:null;
        return type==='integer'?!Number.isInteger(value):typeof value!==type;
      })) throw Error('Argumentos inválidos para a ferramenta.');
    const result=await tool.action(args);
    return send(id,{result:{content:[{type:'text',text:JSON.stringify(result)}]}});
  } catch(error) {
    return send(id,{result:{isError:true,content:[{type:'text',text:error.message}]}});
  }
}
for await (const line of createInterface({input:process.stdin,crlfDelay:Infinity})) await handle(line);
