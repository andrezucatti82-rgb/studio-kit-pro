import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const script=fileURLToPath(new URL('../tools/free-vfx/toolchain.py',import.meta.url));
const candidates=process.platform==='win32'?['python','python3']:['python3','python'];
const python=candidates.find(p=>spawnSync(p,['-c','import sys;sys.exit(sys.version_info<(3,10))'],{stdio:'ignore'}).status===0);
if(!python){console.error('Instale Python 3.10+ gratuito e execute novamente. Não é necessária uma API de IA.');process.exit(1);}
const args=process.argv.slice(2);const result=spawnSync(python,[script,...(args.length?args:['doctor'])],{stdio:'inherit'});if(result.error)console.error(result.error.message);process.exitCode=result.status??1;
