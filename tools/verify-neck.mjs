import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { buildCharacterDrawing } from '../lib/avatar-drawing.ts';
import { DEFAULT_FACE } from '../lib/avatar-model.ts';
const {createCanvas,Path2D}=createRequire(join(process.argv[2],'package.json'))('@napi-rs/canvas');
const canvas=createCanvas(1800,800),ctx=canvas.getContext('2d');
ctx.fillStyle='#c9d1d6';ctx.fillRect(0,0,1800,800);
for(const [index,skin] of ['original','porcelain','deep'].entries()){
  const drawing=buildCharacterDrawing({look:'qipao',hair:'original',face:{...DEFAULT_FACE,skin}});
  ctx.save();ctx.translate(index*600-470,-90);ctx.scale(3,3);
  for(const p of drawing.paths){if(p.clip){ctx.save();ctx.clip(new Path2D(p.clip));}const shape=new Path2D(p.d);ctx.fillStyle=p.fill;ctx.fill(shape);if(p.width){ctx.lineWidth=p.width;ctx.strokeStyle=p.stroke;ctx.stroke(shape);}if(p.clip)ctx.restore();}
  ctx.restore();
}
mkdirSync('work/character-verification',{recursive:true});
writeFileSync(`work/character-verification/neck-${process.argv[3]??'current'}.png`,canvas.toBuffer('image/png'));
