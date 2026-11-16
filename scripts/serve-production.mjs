import path from 'node:path';
import {Orchestrator} from '../server/orchestrator.mjs';
import {createProductionServer} from '../server/http.mjs';
import {createPlanner} from '../server/planner.mjs';
const args=process.argv.slice(2),arg=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
const port=Number(arg('--port','8780'));
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Use a local port between 1024 and 65535');
const planner=createPlanner({provider:arg('--provider','deterministic'),allowPaid:args.includes('--allow-paid-planning')});
const orchestrator=await new Orchestrator({root:path.resolve(arg('--root','projects/production-local')),planner}).init();
const server=createProductionServer(orchestrator,{workflowFile:arg('--workflow')});
server.once('error',async error=>{console.error(`Local server failed: ${error.message}`);await orchestrator.close();process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`GDA production local: http://127.0.0.1:${port} · no public deployment · provider ${planner.name}`));
async function stop(){server.close();await orchestrator.close();process.exit(0);}
process.once('SIGINT',stop);process.once('SIGTERM',stop);
