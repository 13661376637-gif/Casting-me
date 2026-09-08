import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

const baseline = 'd5839b991e8e9b4dc8d70b942c95fc015e56af54';
const original = execFileSync('git', ['-c', `safe.directory=${process.cwd().replaceAll('\\', '/')}`, 'show', `${baseline}:app/page.tsx`], { encoding: 'utf8' });
const current = readFileSync('app/page.tsx', 'utf8');
const printer = ts.createPrinter({ removeComments: true });
function definitions(text) {
  const source = ts.createSourceFile('page.tsx', text.replaceAll('\r\n', '\n'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const result = new Map();
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) result.set(node.name.text, printer.printNode(ts.EmitHint.Unspecified, node.initializer, source));
    if (ts.isFunctionDeclaration(node) && node.name && node.body) result.set(node.name.text, printer.printNode(ts.EmitHint.Unspecified, node.body, source));
    ts.forEachChild(node, visit);
  }
  visit(source);
  return result;
}
const before = definitions(original), after = definitions(current);
const protectedNames = ['choice01', 'choice02', 'choice04', 'choice05', 'choice06', 'prologue', 'firstRead', 'lookTest', 'callback', 'locked', 'redCarpet', 'sequences', 'screenNext', 'stageInfo', 'getSceneBackground', 'advance', 'selectChoice', 'completeTraining', 'faceFeatureOptions', 'AgentChoicePanel', 'ScriptChoicePanel'];
for (const name of protectedNames) {
  assert.ok(before.has(name) && after.has(name), `Missing protected definition: ${name}`);
  assert.equal(after.get(name), before.get(name), `Story/flow changed: ${name}`);
}
assert.ok(!/LayeredAvatar|FaceProfileLayer|baseSrc|faceSrc|avatar-layers/.test(current), 'No old protagonist raster compositor may remain active');
assert.match(after.get('Sprite'), /CharacterCanvas/);
for (const name of ['TrainingScreen', 'EndingScreen', 'DialogueScene']) assert.match(after.get(name), /lockedFace=\{lockedFace\}/, `${name} must consume the saved face`);
console.log(`PASS: ${protectedNames.length} story, choice, scoring and flow definitions unchanged; all later scenes receive the locked face.`);
