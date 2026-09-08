// Deterministic reference-to-vector tracing. The supplied PNGs are read-only
// measurement sources; the game receives closed editable contours, not images.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const [runtime, sourcePath, targetPath] = process.argv.slice(2);
if (!targetPath) throw new Error('Expected runtime package directory and both reference paths.');
const { createCanvas, loadImage } = createRequire(join(runtime, 'package.json'))('@napi-rs/canvas');
const size = 900, referenceSize = 1254;
const pixels = async path => {
  const canvas = createCanvas(size, size), context = canvas.getContext('2d');
  context.drawImage(await loadImage(path), 0, 0, size, size);
  return context.getImageData(0, 0, size, size).data;
};
const data = await pixels(sourcePath), target = await pixels(targetPath);
const faceOutline = [[627,286],[575,276],[513,290],[473,318],[447,365],[424,421],[410,472],[407,521],[395,509],[383,489],[369,481],[357,491],[351,514],[355,550],[369,581],[391,610],[402,632],[404,650],[418,658],[428,644],[444,692],[466,734],[501,773],[542,810],[588,841],[621,850],[650,846],[684,825],[723,794],[760,761],[788,727],[810,688],[828,641],[836,654],[850,653],[857,631],[879,607],[894,577],[901,538],[900,505],[889,485],[878,482],[865,494],[850,521],[845,469],[825,418],[803,371],[778,330],[742,301],[698,282],[658,279]];
const neckOutline = [[498,752],[500,874],[491,942],[475,972],[561,1005],[630,1050],[786,954],[757,914],[751,760],[685,815],[625,849],[559,815]];
const jewelry = [[[405,631],[423,633],[434,691],[430,773],[412,790],[394,751],[393,684]],[[830,631],[849,631],[861,686],[861,753],[843,790],[823,766],[822,682]]];
const inside = (x, y, polygon) => {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) result = !result;
  }
  return result;
};
const groups = new Int8Array(size * size).fill(-1);
const histogram = new Map();
for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
  const index = y * size + x, offset = index * 4;
  const rx = (x + 0.5) * referenceSize / size, ry = (y + 0.5) * referenceSize / size;
  if (ry < 44 || ry > 1030 || rx < 264 || rx > 982) continue;
  const r = data[offset], g = data[offset + 1], b = data[offset + 2];
  const lightBackground = Math.min(r,g,b) > 196 && Math.max(r,g,b) - Math.min(r,g,b) < 13;
  let group = inside(rx, ry, faceOutline) ? 0 : jewelry.some(poly => inside(rx,ry,poly)) ? 3 : inside(rx,ry,neckOutline) ? 2 : 1;
  // Only retain the dark hair silhouette outside the closed skin/jewelry regions.
  // This excludes the checkerboard and shoulders without erasing eye whites.
  if (group === 1 && (lightBackground || Math.max(r,g,b) > 185)) continue;
  if (group === 1 && ry < 650) group = 4;
  groups[index] = group;
  const key = (r >> 3) * 1024 + (g >> 3) * 32 + (b >> 3);
  let bin = histogram.get(key);
  if (!bin) { bin = { r:0,g:0,b:0,count:0 }; histogram.set(key, bin); }
  bin.r += r; bin.g += g; bin.b += b; bin.count++;
}
const samples = [...histogram.values()].map(s => ({r:s.r/s.count,g:s.g/s.count,b:s.b/s.count,count:s.count}));
let boxes = [samples];
while (boxes.length < 84) {
  let splitIndex = -1, best = -1, axis = 'r';
  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i]; if (box.length < 2) continue;
    for (const channel of ['r','g','b']) {
      const values = box.map(s=>s[channel]);
      const range = Math.max(...values) - Math.min(...values);
      const weight = box.reduce((n,s)=>n+s.count,0);
      const score = range * Math.sqrt(weight);
      if (score > best) { best=score;splitIndex=i;axis=channel; }
    }
  }
  if (splitIndex < 0) break;
  const box = boxes[splitIndex].sort((a,b)=>a[axis]-b[axis]);
  const halfway = box.reduce((n,s)=>n+s.count,0)/2;
  let weight=0, cut=1;
  for (let i=0;i<box.length-1;i++) {weight+=box[i].count;if(weight>=halfway){cut=i+1;break;}}
  boxes.splice(splitIndex,1,box.slice(0,cut),box.slice(cut));
}
const palette = boxes.map(box=>{
  const weight=box.reduce((n,s)=>n+s.count,0);
  return ['r','g','b'].map(channel=>Math.round(box.reduce((n,s)=>n+s[channel]*s.count,0)/weight));
});
const lookup = new Map();
function nearest(r,g,b) {
  const key=(r>>2)*4096+(g>>2)*64+(b>>2);
  if (lookup.has(key)) return lookup.get(key);
  let best=0,distance=Infinity;
  for(let i=0;i<palette.length;i++) {
    const c=palette[i],d=(r-c[0])**2+(g-c[1])**2+(b-c[2])**2;
    if(d<distance){distance=d;best=i;}
  }
  lookup.set(key,best);return best;
}
const labels = new Int16Array(size*size).fill(-1);
const targetSamples = palette.map(()=>[0,0,0,0]);
let error=0,count=0;
for(let i=0;i<labels.length;i++) if(groups[i]>=0){
  const o=i*4,c=nearest(data[o],data[o+1],data[o+2]);labels[i]=groups[i]*palette.length+c;
  error+=(data[o]-palette[c][0])**2+(data[o+1]-palette[c][1])**2+(data[o+2]-palette[c][2])**2;count++;
  if(groups[i]!==1 && data[o]>data[o+1]+9 && target[o]>target[o+1]+5 && data[o]>135 && target[o]>135){
    const sample=targetSamples[c];sample[0]+=target[o];sample[1]+=target[o+1];sample[2]+=target[o+2];sample[3]++;
  }
}
const palePalette=palette.map((color,i)=>targetSamples[i][3]>30?targetSamples[i].slice(0,3).map(c=>Math.round(c/targetSamples[i][3])):color);
const boundaries = new Map();
function edge(label,ax,ay,bx,by,dir){
  let map=boundaries.get(label);if(!map){map=new Map();boundaries.set(label,map);}
  const start=ay*(size+1)+ax,end=by*(size+1)+bx;
  const edges=map.get(start)??[];edges.push([end,dir]);map.set(start,edges);
}
for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=y*size+x,label=labels[i];if(label<0)continue;
  if(y===0||labels[i-size]!==label)edge(label,x,y,x+1,y,0);
  if(x===size-1||labels[i+1]!==label)edge(label,x+1,y,x+1,y+1,1);
  if(y===size-1||labels[i+size]!==label)edge(label,x+1,y+1,x,y+1,2);
  if(x===0||labels[i-1]!==label)edge(label,x,y+1,x,y,3);
}
// Solid group silhouettes seal subpixel quantization gaps. They are vector
// outlines too, so facial deformation cannot expose a checkerboard or halo.
for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=y*size+x,group=groups[i];if(group<0)continue;
  const label=1000+group;
  if(y===0||groups[i-size]!==group)edge(label,x,y,x+1,y,0);
  if(x===size-1||groups[i+1]!==group)edge(label,x+1,y,x+1,y+1,1);
  if(y===size-1||groups[i+size]!==group)edge(label,x+1,y+1,x,y+1,2);
  if(x===0||groups[i-1]!==group)edge(label,x,y+1,x,y,3);
}
function simplify(points,tolerance=0.45){
  if(points.length<=3)return points;
  const a=points[0],b=points.at(-1);let max=0,at=0;
  for(let i=1;i<points.length-1;i++){
    const p=points[i],dx=b[0]-a[0],dy=b[1]-a[1];
    const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));
    const d=(p[0]-a[0]-t*dx)**2+(p[1]-a[1]-t*dy)**2;
    if(d>max){max=d;at=i;}
  }
  return max>tolerance*tolerance?[...simplify(points.slice(0,at+1),tolerance).slice(0,-1),...simplify(points.slice(at),tolerance)]:[a,b];
}
const contours=[],silhouettes=[];let pointsTotal=0;
for(const [label,map] of boundaries){
  const loops=[];
  while(map.size){
    const start=map.keys().next().value;let cursor=start,direction=0;const points=[];
    do {
      const x=cursor%(size+1),y=Math.floor(cursor/(size+1));points.push([x,y]);
      const candidates=map.get(cursor);if(!candidates)throw new Error('Open vector contour');
      let selected=0;
      if(candidates.length>1){
        const preference=[(direction+1)%4,direction,(direction+3)%4,(direction+2)%4];
        selected=candidates.map((e,i)=>[preference.indexOf(e[1]),i]).sort((a,b)=>a[0]-b[0])[0][1];
      }
      const [next,dir]=candidates.splice(selected,1)[0];if(!candidates.length)map.delete(cursor);cursor=next;direction=dir;
    } while(cursor!==start);
    if(points.length<4)continue;
    let area=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];area+=a[0]*b[1]-b[0]*a[1];}
    if(label>=1000&&area<=0)continue;
    if(Math.abs(area)<1)continue;
    let far=1;for(let i=2;i<points.length;i++)if((points[i][0]-points[0][0])**2+(points[i][1]-points[0][1])**2>(points[far][0]-points[0][0])**2+(points[far][1]-points[0][1])**2)far=i;
    const loop=[...simplify(points.slice(0,far+1)).slice(0,-1),...simplify([...points.slice(far),points[0]]).slice(0,-1)];
    if(loop.length>=3){loops.push(loop.flat());pointsTotal+=loop.length;}
  }
  if(label>=1000)silhouettes.push({group:label-1000,loops});
  else contours.push({group:Math.floor(label/palette.length),color:label%palette.length,loops});
}
const output={schema:1,size,referenceSize,palette,palePalette,contours,silhouettes,sourceHashes:[sourcePath,targetPath].map(path=>createHash('sha256').update(readFileSync(path)).digest('hex'))};
writeFileSync('lib/avatar-reference.json',JSON.stringify(output));
console.log(JSON.stringify({colors:palette.length,contours:contours.reduce((n,c)=>n+c.loops.length,0),points:pointsTotal,rgbRMSE:Math.sqrt(error/count/3),bytes:JSON.stringify(output).length}));
