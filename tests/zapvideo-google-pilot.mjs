// One paid image proof per Brazilian calendar day when explicitly invoked.
import {existsSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import {generateMedia,models} from '../zapvideo/media-assets.mjs';
import {verifyMediaAsset} from '../zapvideo/renderer.mjs';

const credential='.dev.vars.local';
if (!process.env.GEMINI_API_KEY && existsSync(credential)) process.loadEnvFile(credential);
if (process.argv[2]!=='--run' || !process.env.GEMINI_API_KEY) {
  console.log(JSON.stringify({state:'blocked',reason:'Credencial do ZapVideo ou opção --run ausente.',generated:0}));
  process.exitCode=1;
} else {
  const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'})
    .format(new Date());
  const directory='.cache/zapvideo/google-pilot/'+day;
  await mkdir(directory,{recursive:true});
  const receipt=directory+'/receipt.json';
  const base={day,model:models.frame,currency:'USD',reservedMicros:100_000,kind:'frame'};
  try {
    await writeFile(receipt,JSON.stringify({...base,state:'reserved'},null,2),{flag:'wx',mode:0o600});
  } catch(error) {
    if (error.code!=='EEXIST') throw error;
    console.log(JSON.stringify({state:'blocked',reason:'Uma tentativa já foi reservada hoje. Confira seu recibo.',generated:0}));
    process.exit(1);
  }
  const snapshot=async value=>{
    await writeFile(receipt,JSON.stringify({...base,...value},null,2),{mode:0o600});
    console.log(JSON.stringify({receipt,...value},null,2));
  };
  let outcome;
  try {
    outcome=await generateMedia({model:models.frame,scope:{kind:'frame',aspect:'9:16',
      input:'Estudo visual abstrato para teste técnico. Três cartões geométricos verdes sobre fundo escuro, sem texto, sem pessoas, composição vertical.'}},
      process.env.GEMINI_API_KEY);
  } catch {
    await snapshot({state:'uncertain'});
    process.exit(1);
  }
  if (outcome.rejected || outcome.error) {
    await snapshot({state:'rejected',providerId:outcome.id ?? null,error:outcome.error || 'Pedido recusado pelo Google.'});
    process.exit(1);
  }
  await snapshot({state:'received',providerId:outcome.id});
  const original=directory+'/received.jpg';
  await writeFile(original,outcome.bytes,{flag:'wx',mode:0o600});
  try {
    const report=await verifyMediaAsset({kind:'frame',aspect:'9:16'},original,directory+'/verified');
    await snapshot({state:'verified',providerId:outcome.id,report});
  } catch {
    await snapshot({state:'received_but_unverified',providerId:outcome.id});
    process.exitCode=1;
  }
}
