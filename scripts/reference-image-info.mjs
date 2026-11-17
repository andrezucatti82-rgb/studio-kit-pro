// Metadata-only decoding. No crop, resize, retouch or pixel synthesis.
export function referenceImageInfo(bytes){
 if(!Buffer.isBuffer(bytes))bytes=Buffer.from(bytes);
 let width,height,format;
 if(bytes.length>=24&&bytes.subarray(0,8).toString('hex')==='89504e470d0a1a0a'){width=bytes.readUInt32BE(16);height=bytes.readUInt32BE(20);format='png';}
 else if(bytes.length>=30&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'){
  format='webp';const chunk=bytes.toString('ascii',12,16);
  if(chunk==='VP8X'){width=bytes.readUIntLE(24,3)+1;height=bytes.readUIntLE(27,3)+1;}
  else if(chunk==='VP8L'&&bytes[20]===0x2f){const bits=bytes.readUInt32LE(21);width=(bits&0x3fff)+1;height=((bits>>>14)&0x3fff)+1;}
  else if(chunk==='VP8 '&&bytes.subarray(23,26).toString('hex')==='9d012a'){width=bytes.readUInt16LE(26)&0x3fff;height=bytes.readUInt16LE(28)&0x3fff;}
  else throw Error('Unsupported WebP reference header');
 }else throw Error('Expected PNG or WebP reference');
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>100000||height>100000)throw Error('Invalid reference dimensions');
 return {width,height,format};
}
