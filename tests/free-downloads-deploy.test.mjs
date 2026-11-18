import test from 'node:test';
import assert from 'node:assert/strict';
import {downloadTargets} from '../scripts/deploy-downloads-cpanel.mjs';
test('download deployment can only modify installer, receipt and tutorial in the active release',()=>{
 assert.deepEqual(downloadTargets('<html><head><base href="/atlas-20261118200000/"></head></html>'),['atlas-20261118200000/downloads/studio-kit-pro-installer.zip','atlas-20261118200000/installation.json','atlas-20261118200000/como-instalar.html']);
 const paths=downloadTargets('<html><script src="atlas-20261118200000/app.js"></script></html>');assert(paths.every(p=>!p.endsWith('/index.html')&&!p.endsWith('.js')&&!p.endsWith('.css')));
 for(const html of ['<base href="/../">','<html>missing release</html>','<base href="/atlas-20261118200000/"><script src="atlas-20261118210000/app.js"></script>'])assert.throws(()=>downloadTargets(html));
});
