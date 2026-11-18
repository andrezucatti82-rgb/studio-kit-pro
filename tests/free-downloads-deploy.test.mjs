import test from 'node:test';
import assert from 'node:assert/strict';
import {downloadTargets} from '../scripts/deploy-downloads-cpanel.mjs';
test('download deployment can only modify installer, receipt and tutorial in the active release',()=>{
 assert.deepEqual(downloadTargets('<html><head><base href="/atlas-20261118200000/"></head></html>'),['atlas-20261118200000/downloads/studio-kit-pro-installer.zip','atlas-20261118200000/installation.json','atlas-20261118200000/como-instalar.html']);
 const paths=downloadTargets('<html><script src="atlas-20261118200000/app.js"></script></html>');assert(paths.every(p=>!p.endsWith('/index.html')&&!p.endsWith('.js')&&!p.endsWith('.css')));
 for(const html of ['<base href="/../">','<html>missing release</html>','<base href="/atlas-20261118200000/"><script src="atlas-20261118210000/app.js"></script>'])assert.throws(()=>downloadTargets(html));
});

test('failed metadata upload restores previously published ZIP and tutorial',async()=>{
 const {publishDownloads}=await import('../scripts/deploy-downloads-cpanel.mjs');const paths=['zip','metadata','tutorial'],old=paths.map(p=>Buffer.from('old-'+p)),next=paths.map(p=>Buffer.from('new-'+p)),files=new Map(paths.map((p,i)=>[p,old[i]]));let failed=false;
 await assert.rejects(publishDownloads(paths,next,old,{backup:async()=>{},read:async p=>files.get(p),put:async(p,b)=>{if(p==='metadata'&&!failed){failed=true;throw Error('network failure');}files.set(p,b);}}),/previous downloads restored/);
 for(let i=0;i<paths.length;i++)assert.deepEqual(files.get(paths[i]),old[i]);
});
