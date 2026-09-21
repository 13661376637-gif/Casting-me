import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import ts from 'typescript';

const source = readFileSync('lib/action-sprites.ts', 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText.replaceAll('export ', '');
function harness() {
  const images = [], timers = new Map();
  let nextTimer = 0;
  class Image {
    naturalWidth = 1024;
    naturalHeight = 1536;
    decode = () => Promise.resolve();
    constructor() { images.push(this); }
  }
  const api = new Function('Image', 'setTimeout', 'clearTimeout', `${js};return {preloadActionSprite,preloadActionSprites,resetActionSprite};`)(
    Image, callback => { timers.set(++nextTimer, callback); return nextTimer; }, id => timers.delete(id));
  return { ...api, images, timers };
}
const shared = harness();
const first = shared.preloadActionSprite('crossed');
assert.equal(shared.preloadActionSprite('crossed'), first);
let decodeDone, ready = false;
shared.images[0].decode = () => new Promise(resolve => { decodeDone = resolve; });
first.then(() => { ready = true; });
shared.images[0].onload();
await Promise.resolve();
assert.equal(ready, false, 'Wait for decoding, not just download');
decodeDone();
await first;
assert.equal(shared.preloadActionSprite('crossed'), first);
assert.equal(shared.timers.size, 0);
const guard = shared.preloadActionSprite('guard');
assert.notEqual(guard, first, 'Each pose has independent readiness');
shared.images[1].onload();
await guard;
await shared.preloadActionSprites();
assert.equal(shared.images.length, 2);

const retry = harness();
const failed = retry.preloadActionSprite('guard');
const rejected = assert.rejects(failed, /could not load/);
retry.images[0].onerror();
await rejected;
const retried = retry.preloadActionSprite('guard');
assert.equal(retry.images.length, 2, 'Failed preload can be retried');
retry.images[1].onload();
await retried;
retry.resetActionSprite('guard');
const reset = retry.preloadActionSprite('guard');
retry.images[2].onload();
await reset;

const slow = harness();
const timed = slow.preloadActionSprite('crossed');
const expired = assert.rejects(timed, /timed out/);
[...slow.timers.values()][0]();
await expired;
assert.equal(slow.images[0].onload, null, 'Late events cannot unblock an expired attempt');

const decode = harness();
const invalid = decode.preloadActionSprite('crossed');
decode.images[0].decode = () => Promise.reject(new Error('bad data'));
const badDecode = assert.rejects(invalid, /could not decode/);
decode.images[0].onload();
await badDecode;

const page = readFileSync('app/page.tsx', 'utf8');
assert.ok(page.includes('backgroundReady && beat.actionPose && <ActionCharacter'));
assert.ok(!page.includes('actionPose={beat.actionPose}'), 'No composited Canvas in filming');
assert.ok(page.includes('readyActionPose===beat.actionPose'), 'Do not reuse readiness for another pose');
assert.ok(!page.includes('preloadActionDrawings'));
const component = readFileSync('components/action-character.tsx', 'utf8');
assert.ok(!/lockedFace|CharacterCanvas|canvas|mask-image/.test(component));
const editableRenderer = readFileSync('components/character-canvas.tsx', 'utf8');
assert.ok(!/actionPose|preloadActionDrawings/.test(editableRenderer), 'Editable face renderer must not expose the old action-head composition');
if (process.argv.includes('--built')) {
  for (const pose of ['crossed']) {
    assert.ok(existsSync(`dist/client/characters/lin-action-${pose}-v48.png`), `Missing built ${pose} PNG`);
  }
}
const assetsFlag = process.argv.indexOf('--assets');
if (assetsFlag !== -1) {
  const runtime = process.argv[assetsFlag + 1];
  assert.ok(runtime, 'Supply the bundled Node runtime package directory');
  const { createCanvas, loadImage } = createRequire(join(runtime, 'package.json'))('@napi-rs/canvas');
  for (const pose of ['crossed']) {
    const path = `public/characters/lin-action-${pose}-v48.png`;
    const image = await loadImage(path);
    assert.ok(image.width >= 1024 && image.height >= 1536, `${pose}: source must be high resolution`);
    const canvas = createCanvas(image.width, image.height);
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, image.width, image.height).data;
    let transparent = 0, visible = 0, edge = 0;
    for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
      const alpha = pixels[(y * image.width + x) * 4 + 3];
      if (alpha === 0) transparent++;
      if (alpha > 128) visible++;
      if (alpha && (x === 0 || y === 0 || x === image.width - 1 || y === image.height - 1)) edge++;
    }
    const area = image.width * image.height;
    assert.ok(transparent / area > .3, `${pose}: reject opaque or baked checkerboard background`);
    assert.ok(visible / area > .12, `${pose}: reject empty portrait`);
    assert.equal(edge, 0, `${pose}: the whole figure and weapon tips need clear frame margins`);
    console.log(`${pose}: ${image.width}×${image.height}, ${(100 * transparent / area).toFixed(1)}% fully transparent, no clipped frame edges`);
  }
}
console.log('Whole PNG action sprites: decode gate, independent poses, cached preload, retry, timeout and no face/body compositing passed.');
