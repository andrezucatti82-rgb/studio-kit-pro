export async function encryptHandoff(project, attachments, limit) {
  const items = [{id:'project',file:new Blob([JSON.stringify(project)]),name:'projeto-video.json'},
    ...attachments.map(({id,file}) => ({id,file,name:file.name.slice(0,200)}))];
  const header = new TextEncoder().encode(JSON.stringify({version:1,
    files:items.map(({id,file,name}) => ({id,name,size:file.size}))}));
  if (items.some(item => !item.file.size)) throw new Error('Remova os arquivos vazios.');
  const prefix = new Uint8Array(4);
  new DataView(prefix.buffer).setUint32(0,header.byteLength);
  const message = new Blob([prefix,header,...items.map(item => item.file)]);
  if (header.byteLength > 32768 || message.size+28 > limit) {
    throw new Error(`O envio temporário aceita até ${limit/1024**2} MiB. Baixe a ficha e compartilhe os originais separadamente.`);
  }
  const key = crypto.getRandomValues(new Uint8Array(32)), iv = crypto.getRandomValues(new Uint8Array(12));
  const aes = await crypto.subtle.importKey('raw',key,'AES-GCM',false,['encrypt']);
  const ciphertext = await crypto.subtle.encrypt({name:'AES-GCM',iv},aes,await message.arrayBuffer());
  return {body:new Blob([iv,ciphertext]),key:Array.from(key,byte => byte.toString(16).padStart(2,'0')).join('')};
}
