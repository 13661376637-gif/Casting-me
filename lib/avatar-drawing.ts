import type { AvatarHair, AvatarLook, FaceSelections } from './avatar-model';
import reference from './avatar-reference.json' with { type: 'json' };
import bodies from './avatar-bodies.json' with { type: 'json' };

// One coordinate system for every pose, hairstyle, facial feature and garment.
// No raster image is loaded, clipped or painted by the protagonist renderer.
export type PaintPath = { d: string; fill: string; stroke: string; width: number; group: string; pose?: {scale:number;x:number;y:number} };
export type CharacterDrawing = { paths: PaintPath[]; head: { x: number; y: number }; headScale:number };
export type CharacterDrawingOptions = { face: FaceSelections; hair: AvatarHair; look: AvatarLook; graduation?: boolean };

const mix = (a: string, b: string, t: number) => {
  const channels = [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t));
  return `rgb(${channels.join(',')})`;
};

const referenceCache = new Map<string, PaintPath[]>();
const bodyCache = new Map<string, PaintPath[]>();
const compiledPaths = new WeakMap<PaintPath, Map<typeof Path2D, Path2D>>();
const featureValue = (face: FaceSelections, key: string) => {
  const defaults: Record<string,string> = {eyes:'natural',cheekbones:'soft',nose:'defined',skin:'original',jaw:'oval'};
  const amount = face.adjustments?.[key as 'eyes'];
  return typeof amount === 'number' && Number.isFinite(amount) ? Math.max(0,Math.min(1,amount)) : face[key as 'eyes'] === defaults[key] ? 0 : 1;
};

// Traced closed contours preserve the supplied drawing's actual hair strands,
// eyelids, irises and painted tones. Every vertex remains editable; there is no
// bitmap, replacement portrait, texture upload, or drawImage call at runtime.
function referenceHead(face: FaceSelections, hair: AvatarHair): PaintPath[] {
  const eyes=featureValue(face,'eyes'), cheeks=featureValue(face,'cheekbones'), nose=featureValue(face,'nose'), jaw=featureValue(face,'jaw'), tone=featureValue(face,'skin');
  const key=JSON.stringify([eyes,cheeks,nose,jaw,tone,face.skin,hair]);
  const cached=referenceCache.get(key);if(cached)return cached;
  const scale=0.245, grid=reference.referenceSize/reference.size;
  const field=(x:number,y:number,cx:number,cy:number,rx:number,ry:number)=>Math.max(0,1-((x-cx)/rx)**2-((y-cy)/ry)**2)**2;
  const transform=(gx:number,gy:number,group:number)=>{
    let x=gx*grid,y=gy*grid;
    if(group===0){
      const eyeField=field(x,y,520,520,90,95)+field(x,y,738,520,90,95);
      y+=eyes*(538-y)*0.36*eyeField;
      const noseField=field(x,y,627,645,76,90);
      x+=(x-627)*nose*0.23*noseField;y-=nose*4*noseField;
      const cheekField=field(x,y,468,627,65,95)+field(x,y,786,627,65,95);
      x+=Math.sign(x-627)*cheeks*10*cheekField;y-=cheeks*11*cheekField;
      const lower=Math.max(0,Math.min(1,(y-661)/180));
      x+=Math.sign(x-627)*jaw*13*field(x,y,627,743,200,125);
      y+=jaw*8*lower;
    }
    if(group===1){
      if(hair==='bob')y=650+(y-650)*0.44;
      if(hair==='pony'){
        if(x<627)y=650+(y-650)*0.18;
        else {x=833+(x-833)*0.58;y=650+(y-650)*1.3;}
      }
    }
    return [Math.round((256+(x-627)*scale)*100)/100,Math.round((20+(y-48)*scale)*100)/100];
  };
  const groupNames=['face','hair-back','reference-neck','jewelry','hair-front'];
  const paths:PaintPath[]=[];
  const contourPath=(loops:number[][],group:number)=>loops.map(loop=>{
    const points=[];
    for(let i=0;i<loop.length;i+=2){const [x,y]=transform(loop[i],loop[i+1],group);points.push(`${i?'L':'M'}${x} ${y}`);}
    return points.join('')+'Z';
  }).join('');
  // Extend skin underneath the hair, sealing the estimated cutting boundary.
  const scalp=[406,560,394,430,417,300,478,202,627,165,776,202,840,300,860,430,846,560];
  paths.push({d:contourPath([scalp.map(v=>v/grid)],0),fill:mix('#f7d8b1',face.skin==='deep'?'#b48c67':'#ecdfd0',tone),stroke:'none',width:0,group:'scalp-base'});
  for(const shape of reference.silhouettes){
    const fill=shape.group===1||shape.group===4?'#222220':shape.group===3?'#b8b5ad':mix('#f7d8b1',face.skin==='deep'?'#b48c67':'#ecdfd0',tone);
    paths.push({d:contourPath(shape.loops,shape.group),fill,stroke:'none',width:0,group:groupNames[shape.group]});
  }
  const orderedContours=[...reference.contours].sort((a,b)=>reference.palette[b.color].reduce((n,c)=>n+c,0)-reference.palette[a.color].reduce((n,c)=>n+c,0));
  for(const contour of orderedContours){
    const source=reference.palette[contour.color];
    const isSkin=contour.group!==1&&contour.group!==4&&source[0]>source[1]+8&&source[0]>125;
    const target=face.skin==='deep'?source.map((c,i)=>Math.max(0,Math.round(c*[0.73,0.65,0.58][i]))):reference.palePalette[contour.color];
    const rgb=isSkin?source.map((c,i)=>Math.round(c*(1-tone)+target[i]*tone)):source;
    const fill=`rgb(${rgb.join(',')})`;
    paths.push({d:contourPath(contour.loops,contour.group),fill,stroke:fill,width:contour.group===1||contour.group===4?0.28:0.1,group:groupNames[contour.group]});
  }
  referenceCache.set(key,paths);
  if(referenceCache.size>3)referenceCache.delete(referenceCache.keys().next().value!);
  return paths;
}

function referenceBody(look:AvatarLook,face:FaceSelections):PaintPath[]{
  const tone=featureValue(face,'skin'),key=JSON.stringify([look,tone,face.skin]);
  const cached=bodyCache.get(key);if(cached)return cached;
  const body=bodies[look];
  const paths:PaintPath[]=[{d:body.silhouette,fill:'#292827',stroke:'none',width:0,group:'outfit'}];
  for(const shape of body.shapes){
    const rgb=shape.rgb.map((c,i)=>{
      if(!shape.skin)return c;
      const target=face.skin==='deep'?c*[0.73,0.65,0.58][i]:c*[0.97,1.025,1.1][i];
      return Math.round(Math.min(255,c*(1-tone)+target*tone));
    });
    const fill=`rgb(${rgb.join(',')})`;
    paths.push({d:shape.d,fill,stroke:fill,width:0.65,group:shape.skin?'body':'outfit'});
  }
  bodyCache.set(key,paths);
  if(bodyCache.size>8)bodyCache.delete(bodyCache.keys().next().value!);
  return paths;
}

export function buildCharacterDrawing({face,hair,look,graduation=false}:CharacterDrawingOptions):CharacterDrawing{
  const body=bodies[look];
  // A uniform pose preserves the same face while matching the reference neck.
  const pose={scale:body.headScale,x:body.headOffset[0],y:body.headOffset[1]};
  const traced=referenceHead(face,hair).map(path=>({...path,pose}));
  const paths:PaintPath[]=[...traced.filter(path=>path.group==='hair-back'),...referenceBody(look,face)];
  const p=(d:string,fill:string,stroke='none',width=0,head=false)=>paths.push({d,fill,stroke,width,group:'outfit',...(head?{pose}:{})});
  if(graduation){
    p('M 136 238 L 217 212 L 256 282 L 296 212 L 376 238 L 360 704 L 385 1139 Q 254 1170 130 1139 L 154 704 Z','#303440','#292925',2);
    p('M 214 213 L 255 279 L 244 616 L 194 241 Z M 297 213 L 258 279 L 270 616 L 316 241 Z','#c5ab73');
  }
  for(const layer of ['scalp-base','face','jewelry','hair-front'])paths.push(...traced.filter(path=>path.group===layer));
  if(graduation){
    p('M 179 56 L 178 29 L 256 4 L 336 29 L 335 56 Q 255 38 179 56 Z','#303440','#292925',2,true);
    p('M 159 28 L 256 0 L 352 28 L 256 62 Z','#3c404a','#292925',2,true);
    p('M 256 28 L 336 35 L 335 107','none','#c5ab73',2.4,true);
  }
  return {paths,head:{x:256*pose.scale+pose.x,y:132*pose.scale+pose.y},headScale:pose.scale};
}

// The same drawing is projected into a full-body or face camera. The face camera
// is an affine crop of the full model, not another portrait asset.
export function characterCamera(width: number, height: number, portrait: boolean, drawing?:Pick<CharacterDrawing,'head'|'headScale'>) {
  if (portrait) {
    const scale = Math.min(width / 265, height / 310)/(drawing?.headScale??1);
    const head=drawing?.head??{x:256,y:132};
    return { scale, x: width / 2 - head.x * scale, y: height * 0.44 - head.y * scale };
  }
  const scale = Math.min(width / 512, height / 1280);
  return { scale, x: (width - 512 * scale) / 2, y: height - 1280 * scale };
}

export function paintCharacter(context: CanvasRenderingContext2D, drawing: CharacterDrawing, width: number, height: number, portrait: boolean, Path = Path2D) {
  const camera = characterCamera(width, height, portrait,drawing);
  context.clearRect(0, 0, width, height);
  context.save();
  context.translate(camera.x, camera.y);
  context.scale(camera.scale, camera.scale);
  context.lineJoin = 'round';
  context.lineCap = 'round';
  for (const path of drawing.paths) {
    let variants=compiledPaths.get(path);
    if(!variants){variants=new Map();compiledPaths.set(path,variants);}
    let shape=variants.get(Path);
    if(!shape){shape=new Path(path.d);variants.set(Path,shape);}
    if(path.pose){context.save();context.translate(path.pose.x,path.pose.y);context.scale(path.pose.scale,path.pose.scale);}
    if (path.fill !== 'none') { context.fillStyle = path.fill; context.fill(shape); }
    if (path.stroke !== 'none' && path.width > 0) { context.strokeStyle = path.stroke; context.lineWidth = path.width; context.stroke(shape); }
    if(path.pose)context.restore();
  }
  context.restore();
}
