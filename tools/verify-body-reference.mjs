import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import bodies from '../lib/avatar-bodies.json' with {type:'json'};
import {DEFAULT_FACE,LOOK_HAIR} from '../lib/avatar-model.ts';
import {buildCharacterDrawing,paintCharacter} from '../lib/avatar-drawing.ts';
const {createCanvas,Path2D,loadImage}=createRequire(join(process.argv[2],'package.json'))('@napi-rs/canvas');
const files={natural:'406c6eb5-f09c-4f69-b9ac-f872354ae63d',editorial:'672b9fe6-8875-4f56-bd9e-bc6d5ce59a38',premiere:'95826bf6-1087-4699-9dba-1e2787425bb8',qipao:'4f9f15c8-382a-47fc-9953-365763f2bbdf'};
const sheet=createCanvas(2048,1280),sg=sheet.getContext('2d');sg.fillStyle='#c9d1d6';sg.fillRect(0,0,2048,1280);
const report=[];
for(const [index,[look,file]] of Object.entries(files).entries()){
  const body=bodies[look],drawing=buildCharacterDrawing({look,hair:'original',face:DEFAULT_FACE});
  const [w,h]=body.sourceSize,source=createCanvas(w,h),sc=source.getContext('2d');sc.drawImage(await loadImage(`C:/Users/shang/AppData/Local/Temp/codex-clipboard-${file}.png`),0,0);
  const result=createCanvas(w,h),ctx=result.getContext('2d');
  ctx.setTransform(1/body.scale,0,0,1/body.scale,-body.offset[0]/body.scale,-body.offset[1]/body.scale);
  for(const path of drawing.paths.filter(p=>p.group==='body'||p.group==='outfit')){
    const shape=new Path2D(path.d);ctx.fillStyle=path.fill;ctx.fill(shape);
    if(path.width){ctx.strokeStyle=path.stroke;ctx.lineWidth=path.width;ctx.stroke(shape);}
  }
  const a=sc.getImageData(0,0,w,h).data,b=ctx.getImageData(0,0,w,h).data;let sum=0,n=0;
  for(let y=body.chin[1]+30;y<h-10;y++)for(let x=5;x<w-5;x++){
    const o=(y*w+x)*4;if(a[o+3]<250||b[o+3]<250)continue;
    if(look==='natural'&&Math.min(...a.slice(o,o+3))>200&&Math.max(...a.slice(o,o+3))-Math.min(...a.slice(o,o+3))<16)continue;
    for(let c=0;c<3;c++){sum+=(a[o+c]-b[o+c])**2;n++;}
  }
  const rmse=Math.sqrt(sum/n);assert.ok(rmse<14,`${look} body reference difference ${rmse}`);
  // Uniform reference scaling retains every garment's distinct body proportions.
  assert.ok(Math.abs((body.chin[1]*body.scale+body.offset[1])-(216*body.headScale+body.headOffset[1]))<0.01);
  const panel=createCanvas(512,1280);paintCharacter(panel.getContext('2d'),drawing,512,1280,false,Path2D);sg.drawImage(panel,index*512,0);
  report.push({look,RGB_RMSE:Math.round(rmse*100)/100,headScale:body.headScale});
}
// Sample the old seam in canonical reference coordinates across all variants.
for(const skin of ['original','porcelain','deep'])for(const hair of Object.values(LOOK_HAIR)){
  const drawing=buildCharacterDrawing({look:'natural',hair,face:{...DEFAULT_FACE,skin}});
  const canvas=createCanvas(1254,1254),ctx=canvas.getContext('2d');
  const body=bodies.natural,scale=body.headScale,chinX=body.chin[0]*body.scale+body.offset[0],chinY=body.chin[1]*body.scale+body.offset[1];
  ctx.setTransform(1/scale/.245,0,0,1/scale/.245,(627-256/.245)-(chinX-256*scale)/scale/.245,(48-20/.245)-(chinY-216*scale)/scale/.245);
  for(const path of drawing.paths.filter(p=>!['body','outfit'].includes(p.group))){ctx.fillStyle=path.fill;ctx.fill(new Path2D(path.d));}
  for(const [x,y] of [[711,285],[737,299],[755,313],[779,338],[800,375]])assert.equal(ctx.getImageData(x,y,1,1).data[3],255,`${skin}/${hair}: forehead must have solid coverage`);
}
mkdirSync('work/character-verification',{recursive:true});writeFileSync('work/character-verification/reference-body-render.png',sheet.toBuffer('image/png'));
console.log(JSON.stringify(report));console.log('PASS: reference bodies, uniform neck anchors, and hairline coverage.');
