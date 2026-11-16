import {spawn} from 'node:child_process';
export async function run(command,args,{signal,timeout=120000,maxBytes=2*1024*1024}={}) {
  signal?.throwIfAborted();
  return new Promise((resolve,reject)=>{
    const child=spawn(command,args,{shell:false,stdio:['ignore','pipe','pipe'],signal});
    const chunks={stdout:[],stderr:[]}; let bytes=0, failure;
    const timer=setTimeout(()=>{failure=Error(`${command} timeout`);child.kill('SIGKILL');},timeout);
    const force=()=>{const timer=setTimeout(()=>child.kill('SIGKILL'),1000);timer.unref();};
    signal?.addEventListener('abort',force,{once:true});
    for(const key of ['stdout','stderr'])child[key].on('data',b=>{bytes+=b.length;if(bytes>maxBytes){failure=Error(`${command} output limit`);child.kill('SIGKILL');}else chunks[key].push(b);});
    child.on('error',e=>{failure=e;});
    child.on('close',code=>{clearTimeout(timer);signal?.removeEventListener('abort',force);if(signal?.aborted)return reject(signal.reason??Error('Cancelled'));if(failure)return reject(failure);const stdout=Buffer.concat(chunks.stdout).toString(),stderr=Buffer.concat(chunks.stderr).toString();if(code!==0)return reject(Error(`${command} exited ${code}: ${stderr.slice(-1800)}`));resolve({stdout,stderr});});
  });
}
export async function probe(file,options) {
 const {stdout}=await run('ffprobe',['-v','error','-protocol_whitelist','file,pipe','-show_format','-show_streams','-of','json',file],options);
 return JSON.parse(stdout);
}
