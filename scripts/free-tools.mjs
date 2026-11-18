import {pythonProbe,pythonCandidates} from './free-python.mjs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const script=fileURLToPath(new URL('../tools/free-vfx/toolchain.py',import.meta.url));
const candidates=pythonCandidates();
const python=candidates.find(p=>spawnSync(p,['-c',pythonProbe],{stdio:'ignore'}).status===0);
if(!python){console.error('Instale Python 3.10–3.12 gratuito com venv/ensurepip (ou defina STUDIO_PYTHON) e execute novamente. Não é necessária uma API de IA.');process.exit(1);}
const args=process.argv.slice(2);if(args[0]==='tools')args.shift();const result=spawnSync(python,[script,...(args.length?args:['doctor'])],{stdio:'inherit'});if(result.error)console.error(result.error.message);process.exitCode=result.status??1;
