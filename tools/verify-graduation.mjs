import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { DEFAULT_FACE } from '../lib/avatar-model.ts';
import { buildCharacterDrawing, paintCharacter } from '../lib/avatar-drawing.ts';

const runtime = process.argv[2];
if (!runtime) throw new Error('Supply the bundled Node package directory.');
const { createCanvas, Path2D } = createRequire(join(runtime, 'package.json'))('@napi-rs/canvas');

const regular = buildCharacterDrawing({ face: DEFAULT_FACE, hair: 'original', look: 'natural' });
const graduation = buildCharacterDrawing({ face: DEFAULT_FACE, hair: 'original', look: 'natural', graduation: true });
const group = (drawing, name) => drawing.paths.filter(path => path.group === name);

// Graduation must be a wardrobe change around the established protagonist,
// never a second face, hair drawing, head transform or body coordinate system.
for (const layer of ['hair-back', 'scalp-base', 'face', 'jewelry', 'hair-front']) {
  assert.deepEqual(group(graduation, layer), group(regular, layer), `${layer} must match the regular protagonist exactly`);
}
assert.deepEqual(graduation.head, regular.head, 'graduation and regular head focus must match');
assert.equal(graduation.headScale, regular.headScale, 'graduation and regular head scale must match');
assert.equal(group(graduation, 'graduation-cap').length, 6, 'graduation cap must use the complete layered drawing');
for (const path of graduation.paths) assert.ok(!/NaN|Infinity/.test(path.d), 'graduation paths must remain finite');

const render = drawing => {
  const canvas = createCanvas(512, 1280);
  paintCharacter(canvas.getContext('2d'), drawing, 512, 1280, false, Path2D);
  return canvas;
};
const bounds = canvas => {
  const { data, width, height } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3] > 8) {
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1, centerX: (minX + maxX) / 2 };
};

const regularCanvas = render(regular), graduationCanvas = render(graduation);
const regularBounds = bounds(regularCanvas), graduationBounds = bounds(graduationCanvas);
const heightRatio = graduationBounds.height / regularBounds.height;
const widthRatio = graduationBounds.width / regularBounds.width;
assert.ok(heightRatio >= 0.94 && heightRatio <= 1.02, `graduation height ratio ${heightRatio} must track the regular figure`);
assert.ok(widthRatio >= 0.8 && widthRatio <= 1.15, `graduation width ratio ${widthRatio} must track the regular figure`);
assert.ok(Math.abs(graduationBounds.centerX - 256) <= 2, 'graduation silhouette must remain centered');
assert.ok(Math.abs(graduationBounds.maxY - regularBounds.maxY) <= 36, 'graduation feet must share the regular baseline');

const sheet = createCanvas(1024, 1280), context = sheet.getContext('2d');
context.fillStyle = '#c9d1d6'; context.fillRect(0, 0, 1024, 1280);
context.drawImage(regularCanvas, 0, 0); context.drawImage(graduationCanvas, 512, 0);
context.strokeStyle = 'rgba(212,58,111,.6)'; context.lineWidth = 1;
for (const y of [regular.head.y, 184, 496, 741, Math.min(regularBounds.maxY, graduationBounds.maxY)]) {
  context.beginPath(); context.moveTo(0, y + .5); context.lineTo(1024, y + .5); context.stroke();
}
context.strokeStyle = 'rgba(29,40,56,.5)';
for (const x of [256, 768]) { context.beginPath(); context.moveTo(x + .5, 0); context.lineTo(x + .5, 1280); context.stroke(); }
context.fillStyle = '#1d2838'; context.font = '700 18px sans-serif';
context.fillText('REGULAR / NATURAL', 18, 30); context.fillText('GRADUATION / REDRAWN', 530, 30);
const output = join(process.cwd(), 'work', 'character-verification');
mkdirSync(output, { recursive: true });
writeFileSync(join(output, 'graduation-comparison.png'), sheet.toBuffer('image/png'));
console.log(JSON.stringify({ regularBounds, graduationBounds, heightRatio, widthRatio }, null, 2));
console.log('PASS: graduation reuses the regular face, hair, head anchor, centered proportions and foot baseline.');
