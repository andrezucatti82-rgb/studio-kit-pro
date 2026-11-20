import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {setTimeout as wait} from 'node:timers/promises';

const endpoint = 'http://127.0.0.1:4002/jobs/' + randomUUID();
const source = await readFile(process.argv[2]);
const captions = Buffer.from('1\n00:00:00,250 --> 00:00:02,000\nEdição com acentuação.\n');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const startTime = performance.now();

const request = (route, options) => fetch(endpoint + route, {...options,signal:AbortSignal.timeout(8_000)});
async function expect(route, status, options) {
  let response;
  try { response=await request(route,options); }
  catch (error) { throw new Error((options?.method ?? 'GET')+' '+(route || '/')+' failed.', {cause:error}); }
  if (response.status !== status) {
    assert.equal(response.status,status,await response.text());
  }
  return response;
}

for (let attempt = 0; ; attempt++) {
  try {
    await expect('',200,{method:'DELETE'});
    break;
  } catch (error) {
    if (attempt >= 19) throw error;
    await wait(500);
  }
}

try {
  for (const [id,body] of Object.entries({source,srt:captions})) {
    await expect('/inputs/'+id,200,{method:'PUT',body,
      headers:{'Content-Length':String(body.length),'ZapVideo-Sha256':sha256(body)}});
  }
  const project = {
    format:'zapvideo-project',version:1,id:randomUUID(),revision:1,intent:{mode:'edit',subject:''},scenes:[],
    materials:[
      {id:'source',kind:'source',name:'câmera.mp4',bytes:source.length,permission:'process'},
      {id:'srt',kind:'subtitle',name:'legendas.srt',bytes:captions.length,permission:'process'}
    ],
    actions:{captions:'mp4+srt',cuts:[{start:0.1,end:2,x:0,y:0.5},{start:2,end:4,x:0.5,y:0.5},{start:4,end:5.9,x:1,y:0.5}],
      treatment:{brightness:0.02,contrast:1.03,saturation:1.1,balance:true,denoise:true}},
  };
  await expect('/render',202,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(project)});
  let result;
  for (let attempt=0; attempt<120; attempt++) {
    result=await (await expect('',200)).json();
    if (result.state !== 'working') break;
    await wait(1_000);
  }
  assert.equal(result.state,'verified',JSON.stringify(result));
  const outputs=result.report.outputs;
  assert.deepEqual(outputs.map(file=>file.id),['video','corte-1','corte-2','corte-3','legendas']);
  for (const output of outputs) {
    const file=await expect('/outputs/'+output.id,200);
    const bytes=Buffer.from(await file.arrayBuffer());
    assert.equal(sha256(bytes),output.sha256);
    if (output.id.startsWith('corte-')) {
      assert.equal(output.width,720);
      assert.equal(output.height,1280);
      assert.equal(output.audio,true);
    }
  }
  console.log(JSON.stringify({state:result.state,elapsedMs:Math.round(performance.now()-startTime),
    outputs:outputs.map(({id,width,height,duration,bytes})=>({id,width,height,duration,bytes}))}));
} finally {
  await expect('',200,{method:'DELETE'});
}
