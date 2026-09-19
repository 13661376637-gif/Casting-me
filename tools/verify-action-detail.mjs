import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {buildCharacterDrawing,preloadActionDrawings} from '../lib/avatar-drawing.ts';
import {DEFAULT_FACE} from '../lib/avatar-model.ts';
import revised from '../lib/avatar-action.json' with {type:'json'};
const {createCanvas,Path2D}=createRequire(join(process.argv[2],'package.json'))('@napi-rs/canvas');
const original=JSON.parse(execFileSync(process.argv[3],['show','b23725f6d8b1d88b31ba6d2c784215003b340d70:lib/avatar-action.json'],{encoding:'utf8',maxBuffer:30_000_000}));
await preloadActionDrawings();
mkdirSync('work/action-verification',{recursive:true});
const sheet=createCanvas(1600,1200),out=sheet.getContext('2d');
out.fillStyle='#a7b4b0';out.fillRect(0,0,1600,1200);
const crops={crossed:[[-115,-55,190,185],[410,-20,210,190],[126,420,240,290],[203,955,335,295]],guard:[[13,380,200,180],[376,443,250,240],[134,411,270,305],[125,911,300,310]]};
for(const [row,pose] of ['crossed','guard'].entries()){
  const drawing=buildCharacterDrawing({face:DEFAULT_FACE,hair:'original',look:'qipao',actionPose:pose});
  for(const [column,[x,y,w,h]] of crops[pose].entries()){
    const tile=createCanvas(400,560),ctx=tile.getContext('2d'),s=Math.min(380/w,500/h);
    ctx.translate(200-(x+w/2)*s,280-(y+h/2)*s);ctx.scale(s,s);
    for(const p of drawing.paths){ctx.save();if(p.clip)ctx.clip(new Path2D(p.clip));if(p.fill!=='none'){ctx.fillStyle=p.fill;ctx.fill(new Path2D(p.d));}if(p.stroke!=='none'&&p.width){ctx.strokeStyle=p.stroke;ctx.lineWidth=p.width;ctx.lineJoin='round';ctx.stroke(new Path2D(p.d));}ctx.restore();}
    out.drawImage(tile,column*400,row*600+35);out.fillStyle='#182332';out.font='18px sans-serif';out.fillText(`${pose} / ${['Sword grip','Scabbard grip','Waist / cuff','Hem / shoes'][column]}`,column*400+14,row*600+24);
  }
  // Boolean head surgery must not alter anatomy or either weapon. Compare
  // full native material renders outside the head/neck work area.
  const render=shapes=>{const c=createCanvas(1100,1600),ctx=c.getContext('2d');ctx.translate(300,300);for(const p of shapes){ctx.fillStyle=`rgb(${p.rgb.join(',')})`;ctx.fill(new Path2D(p.d));}return ctx.getImageData(0,0,1100,1600).data;};
  const a=render(original[pose].shapes),b=render(revised[pose].shapes);let error=0,count=0,alphaError=0;
  for(let y=0;y<1600;y++)for(let x=0;x<1100;x++){if(x>=428&&x<=647&&y>=298&&y<=529)continue;const at=(y*1100+x)*4;alphaError+=Math.abs(a[at+3]-b[at+3]);for(let c=0;c<4;c++){error+=Math.abs(a[at+c]-b[at+c]);count++;}}
  assert.ok(alphaError/(count/4)<.03,`${pose}: silhouette must preserve reference proportions`);
  assert.ok(error/count<.2,`${pose}: cleanup must remain within small low-contrast grain ${error/count}`);
  console.log(`${pose}: color difference ${(error/count).toFixed(5)}, silhouette difference ${(alphaError/(count/4)).toFixed(5)} / 255`);
}
writeFileSync('work/action-verification/details.png',sheet.toBuffer('image/png'));
