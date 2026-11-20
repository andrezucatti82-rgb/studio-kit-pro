import {now,productionPilotOpen} from './http.mjs';

const googleOrigin='https://generativelanguage.googleapis.com';
const fileRequest=/^\/v1beta\/files\/[a-z0-9-]{1,80}(?::download)?$/;

export function hasGeminiProvider(env) {
  return env.ENVIRONMENT==='production' ? productionPilotOpen(env) && Boolean(env.GEMINI_PROVIDER) :
    Boolean(env.GEMINI_API_KEY);
}

export function geminiFetch(env) {
  if (env.ENVIRONMENT!=='production') return fetch;
  return (input,init)=>{
    const url=new URL(input);
    if (url.origin!==googleOrigin) return fetch(url,init);
    if (!hasGeminiProvider(env)) return new Response(null,{status:503});
    const headers=new Headers(init?.headers);
    headers.delete('x-goog-api-key');
    return env.GEMINI_PROVIDER.fetch(new Request(url,{...init,headers,redirect:'manual'}));
  };
}

export function forwardGemini(request,env,upstream=fetch) {
  const expiry=env.GEMINI_BRIDGE_EXPIRES_AT;
  if (env.ENVIRONMENT!=='staging' || !/^[0-9]{10}$/.test(expiry ?? '') || Number(expiry)<=now() || !env.GEMINI_API_KEY) {
    return new Response(null,{status:503});
  }
  const url=new URL(request.url);
  const interaction=request.method==='POST' && url.pathname==='/v1beta/interactions' && !url.search &&
    request.headers.get('Content-Type')==='application/json' && request.body;
  const asset=request.method==='GET' && fileRequest.test(url.pathname) &&
    (url.pathname.endsWith(':download') ? url.search==='?alt=media' : !url.search);
  if (url.origin!==googleOrigin || url.username || url.password || url.hash || (!interaction && !asset)) {
    return new Response(null,{status:404});
  }
  const headers={'x-goog-api-key':env.GEMINI_API_KEY,'Api-Revision':'2026-05-20'};
  if (interaction) headers['Content-Type']='application/json';
  return upstream(url.href,{method:request.method,headers,body:interaction?request.body:undefined,
    redirect:'manual',signal:AbortSignal.timeout(180_000)});
}
