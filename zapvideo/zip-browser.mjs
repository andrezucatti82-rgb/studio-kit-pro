import {Zip, ZipPassThrough} from 'fflate';
import {sha256} from '@noble/hashes/sha2.js';
import {bytesToHex} from '@noble/hashes/utils.js';

export async function fileDigest(blob, signal) {
  const hash = sha256.create();
  for await (const chunk of blob.stream()) {
    signal?.throwIfAborted();
    hash.update(chunk);
  }
  return bytesToHex(hash.digest());
}

export async function writeZipTo(writable, entries) {
  const writer = writable.getWriter();
  let pending = Promise.resolve();
  const zip = new Zip((error, data, final) => {
    pending = pending.then(() => {
      if (error) throw error;
      return writer.write(data);
    }).then(() => final ? writer.close() : undefined);
  });
  try {
    for (const [name, blob] of entries) {
      const file = new ZipPassThrough(name);
      zip.add(file);
      for await (const chunk of blob.stream()) {
        file.push(chunk,false);
        await pending;
      }
      file.push(new Uint8Array(),true);
      await pending;
    }
    zip.end();
    await pending;
  } catch (error) {
    zip.terminate();
    await writer.abort(error).catch(() => {});
    throw error;
  }
}
