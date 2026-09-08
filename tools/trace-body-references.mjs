// Source PNGs are only read for tracing; deployed costumes are native vector paths.
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {traceColors} from './vector-contours.mjs';
const runtime=process.argv[2];
const {createCanvas,loadImage}=createRequire(join(runtime,'package.json'))('@napi-rs/canvas');
const references={
  natural:{file:'406c6eb5-f09c-4f69-b9ac-f872354ae63d',chin:[440,267],eyes:[439.5,170],bottom:1783,checker:true},
  editorial:{file:'672b9fe6-8875-4f56-bd9e-bc6d5ce59a38',chin:[441,218],eyes:[444,132],bottom:1751},
  premiere:{file:'95826bf6-1087-4699-9dba-1e2787425bb8',chin:[444,212],eyes:[444.5,119],bottom:1741},
  qipao:{file:'4f9f15c8-382a-47fc-9953-365763f2bbdf',chin:[445,270],eyes:[449,159],bottom:1760},
};
const results={};
const inside=(x,y,polygon)=>{
  let result=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const [xi,yi]=polygon[i],[xj,yj]=polygon[j];
    if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)result=!result;
  }
  return result;
};
// Gold embroidery may share a palette color with skin. Material regions keep
// wardrobe colors fixed when complexion changes.
const qipaoSkin=[
  [[380,234],[493,235],[479,282],[445,298],[415,330],[402,282]],
  [[168,953],[226,959],[253,1105],[216,1142],[158,1068]],
  [[342,771],[414,731],[497,702],[520,748],[458,795],[363,850]],
  [[560,1034],[609,1370],[613,1763],[531,1763],[538,1440]],
];
for(const [look,ref] of Object.entries(references)){
  const sourcePath=`C:/Users/shang/AppData/Local/Temp/codex-clipboard-${ref.file}.png`;
  const image=await loadImage(sourcePath),ratio=1,width=image.width,height=image.height;
  const canvas=createCanvas(width,height),context=canvas.getContext('2d');context.drawImage(image,0,0,width,height);
  const data=context.getImageData(0,0,width,height).data,mask=new Uint8Array(width*height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=y*width+x,o=i*4,r=data[o],g=data[o+1],b=data[o+2];
    if(y/ratio<ref.chin[1]-23||data[o+3]<160)continue;
    if(ref.checker&&Math.min(r,g,b)>200&&Math.max(r,g,b)-Math.min(r,g,b)<16)continue;
    mask[i]=1;
  }
  // Remove source extraction fringes only where they connect to the exterior.
  // Clothing embroidery and skin interiors are not globally color-keyed away.
  for(let pass=0;pass<5;pass++){
    const next=mask.slice();
    for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
      const i=y*width+x;if(!mask[i]||mask[i-1]&&mask[i+1]&&mask[i-width]&&mask[i+width])continue;
      const o=i*4,r=data[o],g=data[o+1],b=data[o+2];
      if(Math.min(r,g,b)>225||(r>190&&g>170&&b<115)||(r>160&&r>g*1.9&&g<85))next[i]=0;
    }
    mask.set(next);
  }
  // Keep only the principal connected figure; detached fringe dots are discarded.
  const visited=new Uint8Array(mask.length),queue=new Int32Array(mask.length);let largest=[];
  for(let seed=0;seed<mask.length;seed++)if(mask[seed]&&!visited[seed]){
    let read=0,write=1;queue[0]=seed;visited[seed]=1;
    while(read<write){const i=queue[read++],x=i%width;for(const n of [x?i-1:-1,x<width-1?i+1:-1,i-width,i+width])if(n>=0&&n<mask.length&&mask[n]&&!visited[n]){visited[n]=1;queue[write++]=n;}}
    if(write>largest.length)largest=Array.from(queue.subarray(0,write));
  }
  mask.fill(0);for(const i of largest)mask[i]=1;
  const trace=traceColors(data,width,height,mask,144);
  const eyeToChin=ref.chin[1]-ref.eyes[1],sourceHeadScale=eyeToChin/(848-515);
  const crown=ref.chin[1]-(848-48)*sourceHeadScale;
  const scale=1230/(ref.bottom-crown),offset=[256-ref.chin[0]*scale,20-crown*scale];
  const headScale=sourceHeadScale*scale/0.245;
  const headOffset=[256-256*headScale,ref.chin[1]*scale+offset[1]-(20+(848-48)*0.245)*headScale];
  const path=loops=>loops.map(loop=>loop.reduce((d,value,i)=>i%2?d+`${Math.round((value/ratio*scale+offset[1])*100)/100}`:d+`${i?'L':'M'}${Math.round((value/ratio*scale+offset[0])*100)/100} `,'')+'Z').join('');
  const shapes=trace.contours.flatMap(contour=>{
    const rgb=trace.palette[contour.color],isSkin=rgb[0]>150&&rgb[1]>100&&rgb[2]>95&&rgb[0]>rgb[1]+9&&rgb[1]>rgb[2]+7;
    const skinLoops=[],outfitLoops=[];
    for(const loop of contour.loops){
      const skin=isSkin&&(look!=='qipao'||qipaoSkin.some(poly=>inside(loop[0]/ratio,loop[1]/ratio,poly)));
      (skin?skinLoops:outfitLoops).push(loop);
    }
    return [[skinLoops,true],[outfitLoops,false]].filter(([loops])=>loops.length).map(([loops,skin])=>({d:path(loops),rgb,skin}));
  }).sort((a,b)=>b.rgb.reduce((n,c)=>n+c,0)-a.rgb.reduce((n,c)=>n+c,0));
  results[look]={sourceSize:[image.width,image.height],sourceHash:createHash('sha256').update(readFileSync(sourcePath)).digest('hex'),scale,offset,headScale,headOffset,chin:ref.chin,eyes:ref.eyes,silhouette:path(trace.silhouette[0].loops),shapes};
  console.log(JSON.stringify({look,headScale,bodyPaths:shapes.length,vertices:trace.contours.reduce((n,c)=>n+c.loops.reduce((sum,l)=>sum+l.length/2,0),0)}));
}
writeFileSync('lib/avatar-bodies.json',JSON.stringify(results));
