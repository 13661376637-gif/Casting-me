import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const page = readFileSync('app/page.tsx', 'utf8');
assert.match(page, /firstRead: 'auditionFailed', auditionFailed: 'lookTest'/);
assert.match(page, /auditionFailed: AUDITION_FAILURE_BEATS/);
assert.match(page, /'firstRead', 'auditionFailed', 'lookTest', 'creator'/);
assert.match(page, /screen === 'profile' \|\| screen === 'firstRead'/);
const source = readFileSync('lib/audition-failure.ts', 'utf8');
const component = readFileSync('components/audition-failure-scene.tsx', 'utf8');
assert.ok(!/setFame|setPressure|localStorage|appearance/.test(source + component), 'Do not double-charge rejection or alter saved appearance');
assert.ok(!/CharacterCanvas|mask-image|clip-path/.test(component), 'Use one intact portrait, never layer a face');
assert.match(component, /disabled=\{status === 'loading'\}/);
assert.match(component, /status === 'error' \? retry : onAdvance/);
assert.match(component, /status === 'ready' && <img/);
assert.doesNotMatch(component, /<article|<h1|audition-result|audition-page|BEFORE REPRESENTATION/, 'Rejection information belongs only in the bottom dialogue');
assert.match(component, /className="dialogue-shell"/);
const css = readFileSync('app/globals.css', 'utf8');
const portraitStyle = css.match(/\.audition-failure-portrait\s*\{([^}]+)\}/)?.[1] ?? '';
for (const rule of ['left:50%', 'top:29.5cqh', 'height:110cqh', 'width:auto', 'max-width:none', 'translateX(-50%)', 'object-fit:contain']) {
  assert.ok(portraitStyle.includes(rule), `Keep centered, proportional dialogue framing: ${rule}`);
}
assert.doesNotMatch(css, /audition-result|audition-failure-composition|audition-failure-scene \.dialogue-shell/, 'No residual left column or custom dialogue sizing');
assert.ok(!/\p{Script=Han}/u.test(source + component));
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText.replaceAll('export ', '');
function harness() {
  const images = [], timers = new Map(); let next = 0;
  class Image { naturalWidth = 1024; naturalHeight = 1536; decode = () => Promise.resolve(); constructor() { images.push(this); } }
  const api = new Function('Image', 'setTimeout', 'clearTimeout', `${js}; return {preloadAuditionFailure,AUDITION_FAILURE_BEATS};`)(
    Image, callback => { timers.set(++next, callback); return next; }, id => timers.delete(id));
  return { ...api, images, timers };
}
const normal = harness();
const first = normal.preloadAuditionFailure();
assert.equal(first, normal.preloadAuditionFailure());
let complete = false, finishDecode;
first.then(() => { complete = true; });
normal.images[0].decode = () => new Promise(resolve => { finishDecode = resolve; });
for (const image of normal.images) image.onload();
await Promise.resolve();
assert.equal(complete, false, 'Both background and portrait must decode before continuing');
finishDecode(); await first;
assert.equal(normal.timers.size, 0);
assert.equal(normal.AUDITION_FAILURE_BEATS.length, 5);
assert.match(normal.AUDITION_FAILURE_BEATS.at(-1).en, /compromise/);
for (const mode of ['network', 'decode', 'timeout']) {
  const test = harness(), pending = test.preloadAuditionFailure();
  const rejected = assert.rejects(pending);
  if (mode === 'network') test.images[0].onerror();
  if (mode === 'decode') { test.images[0].decode = () => Promise.reject(Error('decode')); test.images[0].onload(); }
  if (mode === 'timeout') [...test.timers.values()][0]();
  test.images[1].onload();
  await rejected;
  const retry = test.preloadAuditionFailure();
  assert.equal(test.images.length, 4, `${mode}: failed loads must be retryable`);
  test.images[2].onload(); test.images[3].onload(); await retry;
}
const { createCanvas, loadImage } = createRequire(`${process.argv[2]}/package.json`)('@napi-rs/canvas');
const image = await loadImage('public/characters/lin-audition-failed-v3.png');
assert.ok(image.width >= 1024 && image.height >= 1536);
const canvas = createCanvas(image.width, image.height), ctx = canvas.getContext('2d');
ctx.drawImage(image, 0, 0);
const rgba = ctx.getImageData(0, 0, image.width, image.height).data;
let transparent = 0, solid = 0, edge = 0;
for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
  const a = rgba[(y * image.width + x) * 4 + 3];
  if (!a) transparent++;
  if (a > 128) solid++;
  if (a && (x === 0 || y === 0 || x === image.width - 1 || y === image.height - 1)) edge++;
}
assert.ok(transparent / (image.width * image.height) > .5, 'Reject baked checkerboard');
assert.ok(solid / (image.width * image.height) > .15, 'Reject empty artwork');
assert.equal(edge, 0, 'Complete head, hands, hem and shoes inside the image');
assert.match(readFileSync('app/globals.css', 'utf8'), /\.audition-failure-portrait[^}]+object-fit:contain/);
console.log(`Audition failure: 5 beats before agents, unchanged scores/face data, preload/decode/retry/timeout passed. PNG ${image.width}x${image.height}, ${(transparent / rgba.length * 400).toFixed(1)}% transparent, no clipped edges.`);
