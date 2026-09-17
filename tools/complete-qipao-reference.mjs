// Restore the missing lower hem/ankles/shoes from the user's intact qipao
// reference as editable contours. Originals are read-only; no runtime bitmap.
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {traceColors} from './vector-contours.mjs';
const {createCanvas,loadImage,Path2D}=createRequire(join(process.argv[2],'package.json'))('@napi-rs/canvas');
const bodyPath='lib/avatar-bodies.json',bodies=JSON.parse(readFileSync(bodyPath,'utf8'));
// Reproducible pre-completion geometry; never repeatedly transform a repair.
const original=JSON.parse(execFileSync(process.argv[3],['show','6f95795a01156076187cf92dced942ea173c8958:lib/avatar-bodies.json'],{encoding:'utf8',maxBuffer:30e6})).qipao;
bodies.qipao=original;
const source='../游戏人物形象和设定/image 136.png';
const image=await loadImage(source),canvas=createCanvas(image.width,image.height),ctx=canvas.getContext('2d');
ctx.drawImage(image,0,0);
const data=ctx.getImageData(0,0,image.width,image.height).data,mask=new Uint8Array(image.width*image.height);
const scale=1.5,offset=[-259,-162],seam=1245;
for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){
  const i=y*image.width+x,o=i*4;
  mask[i]=y*scale+offset[1]>=seam-1&&data[o+3]>180?1:0;
}
for(let pass=0;pass<3;pass++){
  const next=mask.slice();
  for(let y=1;y<image.height-1;y++)for(let x=1;x<image.width-1;x++){
    const i=y*image.width+x;if(!mask[i]||mask[i-1]&&mask[i+1]&&mask[i-image.width]&&mask[i+image.width])continue;
    const o=i*4,r=data[o],g=data[o+1],b=data[o+2];
    if(Math.min(r,g,b)>225||(r>180&&g>160&&b<110)||(r>180&&g<70))next[i]=0;
  }mask.set(next);
}
const trace=traceColors(data,image.width,image.height,mask,96);
const path=loops=>loops.map(loop=>loop.reduce((d,v,i)=>d+(i%2?`${(v*scale+offset[1]).toFixed(2)}`:`${i?'L':'M'}${(v*scale+offset[0]).toFixed(2)} `),'')+'Z').join('');
const q=bodies.qipao;
// Clip the polygon vertices directly. Skia's boolean operation can silently
// return the original on a highly detailed silhouette, leaving an old hem.
const clipUpper=d=>d.split('Z').filter(Boolean).map(loop=>{
  const points=[...loop.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map(m=>[+m[1],+m[2]]),out=[];
  for(let i=0;i<points.length;i++){
    const a=points[(i+points.length-1)%points.length],b=points[i],ai=a[1]<=seam,bi=b[1]<=seam;
    if(ai!==bi)out.push([a[0]+(b[0]-a[0])*(seam-a[1])/(b[1]-a[1]),seam]);
    if(bi)out.push(b);
  }
  return out.length>2?out.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join('')+'Z':'';
}).join('');
q.shapes=q.shapes.map(shape=>({...shape,d:clipUpper(shape.d)})).filter(shape=>shape.d);
const lowerSilhouette=path(trace.silhouette.flatMap(s=>s.loops));
q.silhouette=clipUpper(q.silhouette)+lowerSilhouette;
for(const contour of trace.contours.sort((a,b)=>trace.palette[b.color].reduce((n,c)=>n+c,0)-trace.palette[a.color].reduce((n,c)=>n+c,0))){
  const rgb=trace.palette[contour.color],warm=rgb[0]>150&&rgb[1]>100&&rgb[2]>80&&rgb[0]>rgb[1]+9;
  const groups=[[],[]];
  for(const loop of contour.loops){const [x,y]=loop;const skin=warm&&(x>378&&y<990||x>280&&x<345&&y>942);groups[skin?1:0].push(loop);}
  for(const [i,loops] of groups.entries())if(loops.length)q.shapes.push({d:path(loops),rgb,skin:!!i});
}
q.completion={source:'image 136.png',sourceSize:[image.width,image.height],scale,offset,seam};
const bottom=new Path2D(lowerSilhouette).getBounds()[3],fit=1230/(bottom-20);
const fitPath=d=>d.replace(/([ML])(-?[\d.]+) (-?[\d.]+)/g,(_,c,x,y)=>`${c}${(256+(+x-256)*fit).toFixed(2)} ${(20+(+y-20)*fit).toFixed(2)}`);
q.silhouette=fitPath(q.silhouette);q.shapes=q.shapes.map(s=>({...s,d:fitPath(s.d)}));
q.scale*=fit;q.offset=[256+(q.offset[0]-256)*fit,20+(q.offset[1]-20)*fit];q.headScale*=fit;
q.headOffset=[256-256*q.headScale,q.chin[1]*q.scale+q.offset[1]-216*q.headScale];
writeFileSync(bodyPath,JSON.stringify(bodies));
console.log('Qipao restored from full reference:',q.completion);
