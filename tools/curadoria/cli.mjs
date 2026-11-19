import {parseArgs} from 'node:util';
import {sources,search,inspect,download} from './library.mjs';

const commands = {sources,search,inspect,download};
const [command = 'sources', ...args] = process.argv.slice(2);
try {
  if (!Object.hasOwn(commands,command)) throw Error('Comandos: sources, search, inspect, download.');
  const {values} = parseArgs({args,options:{
    source:{type:'string'}, query:{type:'string'}, type:{type:'string'}, limit:{type:'string'},
    id:{type:'string'}, variant:{type:'string'}, project:{type:'string'}, strict:{type:'boolean'}, 'include-references':{type:'boolean'},
  }});
  const {limit,'include-references':includeReferences,...rest} = values;
  const result = await commands[command]({...rest,includeReferences,...(limit===undefined?{}:{limit:Number(limit)})});
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
} catch(error) {
  console.error(error.message);
  process.exitCode = 1;
}
