export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const reject = (status, message) => { throw new HttpError(status,message); };
export const json = (value, status = 200) => Response.json(value, {status, headers:{'Cache-Control':'no-store'}});
export const hex = bytes => Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2,'0')).join('');
export const randomHex = length => hex(crypto.getRandomValues(new Uint8Array(length)));
export const digest = async text => hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)));
export const sql = (env, query, ...params) => env.DB.prepare(query).bind(...params);
export const now = () => Math.floor(Date.now()/1000);
export const hours = count => count * 3600;
export const isHash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
export const isExpired = row => row.expires_at <= now();
export const uuid = () => crypto.randomUUID();
export function googleDailyBudget(env) {
  const value=env.GEMINI_TEST_DAILY_BUDGET_MICROS;
  if (env.ENVIRONMENT!=='staging' || typeof value!=='string' || !/^[0-9]{1,7}$/.test(value)) return 0;
  return Math.min(Number(value),5_000_000);
}

export async function boundedBytes(response,max,message) {
  if (!response.body || Number(response.headers.get('Content-Length'))>max) {
    await response.body?.cancel();
    throw new Error(message);
  }
  const chunks=[];
  let length=0;
  for await (const chunk of response.body) {
    length+=chunk.length;
    if (length>max) throw new Error(message);
    chunks.push(chunk);
  }
  return new Uint8Array(await new Blob(chunks).arrayBuffer());
}

export async function readJson(request, max = 128 * 1024) {
  if (!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type') || '') || !request.body) {
    reject(415,'Envie um JSON.');
  }
  let bytes = 0;
  const chunks = [];
  for await (const chunk of request.body) {
    bytes += chunk.length;
    if (bytes > max) reject(413,'O pedido excede o limite.');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(await new Blob(chunks).text());
  } catch { reject(400,'JSON inválido.'); }
}

export async function person(request, env) {
  // A separate header allows browser HTTP Basic protection for staging.
  const token = request.headers.get('ZapVideo-Token') || '';
  if (!isHash(token)) reject(401,'Informe seu código de acesso ao piloto.');
  const row = await sql(env,'SELECT id FROM people WHERE token_hash=? AND revoked_at IS NULL AND expires_at>?',await digest(token),now()).first();
  if (!row) reject(401,'Código inválido ou expirado.');
  return row.id;
}

export function exactBody(request, size) {
  if (Number(request.headers.get('Content-Length')) !== size || !request.body) reject(400,'O tamanho enviado diverge do esperado.');
  const stream = new FixedLengthStream(size);
  const forwarded = request.body.pipeTo(stream.writable);
  // The storage consumer receives the failure through the readable end.
  forwarded.catch(() => {});
  return stream.readable;
}

export async function objectResponse(request, bucket, key, {name, metadata, download = false} = {}) {
  const info = await bucket.head(key);
  if (!info) reject(404,'Arquivo indisponível.');
  const headers = new Headers({'Content-Type':info.httpMetadata?.contentType || 'application/octet-stream',
    'Content-Length':String(info.size),'Accept-Ranges':'bytes','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
  if (metadata) for (const [key, value] of Object.entries(metadata)) headers.set(key,value);
  if (name && download) headers.set('Content-Disposition',`attachment; filename="${name}"`);
  const range = request.headers.get('Range');
  if (request.method === 'HEAD') return new Response(null,{headers});
  if (!range) {
    const object = await bucket.get(key,{onlyIf:{etagMatches:info.etag}});
    if (!object?.body) reject(404,'Arquivo indisponível.');
    return new Response(object.body,{headers});
  }
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  let start = -1, end = info.size - 1;
  if (match?.[1]) {
    start = Number(match[1]);
    if (match[2]) end = Math.min(end,Number(match[2]));
  } else if (match?.[2] && Number(match[2]) > 0) {
    start = Math.max(0,info.size - Number(match[2]));
  }
  if (!Number.isSafeInteger(start) || start < 0 || start > end) {
    headers.set('Content-Range',`bytes */${info.size}`);
    headers.delete('Content-Length');
    return new Response(null,{status:416,headers});
  }
  const length = end-start+1;
  const object = await bucket.get(key,{range:{offset:start,length},onlyIf:{etagMatches:info.etag}});
  if (!object?.body) reject(404,'Arquivo indisponível.');
  headers.set('Content-Range',`bytes ${start}-${end}/${info.size}`);
  headers.set('Content-Length',String(length));
  return new Response(object.body,{status:206,headers});
}
