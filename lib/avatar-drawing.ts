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
const HEAD_LOCAL_X = 256;
const HEAD_CHIN_Y = 216;
const HEAD_FOCUS_Y = 132;
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
      // Reshape the jaw between the cheeks and chin while keeping the chin
      // itself fixed. Moving the terminal chin point made customized faces
      // drift away from every body's neck/collar anchor.
      y+=jaw*8*Math.sin(Math.PI*lower);
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
  // Derive the head transform from the body's immutable source chin on every
  // render. This avoids independent per-outfit offsets accumulating drift.
  const headScale=graduation?body.headScale*1.08:body.headScale;
  const bodyChin={x:body.chin[0]*body.scale+body.offset[0],y:body.chin[1]*body.scale+body.offset[1]};
  const pose={
    scale:headScale,
    x:graduation?HEAD_LOCAL_X-HEAD_LOCAL_X*headScale:bodyChin.x-HEAD_LOCAL_X*headScale,
    y:graduation?body.headOffset[1]-7:bodyChin.y-HEAD_CHIN_Y*headScale,
  };
  const traced=referenceHead(face,hair).map(path=>({...path,pose}));
  const paths:PaintPath[]=[...traced.filter(path=>path.group==='hair-back'),...(graduation?[]:referenceBody(look,face))];
  const p=(d:string,fill:string,stroke='none',width=0,head=false)=>paths.push({d,fill,stroke,width,group:'outfit',...(head?{pose}:{})});
  if(graduation){
    const skin=mix('#f7d8b1',face.skin==='deep'?'#b48c67':'#ecdfd0',featureValue(face,'skin'));
    // The academic look has its own full-body construction. It does not sit on
    // top of another outfit, so no shoulder, arm or hem from the default dress
    // can leak around the robe.
    p('M 220 181 Q 256 202 292 181 L 295 256 Q 256 278 217 256 Z',skin,'#352820',1.7);

    // Bell sleeves form a separate rear layer, giving the pose a readable
    // shoulder, elbow and wrist instead of one rectangular outer silhouette.
    p('M 157 276 Q 122 286 103 332 Q 91 432 82 591 L 72 690 Q 69 737 103 766 Q 128 786 151 756 L 190 670 L 193 329 Q 181 292 157 276 Z','#292c35','#151820',2.8);
    p('M 355 276 Q 390 286 409 332 Q 421 432 430 591 L 440 690 Q 443 737 409 766 Q 384 786 361 756 L 322 670 L 319 329 Q 331 292 355 276 Z','#272a33','#151820',2.8);
    p('M 103 349 Q 95 488 92 666 Q 91 720 115 746 M 157 315 Q 146 430 148 707 M 409 349 Q 417 488 420 666 Q 421 720 397 746 M 355 315 Q 366 430 364 707','none','#414550',2.2);
    p('M 83 682 Q 108 714 151 706 L 161 744 Q 126 790 92 757 Q 69 734 83 682 Z','#20232b','#151820',2);
    p('M 429 682 Q 404 714 361 706 L 351 744 Q 386 790 420 757 Q 443 734 429 682 Z','#20232b','#151820',2);

    // Shaped front body: curved shoulder line, a restrained waist and a broad
    // moving hem keep the same tall proportions as the other player outfits.
    p('M 145 282 Q 162 253 207 239 L 224 232 L 256 286 L 288 232 L 305 239 Q 350 253 367 282 Q 373 330 361 397 L 333 640 Q 340 790 378 1160 Q 328 1187 256 1189 Q 184 1187 134 1160 Q 172 790 179 640 L 151 397 Q 139 330 145 282 Z','#252832','#151820',3);
    p('M 184 297 Q 209 270 229 259 L 256 303 L 283 259 Q 303 270 328 297 L 318 612 Q 323 804 350 1158 Q 310 1175 256 1177 Q 202 1175 162 1158 Q 189 804 194 612 Z','#2b2e38','#1a1d25',1.7);
    p('M 145 282 Q 168 268 192 268 L 184 650 Q 171 876 151 1148 M 367 282 Q 344 268 320 268 L 328 650 Q 341 876 361 1148','none','#11141b',1.7);

    // Layered academic hood and V-neck, kept in muted ivory to match the game's
    // flat painted palette rather than reading as a bright yellow sticker.
    p('M 207 239 L 224 226 L 256 280 L 238 310 L 184 259 Z','#eee9df','#20232b',2.2);
    p('M 305 239 L 288 226 L 256 280 L 274 310 L 328 259 Z','#dedbd4','#20232b',2.2);
    p('M 224 226 L 256 260 L 288 226 L 302 238 L 256 299 L 210 238 Z','#1a1d24','#101218',1.6);
    p('M 190 286 Q 214 308 226 347 M 322 286 Q 298 308 286 347 M 256 304 L 256 1169 M 218 338 Q 224 589 209 1129 M 294 338 Q 288 589 303 1129','none','#14171e',2);
    p('M 166 742 Q 205 764 238 767 M 346 742 Q 307 764 274 767 M 181 1135 Q 215 1151 248 1155 M 331 1135 Q 297 1151 264 1155','none','#444852',2.1);

    // The hands hold a proportionate diploma across the torso. Fingers and
    // knuckles remain outlined in the same hand-drawn line weight as the face.
    p('M 184 526 L 322 511 L 330 662 L 193 678 Z','#f2eee5','#302d28',2.6);
    p('M 195 538 L 311 525 L 319 648 L 204 663 Z','none','#b89347',2);
    p('M 244 588 A 14 14 0 1 0 272 588 A 14 14 0 1 0 244 588','#c3a259','#87692f',1.25);
    p('M 255 578 L 264 585 L 261 597 L 251 600 L 243 591 L 247 581 Z','none','#f4f0e7',1.3);
    p('M 177 550 Q 165 556 169 577 L 181 625 Q 187 645 204 644 Q 216 642 219 630 L 210 616 L 201 607 L 196 566 Q 190 548 177 550 Z',skin,'#352820',2);
    p('M 335 546 Q 347 552 343 573 L 331 621 Q 325 641 308 640 Q 296 638 293 626 L 302 612 L 311 603 L 316 562 Q 322 544 335 546 Z',skin,'#352820',2);
    p('M 181 582 Q 188 602 207 615 M 331 579 Q 324 599 305 612 M 187 570 L 192 611 M 325 566 L 320 608','none','#9f7357',1.1);

    // A clean hem, visible ankles and closed shoes finish the silhouette without
    // exposing any part of the unrelated evening-dress body underneath.
    p('M 215 1160 L 246 1160 L 245 1222 Q 232 1235 216 1221 Z',skin,'#352820',1.7);
    p('M 266 1160 L 297 1160 L 296 1221 Q 280 1235 267 1222 Z',skin,'#352820',1.7);
    p('M 205 1212 Q 224 1202 245 1214 L 250 1233 Q 239 1253 200 1253 Q 188 1242 205 1212 Z','#1e2027','#101218',2.3);
    p('M 267 1214 Q 288 1202 307 1212 Q 324 1242 312 1253 Q 273 1253 262 1233 Z','#1e2027','#101218',2.3);
  }
  for(const layer of ['scalp-base','face','jewelry','hair-front'])paths.push(...traced.filter(path=>path.group===layer));
  if(graduation){
    p('M 182 59 L 184 35 Q 256 3 328 35 L 330 59 L 322 104 Q 256 76 190 104 Z','#22242a','#111318',2,true);
    p('M 156 42 L 256 5 L 356 42 L 256 82 Z','#292b31','#111318',2.3,true);
    p('M 256 6 L 256 81 M 170 43 L 256 61 L 342 43','none','#3b3e46',1.3,true);
    p('M 337 39 Q 345 76 341 116','none','#c5a55a',2.4,true);
    p('M 335 111 L 347 111 L 344 145 L 338 145 Z','#c5a55a','#6f582d',1,true);
  }
  return {paths,head:{x:HEAD_LOCAL_X*pose.scale+pose.x,y:HEAD_FOCUS_Y*pose.scale+pose.y},headScale:pose.scale};
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
