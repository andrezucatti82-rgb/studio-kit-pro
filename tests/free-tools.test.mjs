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
test('install without apply is only a plan and cannot download or create a tool store',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'free-tools-preview-'));try{
 const r=JSON.parse(invoke(['install','--root',root,'--tool','opencv']).stdout);assert.equal(r.status,'plan_only');assert.equal(r.freeOnly,true);assert.deepEqual(await fs.readdir(root),[]);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('native installer rejects unsupported host before creating stores',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'free-tools-host-'));try{
 const r=JSON.parse(invoke(['install','--root',root,'--tool','shotcut','--platform','unsupported','--apply']).stdout);assert.equal(r.results[0].status,'blocked_platform');assert.deepEqual(await fs.readdir(root),[]);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('technical smoke produces a separate reproducible report without creative approval',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'free-tools-smoke-'));try{
 const r=JSON.parse(invoke(['smoke','--root',root,'--tool','ffmpeg']).stdout);assert.equal(r.results[0].status,'smoke_passed');assert.equal(r.creativeApproval,false);assert.match(r.results[0].sha256,/^[a-f0-9]{64}$/);
 assert.equal(JSON.parse(await fs.readFile(path.join(root,'.studio-tools/free-vfx/records/smoke.json'),'utf8')).results[0].status,'smoke_passed');
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('bootstrap free-tools selection defaults to all-free and rejects paid profiles before installation',async()=>{
 const {parseInstallArgs}=await import('../packaging/installer/setup-studio.mjs');
 assert.equal(parseInstallArgs([]).freeTools,'all-free');assert.equal(parseInstallArgs(['--free-tools','base']).freeTools,'base');assert.equal(parseInstallArgs(['--free-tools','none']).freeTools,'none');assert.throws(()=>parseInstallArgs(['--free-tools','paid']));
});
test('runtime bootstrap exposes missing Python as a toolchain blocker, not a provider credential request',async()=>{
 const {freeToolchainReport}=await import('../packaging/installer/setup-studio.mjs');
 const r=await freeToolchainReport('/tmp','all-free',{python:null});assert.equal(r.status,'blocked_python');assert.equal(r.freeOnly,true);assert.equal(r.accountsRequired,false);
});
test('private native libraries are scoped explicitly without adding the working directory to loader paths',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'free-tools-env-'));try{
 const lib=path.join(root,'.studio-tools/free-vfx/native/usr/lib/shotcut');await fs.mkdir(lib,{recursive:true});await fs.writeFile(path.join(lib,'libCuteLogger.so'),'fixture');
 const code="import sys,json;sys.path.insert(0,'tools/free-vfx');from toolchain import Toolchain;print(json.dumps(Toolchain(sys.argv[1]).environment()))";
 const r=JSON.parse(execFileSync('python3',['-c',code,root],{encoding:'utf8'}));assert(r.LD_LIBRARY_PATH.split(path.delimiter).includes(lib));assert(!r.LD_LIBRARY_PATH.split(path.delimiter).includes(''));
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('free interpolation produces a decodable new video without invoking a model or paid renderer',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'free-tools-retime-'));try{
 const input=path.join(root,'source.mp4'),output=path.join(root,'slow.mp4');execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','testsrc2=size=64x64:rate=8:duration=1','-c:v','libx264',input]);
 const r=JSON.parse(invoke(['run','--root',root,'--operation','interpolate','--fps','16','--input',input,'--output',output]).stdout);assert.equal(r.status,'technical_passed');assert.equal(r.engine,'ffmpeg');execFileSync('ffmpeg',['-v','error','-i',output,'-f','null','-']);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('cached official artifacts with a wrong SHA256 are rejected before extraction or execution',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'free-tools-hash-'));try{
 const cache=path.join(root,'.studio-tools/free-vfx/downloads');await fs.mkdir(cache,{recursive:true});await fs.writeFile(path.join(cache,'Natron-2.5.0-Linux-x86_64.tar.xz'),'tampered');
 const code="import sys;sys.path.insert(0,'tools/free-vfx');from toolchain import Toolchain;from install_tools import download;download(Toolchain(sys.argv[1]),'https://github.com/NatronGitHub/Natron/releases/download/v2.5.0/Natron-2.5.0-Linux-x86_64-no-installer.tar.xz','Natron-2.5.0-Linux-x86_64.tar.xz')";
 const r=spawnSync('python3',['-c',code,root],{encoding:'utf8'});assert.notEqual(r.status,0);assert.match(r.stderr,/SHA256|integrity/i);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('Natron informational version exit is recognized only with its explicit version banner',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'free-tools-natron-info-'));try{
 const folder=path.join(root,'.studio-tools/free-vfx/natron');await fs.mkdir(folder,{recursive:true});const exe=path.join(folder,'Natron');await fs.writeFile(exe,'#!/usr/bin/env python3\nimport sys\nprint("Natron Version 2.5")\nsys.exit(1)\n',{mode:0o755});
 let r=JSON.parse(invoke(['doctor','--root',root,'--tool','natron']).stdout);assert.equal(r.results[0].status,'installed');assert.equal(r.results[0].versionInformationExit,1);
 await fs.writeFile(exe,'#!/usr/bin/env python3\nimport sys\nprint("Startup failed")\nsys.exit(1)\n',{mode:0o755});r=JSON.parse(invoke(['doctor','--root',root,'--tool','natron']).stdout);assert.equal(r.results[0].status,'unverified');
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
