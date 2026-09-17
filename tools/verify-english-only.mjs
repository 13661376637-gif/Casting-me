import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';

const current=readFileSync('app/page.tsx','utf8');
const baseline=execFileSync(process.argv[2]||'git',['show','5acf543bace80b5bba0592bbc74f0b7e5defedb5:app/page.tsx'],{encoding:'utf8'});
const fields=/^(en|\w+En|id|fame|pressure|preset|left|right|center|tag|actionPose|filmSuccess|graduationPortrait|flash|showProjects|showRoleCard)$/;
function snapshot(text){
  const sf=ts.createSourceFile('page.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),values=[];
  function visit(node){
    if(ts.isPropertyAssignment(node)&&fields.test(node.name.getText(sf)))values.push([node.name.getText(sf),node.initializer.getText(sf)]);
    ts.forEachChild(node,visit);
  }
  visit(sf);return values;
}
assert.deepEqual(snapshot(current),snapshot(baseline),'English story, options, poses and scores must remain identical');
for(const path of ['app/page.tsx','app/layout.tsx','lib/cast.ts']){
  const text=readFileSync(path,'utf8');
  assert.ok(!/\p{Script=Han}/u.test(text),`${path} contains Chinese text`);
  assert.ok(!/setLanguage|language\s*===|\b\w*Zh\b|\bzh\s*:/.test(text),`${path} contains localization state/data`);
}
assert.ok(readFileSync('app/layout.tsx','utf8').includes('<html lang="en">'));
assert.ok(!current.includes('Switch language'));
if(process.argv.includes('--built')){
  const root='dist/client/_next/static/chunks/';
  for(const name of readdirSync(root).filter(name=>name.startsWith('page-')&&name.endsWith('.js'))){
    const code=readFileSync(root+name,'utf8');
    assert.ok(!/\p{Script=Han}/u.test(code),'Built game chunk contains Chinese');
    assert.ok(!code.includes('Switch language'));
  }
}
console.log(`English-only check passed; ${snapshot(current).length} story/choice/score fields unchanged.`);
