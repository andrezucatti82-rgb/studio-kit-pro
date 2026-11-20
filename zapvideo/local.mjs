import fs from 'node:fs/promises';
import path from 'node:path';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateProject, describeProject} from '../style-atlas/dist/zapvideo-contract.mjs';
import {renderAssembly,renderEdit} from './renderer.mjs';
import {assemblyPlan} from '../style-atlas/dist/zapvideo-assembly.mjs';

export async function readProject(file) {
  if ((await fs.stat(file)).size > 2 * 1024 ** 2) throw new Error('Ficha excede 2 MiB.');
  return validateProject(JSON.parse(await fs.readFile(file,'utf8')));
}

export async function importProject(project, output, sourceFile) {
  const directory = path.resolve(output);
  const sourceDirectory = path.dirname(path.resolve(sourceFile));
  const manifest = await readManifest(path.join(sourceDirectory,'arquivos-recebidos.json'));
  if (manifest) for (const item of manifest) validateFilename(item);
  await fs.mkdir(directory,{recursive:true});
  await writeExact(path.join(directory,'projeto-video.json'),JSON.stringify(project,null,2)+'\n');
  await writeExact(path.join(directory,'pedido.txt'),describeProject(project)+'\n');
  // Keep the manifest and media together. Original media remain in the received folder.
  if (manifest?.length) await writeExact(path.join(directory,'materiais-origem.json'),JSON.stringify({
    directory:path.relative(directory,sourceDirectory) || '.',
  }));
  return {format:project.format, revision:project.revision, directory};
}

async function writeExact(file, content) {
  try {
    await fs.writeFile(file,content,{flag:'wx'});
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    if (await fs.readFile(file,'utf8') !== content) throw new Error('Já existe uma ficha diferente na pasta. Use outra pasta.');
  }
}
function validateFilename(item) {
  if (typeof item?.filename !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,250}$/.test(item.filename)) {
    throw new Error('Manifesto contém um caminho de arquivo inválido.');
  }
}
async function readManifest(file) {
  try {
    if ((await fs.stat(file)).size > 128 * 1024) throw new Error('Manifesto excede 128 KiB.');
    const data = JSON.parse(await fs.readFile(file,'utf8'));
    if (!Array.isArray(data) || data.length > 101) throw new Error('Manifesto de arquivos inválido.');
    return data;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return null;
  }
}
async function localMaterials(projectFile) {
  let directory = path.dirname(path.resolve(projectFile));
  try {
    const link = JSON.parse(await fs.readFile(path.join(directory,'materiais-origem.json'),'utf8'));
    if (typeof link.directory === 'string') directory = path.resolve(directory,link.directory);
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const records = await readManifest(path.join(directory,'arquivos-recebidos.json')) ?? [];
  return material=>{
    const item=records.find(value=>value?.id===material.id);
    if (item) validateFilename(item);
    return path.join(directory,item?.filename ?? material.name);
  };
}

export async function executeLocal(projectFile, output, selected = {}) {
  const project = await readProject(projectFile);
  const resolve=await localMaterials(projectFile);
  const inputs = Object.create(null);
  for (const material of project.materials.filter(item => item.kind === 'source' || item.kind === 'subtitle')) {
    inputs[material.id] = selected[material.kind] ?? resolve(material);
  }
  return renderEdit(project,inputs,output);
}

export async function executeLocalAssembly(projectFile,output,phase,clipDirectory,approvedBasis) {
  const project=await readProject(projectFile);
  const timeline=assemblyPlan(project), resolve=await localMaterials(projectFile);
  const inputs=Object.create(null);
  const materialProof=[];
  for (const proof of timeline.materials) {
    let file;
    if (proof.kind==='generated') {
      if (!clipDirectory) throw new Error('Baixe os clipes vinculados e informe a pasta com --clips.');
      file=path.join(path.resolve(clipDirectory),proof.id+'.mp4');
    } else {
      const material=project.materials.find(item=>item.id===proof.id);
      file=resolve(material);
      const stat=await fs.stat(file);
      if (!stat.isFile() || stat.size!==material.bytes) throw new Error('Material local diferente da ficha.');
    }
    const hash=createHash('sha256');
    let length=0;
    for await (const chunk of createReadStream(file)) {hash.update(chunk);length+=chunk.length;}
    const sha256=hash.digest('hex');
    if (proof.sha256 && sha256!==proof.sha256) throw new Error('Clipe local diferente da ficha.');
    inputs[proof.id]=file;
    materialProof.push({id:proof.id,bytes:length,sha256});
  }
  const basis=createHash('sha256').update(JSON.stringify({version:1,timeline,files:materialProof})).digest('hex');
  if (phase==='full' && approvedBasis!==basis) throw new Error('A montagem completa precisa da aprovação desta ficha e dos mesmos materiais.');
  const report={...await renderAssembly(project,phase,inputs,output),basis};
  await fs.writeFile(path.join(output,'relatorio-tecnico.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  return report;
}
