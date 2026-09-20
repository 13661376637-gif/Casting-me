import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_FACE, adjustFace, applyFaceOption, lockAppearance, LOOK_HAIR } from '../lib/avatar-model.ts';
import { buildCharacterDrawing, paintCharacter, characterCamera } from '../lib/avatar-drawing.ts';
import bodies from '../lib/avatar-bodies.json' with { type: 'json' };

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
const pathMaxY = paths => {
  let maximum = -Infinity;
  for (const path of paths) for (const match of path.d.matchAll(/[ML](-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)) maximum = Math.max(maximum, Number(match[2]));
  return maximum;
};
const normalizedHead = (paths, look) => {
  const body = bodies[look];
  const scale = body.headScale;
  const chinX = body.chin[0] * body.scale + body.offset[0];
  const chinY = body.chin[1] * body.scale + body.offset[1];
  const x = chinX - 256 * scale;
  const y = chinY - 216 * scale;
  return paths.map(path => ({
    ...path,
    d: path.d.replace(/([ML])(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_match, command, px, py) => {
      return `${command}${Math.round(((Number(px) - x) / scale) * 100) / 100} ${Math.round(((Number(py) - y) / scale) * 100) / 100}`;
    }),
    width: Math.round((path.width / scale) * 100) / 100,
  }));
};
const close = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 0.001, `${message}: ${actual} !== ${expected}`);
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
  assert.deepEqual(normalizedHead(group(candidate, 'face'), look), normalizedHead(group(buildCharacterDrawing({ face: muted, hair: 'original', look: 'natural' }), 'face'), 'natural'), `${look} must preserve the saved face`);
  for (const path of candidate.paths) assert.ok(!/NaN|Infinity/.test(path.d));
  const camera = characterCamera(420, 600, true,candidate);
  assert.equal(candidate.head.x * camera.scale + camera.x, 210);
  checks += 2;
}

// Every customizable head layer is baked into the body's final coordinate
// system. There is no independent runtime head transform that can lag, scale,
// or move separately during a wardrobe or scene change.
for (const look of Object.keys(LOOK_HAIR)) {
  const body = bodies[look];
  const targetX = body.chin[0] * body.scale + body.offset[0];
  const targetY = body.chin[1] * body.scale + body.offset[1];
  const base = buildCharacterDrawing({ face: natural, hair: LOOK_HAIR[look], look });
  const baseChinY = pathMaxY(group(base, 'face'));
  for (const amount of [0, 0.5, 1]) {
    const drawing = buildCharacterDrawing({ face: adjustFace(natural, 'jaw', amount), hair: LOOK_HAIR[look], look });
    assert.ok(drawing.paths.every(path => !Object.hasOwn(path, 'pose')), `${look}/${amount}: no path may retain an independent head transform`);
    close(drawing.head.x, targetX, `${look}/${amount}: horizontal neck anchor`);
    close(drawing.head.y + (216 - 132) * drawing.headScale, targetY, `${look}/${amount}: vertical neck anchor`);
    close(pathMaxY(group(drawing, 'face')), baseChinY, `${look}/${amount}: terminal chin position`);
    checks += 4;
  }
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
// The old qipao reference stopped before the feet. Verify actual lower-leg
// contours and render the whole rebuilt model, not just CSS container bounds.
assert.ok(bodies.qipao.completion, 'Full-length qipao reference provenance');
const fullQipao=createCanvas(512,1280);
const qipaoDrawing=buildCharacterDrawing({face:natural,hair:'original',look:'qipao'});
assert.equal(group(qipaoDrawing,'qipao-footwear').length,6,'Both qipao pumps must have closed uppers, openings and sole detail');
paintCharacter(fullQipao.getContext('2d'),qipaoDrawing,512,1280,false,Path2D);
const lower=fullQipao.getContext('2d').getImageData(0,1160,512,120).data;
assert.ok(lower.some((v,i)=>i%4===3&&v>200),'Visible shoes below the original hem');
for(let x=0;x<512;x++)assert.equal(lower[(119*512+x)*4+3],0,'Feet must not touch the canvas bottom');
writeFileSync(join(output,'qipao-full-length.png'),fullQipao.toBuffer('image/png'));
const portraits = createCanvas(1500, 620);
const pg = portraits.getContext('2d'); pg.fillStyle = '#c9d1d6'; pg.fillRect(0, 0, 1500, 620);
for (const [index, face] of [natural, coded, muted].entries()) {
  const portrait = createCanvas(500, 620);
  paintCharacter(portrait.getContext('2d'), buildCharacterDrawing({ face, hair: 'original', look: 'natural' }), 500, 620, true, Path2D);
  pg.drawImage(portrait, index * 500, 0);
}
writeFileSync(join(output, 'face-parameters.png'), portraits.toBuffer('image/png'));
const graduationCanvas = createCanvas(512, 1280);
const graduationContext = graduationCanvas.getContext('2d');
graduationContext.fillStyle = '#d8d2e6';
graduationContext.fillRect(0, 0, 512, 1280);
paintCharacter(graduationContext, buildCharacterDrawing({ face: natural, hair: 'original', look: 'natural', graduation: true }), 512, 1280, false, Path2D);
writeFileSync(join(output, 'graduation.png'), graduationCanvas.toBuffer('image/png'));
console.log(`PASS: ${checks} checks covering isolated feature edits, fractional parameters, unified head/body coordinates, shared face across outfits, and saved appearance round-trip.`);
console.log(output);
