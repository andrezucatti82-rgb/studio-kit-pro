import {existsSync} from 'node:fs';
import {models} from './media-assets.mjs';
import {omniModel} from './clips.mjs';

const file=process.argv[2] || '.dev.vars.local';
if (!process.env.GEMINI_API_KEY && existsSync(file)) process.loadEnvFile(file);
const key=process.env.GEMINI_API_KEY;
if (!key) {
  console.log(JSON.stringify({state:'missing_credential',expected:'GEMINI_API_KEY em .dev.vars.local'}));
  process.exitCode=1;
} else {
  const host='https://generativelanguage.googleapis.com';
  const checked=[];
  for (const model of [models.frame,models.speech,models.music,omniModel]) {
    try {
      const response=await fetch(host+'/v1beta/models/'+model,{
        headers:{'x-goog-api-key':key},redirect:'error',signal:AbortSignal.timeout(15_000),
      });
      await response.body?.cancel();
      checked.push({model,status:response.status});
    } catch {checked.push({model,status:'connection_failed'});}
  }
  console.log(JSON.stringify({state:'read_only',checked,generated:0},null,2));
  if (checked.every(item=>item.status!==200)) process.exitCode=1;
}
