import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { DEFAULT_FACE, adjustFace } from '../lib/avatar-model.ts';
import { buildCharacterDrawing } from '../lib/avatar-drawing.ts';

const [runtime,referencePath]=process.argv.slice(2);
const {createCanvas,Path2D,loadImage}=createRequire(join(runtime,'package.json'))('@napi-rs/canvas');
const source=createCanvas(1254,1254),sourceContext=source.getContext('2d');
sourceContext.drawImage(await loadImage(referencePath),0,0);
const output=createCanvas(1254,1254),context=output.getContext('2d');
context.fillStyle='#c9d1d6';context.fillRect(0,0,1254,1254);
context.setTransform(1/0.245,0,0,1/0.245,627-256/0.245,48-20/0.245);
const start=performance.now();
const drawing=buildCharacterDrawing({face:DEFAULT_FACE,hair:'original',look:'natural'});
const buildMs=performance.now()-start;
for(const path of drawing.paths.filter(path=>path.pose)){
  const shape=new Path2D(path.d);
  if(path.fill!=='none'){context.fillStyle=path.fill;context.fill(shape);}
  if(path.stroke!=='none'&&path.width>0){context.strokeStyle=path.stroke;context.lineWidth=path.width;context.stroke(shape);}
}
const a=sourceContext.getImageData(0,0,1254,1254).data,b=context.getImageData(0,0,1254,1254).data;
let sum=0,count=0;
// Compare the actual face interior, not the unrequested reference background or
// the existing game's body/wardrobe outside the supplied head adaptation.
for(let y=345;y<815;y++)for(let x=452;x<810;x++){
  if(((x-627)/173)**2+((y-575)/244)**2>1)continue;
  const o=(y*1254+x)*4;
  for(let c=0;c<3;c++){sum+=(a[o+c]-b[o+c])**2;count++;}
}
const rmse=Math.sqrt(sum/count);
assert.ok(rmse<12,`Reference face reconstruction is too far from supplied pixels: ${rmse}`);
const outDir=join('work','character-verification');mkdirSync(outDir,{recursive:true});
writeFileSync(join(outDir,'reference-scale-render.png'),output.toBuffer('image/png'));
const compare=createCanvas(1254,850),cg=compare.getContext('2d');
cg.drawImage(source,305,40,645,825,0,0,627,850);
cg.drawImage(output,305,40,645,825,627,0,627,850);
writeFileSync(join(outDir,'reference-face-comparison.png'),compare.toBuffer('image/png'));
const timings=[];
for(let i=0;i<8;i++){
  const t=performance.now();
  buildCharacterDrawing({face:adjustFace(DEFAULT_FACE,'eyes',i/9),hair:'original',look:'natural'});
  timings.push(performance.now()-t);
}
console.log(JSON.stringify({faceRGB_RMSE:Math.round(rmse*100)/100,initialBuildMs:Math.round(buildMs),editBuildMs:timings.map(Math.round),pathGroups:drawing.paths.length}));
