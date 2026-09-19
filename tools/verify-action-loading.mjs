import assert from 'node:assert/strict';
import {readFileSync, readdirSync, existsSync} from 'node:fs';
import {join} from 'node:path';
import ts from 'typescript';

// Exercise the production loader's actual source, replacing only its network
// module request and clock. No browser automation or alternate game renderer.
const source=readFileSync('lib/avatar-drawing.ts','utf8');
const loader=source.slice(source.indexOf('type ActionReference'),source.indexOf('// One coordinate'));
assert.ok(loader.includes("import('./avatar-action-data.mjs')"));
const js=ts.transpileModule(loader.replace("import('./avatar-action-data.mjs')",'loadModule()'),{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022},
}).outputText.replace('export function','function');
function harness(loadModule){
  let deadline;
  const preload=new Function('loadModule','setTimeout','clearTimeout',`${js};return preloadActionDrawings;`)(
    loadModule,callback=>{deadline=callback;return 1;},()=>{deadline=undefined;});
  return {preload,expire:()=>deadline()};
}
const valid={default:{crossed:{shapes:[{}],preparedHead:true},guard:{shapes:[{}],preparedHead:true}}};
let resolve, calls=0;
const shared=harness(()=>{calls++;return new Promise(done=>{resolve=done;});});
const first=shared.preload();assert.equal(shared.preload(),first);
resolve(valid);await first;await shared.preload();assert.equal(calls,1);
let attempts=0;
const retry=harness(()=>++attempts===1?Promise.reject(new Error('network')):Promise.resolve(valid));
await assert.rejects(retry.preload(),/network/);await retry.preload();assert.equal(attempts,2);
const invalid=harness(()=>Promise.resolve({default:{}}));
await assert.rejects(invalid.preload(),/Missing integrated action pose/);
const stale=harness(()=>Promise.resolve({default:{crossed:{shapes:[{}]},guard:{shapes:[{}]}}}));
await assert.rejects(stale.preload(),/Missing integrated action pose/);
const slow=harness(()=>new Promise(done=>{resolve=done;}));
const waiting=slow.preload();const rejected=assert.rejects(waiting,/timed out/);
slow.expire();await rejected;resolve(valid);await Promise.resolve();await slow.preload();

if(process.argv.includes('--built')){
  const root='dist/client/_next/static/chunks';
  const chunks=readdirSync(root).filter(name=>name.endsWith('.js'));
  const actionChunks=chunks.filter(name=>name.startsWith('avatar-action-data-'));
  assert.ok(actionChunks.length,'Production must emit an action data JS chunk');
  let linked=false;
  for(const name of chunks){
    const code=readFileSync(join(root,name),'utf8');
    assert.ok(!code.includes('import("./avatar-action.json"'),'No unresolved runtime JSON import');
    for(const asset of actionChunks){
      if(code.includes(`./${asset}`)){assert.ok(existsSync(join(root,asset)));linked=true;}
    }
  }
  assert.ok(linked,'Page must link the emitted action chunk');
}
console.log('Action loader: shared preload, cached success, failure/retry, invalid data and timeout passed.');
