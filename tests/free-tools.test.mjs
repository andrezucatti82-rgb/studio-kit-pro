import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const script=new URL('../tools/free-vfx/toolchain.py',import.meta.url).pathname;
const invoke=(args,ok=true)=>{const r=spawnSync('python3',[script,...args],{encoding:'utf8',timeout:30000});if(ok)assert.equal(r.status,0,r.stdout+r.stderr);else assert.notEqual(r.status,0);return r;};
test('free plan includes all fifteen open tools and never starts installs',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'free tools á '));try{
 const r=JSON.parse(invoke(['plan','--root',root,'--profile','all-free']).stdout);
 assert.equal(r.freeOnly,true);assert.equal(r.tools.length,15);assert(!r.tools.some(t=>/propainter|resolve|heygen|remotion/i.test(t.id)));assert(r.tools.every(t=>t.license&&t.source.startsWith('https://')));
 assert.deepEqual(await fs.readdir(root),[]);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('unknown tools and profiles fail before touching disk',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'free-tools-invalid-'));try{
 assert.match(invoke(['install','--root',root,'--tool','propainter'],false).stdout,/unknown|not allowed/i);
 assert.match(invoke(['plan','--root',root,'--profile','paid'],false).stderr,/invalid choice/i);
 assert.deepEqual(await fs.readdir(root),[]);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('doctor missing binary remains missing and is not marked as a successful smoke',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'free-tools-doctor-'));try{
 const r=JSON.parse(invoke(['doctor','--root',root,'--tool','natron']).stdout);
 assert.equal(r.results.length,1);assert(['missing','installed','unverified'].includes(r.results[0].status));assert.notEqual(r.results[0].status,'smoke_passed');assert.equal(r.creativeApproval,false);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('real free FFmpeg path transforms and decodes video, preserving paths with spaces and the original',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'free vfx espaço '));try{
 const input=path.join(root,'original.mp4'),output=path.join(root,'efeito final.mp4');
 execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','testsrc2=size=64x64:rate=4:duration=1','-c:v','libx264',input]);const before=await fs.readFile(input);
 const result=JSON.parse(invoke(['run','--root',root,'--operation','filter','--effect','grayscale','--input',input,'--output',output]).stdout);
 assert.equal(result.status,'technical_passed');assert.equal(result.engine,'ffmpeg');assert.equal(result.creativeApproval,false);assert.match(result.sha256,/^[a-f0-9]{64}$/);
 execFileSync('ffmpeg',['-v','error','-i',output,'-f','null','-']);assert.deepEqual(await fs.readFile(input),before);
 const produced=await fs.readFile(output);invoke(['run','--root',root,'--operation','filter','--effect','grayscale','--input',input,'--output',output],false);assert.deepEqual(await fs.readFile(output),produced);
 invoke(['run','--root',root,'--operation','filter','--effect','grayscale','--input',input,'--output',input],false);assert.deepEqual(await fs.readFile(input),before);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('unsupported install platform returns concrete per-tool blocker',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'free-tools-platform-'));try{
 const r=JSON.parse(invoke(['plan','--root',root,'--tool','ffmpeg','--platform','unsupported']).stdout);
 assert.equal(r.tools[0].install.status,'blocked_platform');assert.equal(r.freeOnly,true);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
