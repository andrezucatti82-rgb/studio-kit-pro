// Actual local runtime smoke check; no provider connection, generation or paid API.
import {ensureBrowser,openBrowser} from '@remotion/renderer';
import fs from 'node:fs/promises';
import {run} from '../server/process.mjs';
await run('ffmpeg',['-version']);await run('ffprobe',['-version']);
const status=await ensureBrowser({browserExecutable:process.env.CHROME_PATH||null});
if(!('path' in status))throw Error('Browser não ficou disponível.');
await fs.mkdir('.cache',{recursive:true});await fs.writeFile('.cache/setup-runtime.json',JSON.stringify({browserPath:status.path})+'\n');
const browser=await openBrowser('chrome',{browserExecutable:status.path});await browser.close({silent:true});
console.log('FFmpeg, FFprobe, dependências e inicialização real do navegador: OK. Não comprova acesso ao agente, APIs ou qualidade de vídeo.');
