import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {referenceImageInfo} from '../scripts/reference-image-info.mjs';
const root=new URL('../style-atlas/dist/',import.meta.url),catalog=JSON.parse(fs.readFileSync(new URL('catalog.json',root),'utf8'));
test('every catalogue panel matches the actual source dimensions and remains inside its source',()=>{
 const sources=new Map();let panels=0;
 for(const style of catalog.styles)for(const frame of style.sequence.frames){
  if(!sources.has(frame.src))sources.set(frame.src,referenceImageInfo(fs.readFileSync(new URL(frame.src,root))));
  const info=sources.get(frame.src),[x,y,w,h]=frame.crop||[0,0,1,1];assert(x>=0&&y>=0&&w>0&&h>0&&x+w<=1&&y+h<=1,style.id);
  assert.equal(frame.width,Math.round(info.width*w),style.id);assert.equal(frame.height,Math.round(info.height*h),style.id);
  if(frame.sourceWidth!==undefined){assert.equal(frame.sourceWidth,info.width,style.id);assert.equal(frame.sourceHeight,info.height,style.id);}
  panels++;
 }
 assert.equal(panels,catalog.styles.length*4);assert(sources.size>1000);
});
test('reference metadata rejects invalid, truncated and zero-size files',()=>{
 for(const bytes of [Buffer.alloc(0),Buffer.from('not a reference image'),Buffer.from('RIFFabcdefghWEBP'),Buffer.from('89504e470d0a1a0a000000000000000000000000000000000000','hex')])assert.throws(()=>referenceImageInfo(bytes));
});
