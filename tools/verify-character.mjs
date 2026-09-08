import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_FACE, adjustFace, applyFaceOption, lockAppearance, LOOK_HAIR } from '../lib/avatar-model.ts';
import { buildCharacterDrawing, paintCharacter, characterCamera } from '../lib/avatar-drawing.ts';

const runtime = process.argv[2];
if (!runtime) throw new Error('Supply the bundled Node package directory.');
const requireRuntime = createRequire(join(runtime, 'package.json'));
const { createCanvas, Path2D } = requireRuntime('@napi-rs/canvas');
const output = join(process.cwd(), 'work', 'character-verification');
mkdirSync(output, { recursive: true });

const natural = { ...DEFAULT_FACE };
const coded = { eyes: 'coded', cheekbones: 'high', nose: 'rounded', skin: 'porcelain', jaw: 'long-square' };
const muted = { ...coded, skin: 'deep' };
const baseline = buildCharacterDrawing({ face: natural, hair: 'original', look: 'natural' });
const group = (drawing, name) => drawing.paths.filter(path => path.group === name);
const imageBytes = drawing => {
  const canvas = createCanvas(512, 1280);
  paintCharacter(canvas.getContext('2d'), drawing, 512, 1280, false, Path2D);
  return canvas.toBuffer('image/png');
};
let checks = 0;
for (const feature of ['eyes', 'cheekbones', 'nose', 'skin', 'jaw']) {
  const changed = adjustFace(natural, feature, 1);
  const drawing = buildCharacterDrawing({ face: changed, hair: 'original', look: 'natural' });
  assert.notDeepEqual(imageBytes(drawing), imageBytes(baseline), `${feature} must visibly affect the drawing`);
  assert.deepEqual(group(drawing, 'hair-front'), group(baseline, 'hair-front'), `${feature} must not move the hair`);
  assert.deepEqual(group(drawing, 'outfit'), group(baseline, 'outfit'), `${feature} must not redraw the outfit`);
  assert.deepEqual(group(drawing, 'body').map(path => path.d), group(baseline, 'body').map(path => path.d), `${feature} must preserve body proportions`);
  if (feature !== 'skin') assert.deepEqual(group(drawing, 'body'), group(baseline, 'body'));
  const middle = buildCharacterDrawing({ face: adjustFace(natural, feature, 0.5), hair: 'original', look: 'natural' });
  assert.notDeepEqual(imageBytes(middle), imageBytes(drawing), `${feature} supports continuous adjustment`);
  const reset = applyFaceOption(changed, feature, DEFAULT_FACE[feature]);
  assert.deepEqual(imageBytes(buildCharacterDrawing({ face: reset, hair: 'original', look: 'natural' })), imageBytes(baseline));
  checks += 6;
}

const edited = adjustFace(coded, 'eyes', 0.67);
const locked = lockAppearance('qipao', edited);
const before = JSON.stringify(locked);
edited.adjustments.eyes = 0.1;
assert.equal(JSON.stringify(locked), before, 'Locking must snapshot parameters, not retain a mutable draft');
const restored = JSON.parse(before);
assert.deepEqual(imageBytes(buildCharacterDrawing(locked)), imageBytes(buildCharacterDrawing(restored)), 'Serialized appearance must render identically');
checks += 2;

// Every wardrobe is drawn around the same head. Preview and ending differ only
// in camera projection; neither supplies a replacement portrait or face asset.
for (const look of Object.keys(LOOK_HAIR)) {
  const candidate = buildCharacterDrawing({ face: muted, hair: LOOK_HAIR[look], look });
  assert.deepEqual(group(candidate, 'face'), group(buildCharacterDrawing({ face: muted, hair: 'original', look: 'natural' }), 'face'), `${look} must preserve the saved face`);
  for (const path of candidate.paths) assert.ok(!/NaN|Infinity/.test(path.d));
  const camera = characterCamera(420, 600, true);
  assert.equal(candidate.head.x * camera.scale + camera.x, 210);
  checks += 2;
}

const sheet = createCanvas(1536, 1400);
const context = sheet.getContext('2d');
context.fillStyle = '#90a7a6'; context.fillRect(0, 0, 1536, 1400);
let index = 0;
for (const look of Object.keys(LOOK_HAIR)) {
  for (const face of [natural, coded, muted]) {
    const x = (index % 6) * 256, y = Math.floor(index / 6) * 700;
    const canvas = createCanvas(256, 640);
    paintCharacter(canvas.getContext('2d'), buildCharacterDrawing({ face, hair: LOOK_HAIR[look], look }), 256, 640, false, Path2D);
    context.drawImage(canvas, x, y + 35);
    context.fillStyle = '#1d2838'; context.font = '15px sans-serif'; context.fillText(`${look} / ${face.skin}`, x + 15, y + 25);
    index++;
  }
}
writeFileSync(join(output, 'wardrobe-combinations.png'), sheet.toBuffer('image/png'));
const portraits = createCanvas(1500, 620);
const pg = portraits.getContext('2d'); pg.fillStyle = '#c9d1d6'; pg.fillRect(0, 0, 1500, 620);
for (const [index, face] of [natural, coded, muted].entries()) {
  const portrait = createCanvas(500, 620);
  paintCharacter(portrait.getContext('2d'), buildCharacterDrawing({ face, hair: 'original', look: 'natural' }), 500, 620, true, Path2D);
  pg.drawImage(portrait, index * 500, 0);
}
writeFileSync(join(output, 'face-parameters.png'), portraits.toBuffer('image/png'));
console.log(`PASS: ${checks} checks covering isolated feature edits, fractional parameters, fixed body, shared face across outfits, and saved appearance round-trip.`);
console.log(output);
