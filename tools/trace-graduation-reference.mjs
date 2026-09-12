// Converts the supplied graduation reference into native canvas vector paths.
// The source PNG is used only at build-authoring time and is never loaded by
// the game. Usage: node trace-graduation-reference.mjs <runtime> <source.png>
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { traceColors } from './vector-contours.mjs';

const runtime = process.argv[2];
const sourcePath = process.argv[3];
if (!runtime || !sourcePath) throw new Error('Supply the bundled runtime directory and the graduation reference PNG.');
const { createCanvas, loadImage } = createRequire(join(runtime, 'package.json'))('@napi-rs/canvas');
const image = await loadImage(sourcePath);
// A controlled downsample removes paper-grain noise before contour extraction
// while retaining the reference's hand-drawn silhouette and garment linework.
const traceRatio = 0.62;
const width = Math.round(image.width * traceRatio);
const height = Math.round(image.height * traceRatio);
const canvas = createCanvas(width, height);
const context = canvas.getContext('2d');
context.imageSmoothingEnabled = true;
context.imageSmoothingQuality = 'high';
context.drawImage(image, 0, 0, width, height);
const pixels = context.getImageData(0, 0, width, height).data;
const mask = new Uint8Array(width * height);
for (let index = 0; index < mask.length; index++) mask[index] = pixels[index * 4 + 3] >= 72 ? 1 : 0;

// Strip only exterior extraction fringes. Interior whites (collar/diploma) and
// gold details stay intact because a pixel must also touch the transparent edge.
for (let pass = 0; pass < 3; pass++) {
  const next = mask.slice();
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const index = y * width + x;
    if (!mask[index] || mask[index - 1] && mask[index + 1] && mask[index - width] && mask[index + width]) continue;
    const offset = index * 4;
    const r = pixels[offset], g = pixels[offset + 1], b = pixels[offset + 2];
    if (Math.min(r, g, b) > 238 || r > 205 && g > 180 && b < 100 || r > 178 && r > g * 2.1 && g < 75) next[index] = 0;
  }
  mask.set(next);
}

let minX = width, minY = height, maxX = 0, maxY = 0;
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (mask[y * width + x]) {
  minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
}
const scale = Math.min(450 / (maxX - minX), 1240 / (maxY - minY));
const offset = [256 - (minX + maxX) * scale / 2, 18 - minY * scale];
const trace = traceColors(pixels, width, height, mask, 112);
const path = loops => loops.map(loop => loop.reduce((drawing, value, index) => index % 2
  ? drawing + `${Math.round((value * scale + offset[1]) * 100) / 100}`
  : drawing + `${index ? 'L' : 'M'}${Math.round((value * scale + offset[0]) * 100) / 100} `, '') + 'Z').join('');
const shapes = trace.contours
  .map(contour => ({ d: path(contour.loops), rgb: trace.palette[contour.color] }))
  .sort((a, b) => b.rgb.reduce((sum, channel) => sum + channel, 0) - a.rgb.reduce((sum, channel) => sum + channel, 0));
const result = {
  sourceSize: [image.width, image.height],
  traceRatio,
  sourceHash: createHash('sha256').update(readFileSync(sourcePath)).digest('hex'),
  bounds: [minX, minY, maxX, maxY],
  scale,
  offset,
  silhouette: path(trace.silhouette[0].loops),
  shapes,
};
writeFileSync('lib/avatar-graduation.json', JSON.stringify(result));
console.log(JSON.stringify({ sourceSize: result.sourceSize, bounds: result.bounds, scale, colors: shapes.length }));
