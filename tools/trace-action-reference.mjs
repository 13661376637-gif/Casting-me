// Offline contour conversion: runtime renders native paths, never image tiles.
import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {traceColors,traceLabels} from './vector-contours.mjs';
const {createCanvas,loadImage}=createRequire(join(process.argv[2],'package.json'))('@napi-rs/canvas');
const references={
  crossed:{file:process.argv[3],width:1280,height:1920,chin:[637,558],eyes:[639,475],crown:343,bottom:1905,skin:[[550,400,712,620],[268,275,364,448],[909,317,1002,480],[760,1000,911,1874],[476,1740,595,1850]]},
  guard:{file:process.argv[4],width:1024,height:1536,chin:[538,270],eyes:[539,199],crown:86,bottom:1484,skin:[[464,140,603,303],[267,534,374,620],[738,603,808,747],[620,718,802,1435],[366,1300,449,1380]]},
};
const results={};
for(const [pose,ref] of Object.entries(references)){
  const image=await loadImage(ref.file),{width,height}=ref;
  const canvas=createCanvas(width,height),ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,width,height);
  const data=ctx.getImageData(0,0,width,height).data,mask=new Uint8Array(width*height);
  for(let i=0;i<mask.length;i++)mask[i]=data[i*4+3]>180?1:0;
  if(data[3]>180){
    const visited=new Uint8Array(mask.length),queue=[];
    for(let x=0;x<width;x++)queue.push(x,(height-1)*width+x);
    for(let y=0;y<height;y++)queue.push(y*width,y*width+width-1);
    for(let at=0;at<queue.length;at++){
      const i=queue[at];if(i<0||i>=mask.length||visited[i])continue;visited[i]=1;
      const o=i*4,r=data[o],g=data[o+1],b=data[o+2];
      if(Math.min(r,g,b)<185||Math.max(r,g,b)-Math.min(r,g,b)>12)continue;
      mask[i]=0;const x=i%width;queue.push(i-width,i+width);if(x)queue.push(i-1);if(x<width-1)queue.push(i+1);
    }
  }
  for(let pass=0;pass<2;pass++){
    const next=mask.slice();
    for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
      const i=y*width+x;if(!mask[i]||mask[i-1]&&mask[i+1]&&mask[i-width]&&mask[i+width])continue;
      const o=i*4,r=data[o],g=data[o+1],b=data[o+2];
      if((r>180&&g>170&&b<100)||(r>180&&g<70)||Math.min(r,g,b)>245)next[i]=0;
    }mask.set(next);
  }
  const scale=1230/(ref.bottom-ref.crown),offset=[256-ref.chin[0]*scale,20-ref.crown*scale];
  const path=loops=>loops.map(loop=>loop.reduce((d,v,i)=>d+(i%2?`${Math.round((v*scale+offset[1])*100)/100}`:`${i?'L':'M'}${Math.round((v*scale+offset[0])*100)/100} `),'')+'Z').join('');
  const trace=traceColors(data,width,height,mask,64),shapes=[];
  for(const s of trace.silhouette)shapes.push({d:path(s.loops),rgb:[29,29,28],skin:false});
  // A continuous skin underpaint prevents tiny palette/contour simplification
  // holes from exposing the dark garment silhouette as speckles.
  const skinMask=new Int16Array(mask.length).fill(-1);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=y*width+x,o=i*4,r=data[o],g=data[o+1],b=data[o+2];
    if(mask[i]&&r>150&&g>105&&b>80&&r>g+9&&ref.skin.some(([l,t,r,b])=>x>=l&&x<=r&&y>=t&&y<=b))skinMask[i]=0;
  }
  for(const shape of traceLabels(skinMask,width,height))shapes.push({d:path(shape.loops),rgb:[244,203,163],skin:true});
  const contours=trace.contours.sort((a,b)=>trace.palette[b.color].reduce((a,b)=>a+b,0)-trace.palette[a.color].reduce((a,b)=>a+b,0));
  for(const c of contours){
    const rgb=trace.palette[c.color],warm=rgb[0]>160&&rgb[1]>110&&rgb[2]>90&&rgb[0]>rgb[1]+10;
    const material=[[],[]];
    for(const loop of c.loops){
      let area=0;for(let i=0;i<loop.length;i+=2){const j=(i+2)%loop.length;area+=loop[i]*loop[j+1]-loop[j]*loop[i+1];}
      if(Math.abs(area)<8)continue; // suppress sub-pixel texture islands, keep ink contours
      const skin=warm&&ref.skin.some(([x,y,r,b])=>loop[0]>=x&&loop[0]<=r&&loop[1]>=y&&loop[1]<=b);
      material[skin?1:0].push(loop);
    }
    for(const [i,loops] of material.entries())if(loops.length)shapes.push({d:path(loops),rgb,skin:!!i});
  }
  results[pose]={scale,offset,chin:ref.chin,eyes:ref.eyes,shapes};
  console.log(`${pose}: ${shapes.length} native paths, eye/chin distance ${(ref.chin[1]-ref.eyes[1])*scale}`);
}
writeFileSync('lib/avatar-action.json',JSON.stringify(results));
