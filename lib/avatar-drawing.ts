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
  const headScale=graduation?body.headScale*1.08:body.headScale;
  const pose={scale:headScale,x:graduation?256-256*headScale:body.headOffset[0],y:graduation?body.headOffset[1]-7:body.headOffset[1]};
  const traced=referenceHead(face,hair).map(path=>({...path,pose}));
  const paths:PaintPath[]=[...traced.filter(path=>path.group==='hair-back'),...referenceBody(look,face)];
  const p=(d:string,fill:string,stroke='none',width=0,head=false)=>paths.push({d,fill,stroke,width,group:'outfit',...(head?{pose}:{})});
  if(graduation){
    const skin=mix('#f7d8b1',face.skin==='deep'?'#b48c67':'#ecdfd0',featureValue(face,'skin'));
    // The graduation model is drawn in the same 512 x 1280 character space as
    // the editable face. Curved shoulders, articulated sleeves and long folds
    // replace the old flat two-polygon overlay, keeping the silhouette human.
    p('M 220 184 Q 256 207 292 184 L 294 254 Q 256 275 218 254 Z',skin,'#30241e',1.7);
    p('M 146 275 Q 160 251 205 238 L 228 230 L 256 293 L 284 230 L 307 238 Q 352 251 366 275 Q 379 309 383 362 L 412 641 Q 419 690 389 721 Q 369 742 347 715 L 372 1118 Q 326 1154 256 1155 Q 186 1154 140 1118 L 165 715 Q 143 742 123 721 Q 93 690 100 641 L 129 362 Q 133 309 146 275 Z','#24262c','#17191f',3);
    p('M 149 293 Q 126 357 114 614 Q 110 672 139 707 Q 151 720 166 704 L 190 650 L 188 310 Q 169 297 149 293 Z','#2e3037','#191b20',2.1);
    p('M 363 293 Q 386 357 398 614 Q 402 672 373 707 Q 361 720 346 704 L 322 650 L 324 310 Q 343 297 363 293 Z','#2a2c32','#191b20',2.1);
    p('M 187 301 Q 212 280 232 267 L 256 305 L 280 267 Q 300 280 325 301 L 326 520 L 346 1115 Q 307 1143 256 1143 Q 205 1143 166 1115 L 186 520 Z','#25272d','#181a20',1.6);
    // Satin collar: a restrained ivory V instead of a bright block running
    // through the whole torso.
    p('M 184 259 L 218 230 L 256 286 L 238 312 L 195 274 Z','#f0eee9','#202228',2);
    p('M 328 259 L 294 230 L 256 286 L 274 312 L 317 274 Z','#e7e5e0','#202228',2);
    p('M 218 230 L 256 268 L 294 230 L 306 239 L 256 302 L 206 239 Z','#17191e','#202228',1.5);
    // Hand-drawn robe folds keep the flat-paint treatment while giving the
    // garment the same line density as the supplied character art.
    p('M 187 342 Q 203 372 211 501 M 214 319 Q 225 397 224 1127 M 256 309 L 256 1140 M 298 319 Q 287 397 288 1127 M 325 342 Q 309 372 301 501 M 168 713 Q 203 739 235 744 M 344 713 Q 309 739 277 744','none','#15171c',2);
    p('M 153 339 Q 134 463 132 623 M 359 339 Q 378 463 380 623 M 199 731 Q 183 925 183 1117 M 313 731 Q 329 925 329 1117','none','#3a3d45',2.4);
    // Diploma and hands are painted into the same canvas so the pose reads as
    // one illustration rather than a head placed over a costume sticker.
    p('M 185 521 L 319 504 L 327 654 L 195 670 Z','#f4f0e7','#2b2a29',2.4);
    p('M 194 532 L 310 518 L 317 641 L 204 654 Z','none','#c2a35c',2);
    p('M 244 579 A 14 14 0 1 0 272 579 A 14 14 0 1 0 244 579','#c2a35c','#8f7135',1.2);
    p('M 255 569 L 263 576 L 260 588 L 250 590 L 244 581 L 247 572 Z','none','#f4f0e7',1.3);
    p('M 179 548 Q 168 553 171 573 L 181 617 Q 186 637 204 638 Q 216 637 217 626 L 211 616 L 202 608 L 197 565 Q 191 547 179 548 Z',skin,'#30241e',2);
    p('M 333 543 Q 344 549 341 570 L 331 614 Q 326 634 308 635 Q 296 634 295 623 L 301 613 L 310 605 L 315 562 Q 321 542 333 543 Z',skin,'#30241e',2);
    p('M 181 581 Q 190 600 207 611 M 331 578 Q 322 597 305 608','none','#9c7158',1.15);
    // Ankles and shoes complete the full-body proportion below the hem.
    p('M 216 1117 L 247 1117 L 245 1217 Q 232 1234 216 1217 Z',skin,'#30241e',1.7);
    p('M 265 1117 L 296 1117 L 296 1217 Q 280 1234 267 1217 Z',skin,'#30241e',1.7);
    p('M 208 1210 Q 224 1200 245 1211 L 249 1231 Q 238 1250 202 1250 Q 191 1240 208 1210 Z','#202126','#111318',2.2);
    p('M 267 1211 Q 288 1200 304 1210 Q 321 1240 310 1250 Q 274 1250 263 1231 Z','#202126','#111318',2.2);
  }
  for(const layer of ['scalp-base','face','jewelry','hair-front'])paths.push(...traced.filter(path=>path.group===layer));
  if(graduation){
    p('M 182 59 L 184 35 Q 256 3 328 35 L 330 59 L 322 104 Q 256 76 190 104 Z','#22242a','#111318',2,true);
    p('M 156 42 L 256 5 L 356 42 L 256 82 Z','#292b31','#111318',2.3,true);
    p('M 256 6 L 256 81 M 170 43 L 256 61 L 342 43','none','#3b3e46',1.3,true);
    p('M 337 39 Q 345 76 341 116','none','#c5a55a',2.4,true);
    p('M 335 111 L 347 111 L 344 145 L 338 145 Z','#c5a55a','#6f582d',1,true);
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
