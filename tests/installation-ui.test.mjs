import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';

test('embedded installer metadata uses its published download origin without cross-origin fetch',async()=>{
 const {document}=parseHTML('<a id="downloadStudioKit"></a><p id="installationStatus"></p><a id="installationTutorial"></a>');
 Object.defineProperty(document,'baseURI',{value:'https://embedded.example/'});
 const manifest={version:1,kitVersion:'2.16.0',sourceReady:true,download:'downloads/studio-kit-pro-installer.zip',tutorial:'como-instalar.html',bytes:677000};
 const ctx={document,URL,ATLAS_INSTALL_MANIFEST:manifest,ATLAS_INSTALL_ASSET_BASE:'https://published.example/',ATLAS_ASSET_BASE:'https://fonts.example/',location:{hash:''},addEventListener(){},fetch(){throw Error('Embedded metadata must not fetch another origin')}};ctx.window=ctx;
 vm.runInNewContext(await readFile(new URL('../style-atlas/dist/installation-ui.js',import.meta.url),'utf8'),ctx);
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(document.getElementById('downloadStudioKit').getAttribute('href'),'https://published.example/downloads/studio-kit-pro-installer.zip');
 assert.equal(document.getElementById('downloadStudioKit').hasAttribute('aria-disabled'),false);
 assert.equal(document.getElementById('installationTutorial').getAttribute('href'),'https://published.example/como-instalar.html');
 assert.match(document.getElementById('installationStatus').textContent,/2\.15\.0/);
});
