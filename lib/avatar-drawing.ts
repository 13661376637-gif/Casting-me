import type { AvatarHair, AvatarLook, FaceSelections } from './avatar-model';
import reference from './avatar-reference.json' with { type: 'json' };
import bodies from './avatar-bodies.json' with { type: 'json' };
type ActionReference = {headScale:number;headOffset:number[];shapes:{d:string;rgb:number[]|null;skin:boolean;group:string;stroke:string;width:number}[]};
let actions:Record<ActionPose,ActionReference>|null=null;
let actionLoad:Promise<void>|null=null;
export function preloadActionDrawings():Promise<void> {
  if(actions)return Promise.resolve();
  if(actionLoad)return actionLoad;
  let timeout:ReturnType<typeof setTimeout>;
  const pending=Promise.race([
    import('./avatar-action-data.mjs').then(module=>{
      const data=module.default;
      for(const pose of ['crossed','guard'] as const){
        if(!data[pose]?.shapes?.length)throw new Error(`Missing action pose: ${pose}`);
      }
      actions=data;
    }),
    new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Action loading timed out')),20000);}),
  ]).finally(()=>{clearTimeout(timeout);if(actionLoad===pending)actionLoad=null;});
  actionLoad=pending;
  return pending;
}

// One coordinate system for every pose, hairstyle, facial feature and garment.
// No raster image is loaded, clipped or painted by the protagonist renderer.
export type PaintPath = { d: string; fill: string; stroke: string; width: number; group: string; clip?: string };
export type ActionPose = 'crossed' | 'guard';
export type CharacterDrawing = { paths: PaintPath[]; head: { x: number; y: number }; headScale:number; actionPose?:ActionPose };
export type CharacterDrawingOptions = { face: FaceSelections; hair: AvatarHair; look: AvatarLook; graduation?: boolean; actionPose?:ActionPose };

const mix = (a: string, b: string, t: number) => {
  const channels = [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t));
  return `rgb(${channels.join(',')})`;
};

const referenceCache = new Map<string, PaintPath[]>();
const bodyCache = new Map<string, PaintPath[]>();
const compiledPaths = new WeakMap<PaintPath, Map<typeof Path2D, Path2D>>();
const compiledClips = new Map<string, Map<typeof Path2D, Path2D>>();
const HEAD_LOCAL_X = 256;
const HEAD_CHIN_Y = 216;
const HEAD_FOCUS_Y = 132;
const coordinatePattern = /([ML])(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g;
const fixedCoordinate = (value:number) => Math.round(value * 1000) / 1000;
const bakeHeadPath = (path:PaintPath, scale:number, x:number, y:number):PaintPath => ({
  ...path,
  // Head contours are converted once into the final 512 × 1280 model space.
  // The renderer therefore never moves the face independently from the body.
  d:path.d.replace(coordinatePattern,(_,command,px,py)=>`${command}${fixedCoordinate(Number(px)*scale+x)} ${fixedCoordinate(Number(py)*scale+y)}`),
  width:fixedCoordinate(path.width*scale),
});
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
      const target=face.skin==='deep'?c*[0.73,0.65,0.58][i]:c*[236/247,223/216,208/177][i];
      return Math.round(Math.min(255,c*(1-tone)+target*tone));
    });
    const fill=`rgb(${rgb.join(',')})`;
    paths.push({d:shape.d,fill,stroke:fill,width:0.65,group:shape.skin?'body':'outfit'});
  }
  bodyCache.set(key,paths);
  if(bodyCache.size>8)bodyCache.delete(bodyCache.keys().next().value!);
  return paths;
}

// The qipao reference contains its original lower jaw above the collar. Replace
// that whole skin opening, including the old ink edge, with the editable head's
// own neck. These source-space landmarks follow the INSIDE of the red collar;
// they are not another head offset and never depend on facial parameters.
function qipaoNeck(traced:PaintPath[],face:FaceSelections):PaintPath[] {
  const body=bodies.qipao;
  const sourcePath='M377 228L500 228L488 269L480 279L451 293L432 305L424 320L415 342L411 325L405 308L397 294L391 284Z';
  const clip=sourcePath.replace(coordinatePattern,(_,command,x,y)=>`${command}${fixedCoordinate(Number(x)*body.scale+body.offset[0])} ${fixedCoordinate(Number(y)*body.scale+body.offset[1])}`);
  const bridge='M404 303L449 293L432 320L415 344L408 325Z'.replace(coordinatePattern,(_,command,x,y)=>`${command}${fixedCoordinate(Number(x)*body.scale+body.offset[0])} ${fixedCoordinate(Number(y)*body.scale+body.offset[1])}`);
  return [
    {d:bridge,fill:mix('#f7d8b1',face.skin==='deep'?'#b48c67':'#ecdfd0',featureValue(face,'skin')),stroke:'none',width:0,group:'neck',clip},
    ...traced.filter(path=>path.group==='reference-neck').map(path=>({...path,group:'neck',clip})),
  ];
}

function qipaoGarment(face:FaceSelections):PaintPath[] {
  const body=bodies.qipao;
  // Retain the garment below its real inner collar, excluding every part of
  // the source jaw and neck. The new neck is painted underneath this edge.
  const boundary='M0 260L385 260L391 284L397 294L405 308L411 325L415 342L424 320L432 305L451 293L480 279L488 269L492 260L882 260L882 2000L0 2000Z';
  const clip=boundary.replace(coordinatePattern,(_,command,x,y)=>`${command}${fixedCoordinate(Number(x)*body.scale+body.offset[0])} ${fixedCoordinate(Number(y)*body.scale+body.offset[1])}`);
  return referenceBody('qipao',face).map(path=>({...path,clip}));
}

// The graduation costume is drawn in the same 512 × 1280 model space as the
// regular wardrobe. Its front-facing stance, neck anchor, shoulder width and
// limb lengths therefore match the natural look instead of importing a second
// full-body pose with a different set of proportions.
function graduationBody(face: FaceSelections): PaintPath[] {
  const tone=featureValue(face,'skin');
  const skin=mix('#f7d8b1',face.skin==='deep'?'#b48c67':'#ecdfd0',tone);
  const skinShadow=mix('#d9a980',face.skin==='deep'?'#89654c':'#d8c7b6',tone);
  const ink='#151820', robe='#232630', robeDark='#191c24', robeLight='#30343f';
  const white='#f3f0e9', gold='#bf9648';
  return [
    // Shoes and lower legs sit on the same baseline as the regular model.
    {d:'M207 1154C207 1128 215 1105 223 1084L251 1084L250 1191C239 1210 218 1222 189 1220C177 1214 182 1201 194 1191C202 1183 207 1170 207 1154Z',fill:skin,stroke:ink,width:2.2,group:'body'},
    {d:'M262 1084L290 1084C298 1111 303 1136 303 1157C303 1174 311 1188 320 1198C330 1211 321 1222 306 1224C279 1223 259 1211 251 1191Z',fill:skin,stroke:ink,width:2.2,group:'body'},
    {d:'M181 1216C197 1210 221 1204 249 1187L252 1210C236 1235 205 1247 178 1239C168 1234 170 1223 181 1216Z',fill:ink,stroke:'#0e1015',width:2.4,group:'outfit'},
    {d:'M252 1210L255 1189C278 1204 303 1211 322 1219C333 1226 331 1237 321 1242C293 1248 268 1237 252 1210Z',fill:ink,stroke:'#0e1015',width:2.4,group:'outfit'},

    // One continuous robe silhouette establishes the same slim, upright body
    // proportion as the natural black dress while allowing academic sleeves.
    {d:'M211 196C184 201 154 211 132 226C116 261 106 326 98 400C91 461 82 529 88 596C98 625 121 642 145 636L163 590L151 718C140 847 125 1017 113 1164C151 1184 193 1195 256 1196C319 1195 361 1184 399 1164C387 1017 372 847 361 718L349 590L367 636C391 642 414 625 424 596C430 529 421 461 414 400C406 326 396 261 380 226C358 211 328 201 301 196L283 187L229 187Z',fill:robe,stroke:ink,width:2.2,group:'outfit'},
    {d:'M228 158C235 171 242 180 256 183C270 180 277 171 284 158L287 224C278 233 268 238 256 238C244 238 234 233 225 224Z',fill:skin,stroke:ink,width:1.4,group:'body'},
    {d:'M132 226C116 296 111 390 108 493C107 543 108 584 117 611C126 623 136 628 145 627L170 556L178 303Z',fill:robeDark,stroke:ink,width:1.5,group:'outfit'},
    {d:'M380 226C396 296 401 390 404 493C405 543 404 584 395 611C386 623 376 628 367 627L342 556L334 303Z',fill:robeDark,stroke:ink,width:1.5,group:'outfit'},
    {d:'M160 245C184 222 210 211 229 205L256 270L283 205C302 211 328 222 352 245L326 309L302 284L289 558L223 558L210 284L186 309Z',fill:robeLight,stroke:ink,width:1.5,group:'outfit'},
    {d:'M225 210L256 242L287 210L312 228L277 286L256 302L235 286L200 228Z',fill:white,stroke:ink,width:1.7,group:'outfit'},
    {d:'M225 210L256 242L287 210L276 257L256 282L236 257Z',fill:robeDark,stroke:ink,width:1.3,group:'outfit'},

    // Long vertical folds preserve the restrained flat-painted game style.
    {d:'M178 594C187 756 186 981 173 1168C190 1178 207 1184 225 1187L232 596Z',fill:robeDark,stroke:'none',width:0,group:'outfit'},
    {d:'M334 594C325 756 326 981 339 1168C322 1178 305 1184 287 1187L280 596Z',fill:robeDark,stroke:'none',width:0,group:'outfit'},
    {d:'M244 592L249 1189L266 1189L268 592Z',fill:'#171a21',stroke:'none',width:0,group:'outfit'},
    {d:'M202 594C214 783 211 1014 203 1180',fill:'none',stroke:'#3a3e49',width:1.6,group:'outfit'},
    {d:'M310 594C298 783 301 1014 309 1180',fill:'none',stroke:'#3a3e49',width:1.6,group:'outfit'},
    {d:'M151 718C181 734 214 741 256 741C298 741 331 734 361 718',fill:'none',stroke:'#12151b',width:1.5,group:'outfit'},

    // Diploma first, then hands in front so the grip reads naturally.
    {d:'M169 496L338 488L344 637L176 648Z',fill:'#d7c49a',stroke:ink,width:1.9,group:'outfit'},
    {d:'M177 504L330 497L336 628L184 638Z',fill:'#faf7ef',stroke:gold,width:1.5,group:'outfit'},
    {d:'M256 551C268 551 277 560 277 572C277 584 268 593 256 593C244 593 235 584 235 572C235 560 244 551 256 551Z',fill:'#d0aa5a',stroke:gold,width:1.6,group:'outfit'},
    {d:'M256 559L260 567L269 568L262 574L264 584L256 579L248 584L250 574L243 568L252 567Z',fill:'#f0dfad',stroke:'none',width:0,group:'outfit'},
    {d:'M147.7 524.9C154.2 515.9 164.1 515.1 174.7 520.8L190.3 538L200.1 552.8L195.2 564.3L186.2 563.4L176.4 553.6L181.3 567.5L177.2 574.1L168.2 570.8L158.3 559.3L164.9 573.3L160 579L150.9 573.3L138.6 553.6C135.4 542.9 139.5 532.3 147.7 524.9Z',fill:skin,stroke:ink,width:1.6,group:'body'},
    {d:'M364.3 520C354.4 515.1 345.4 517.5 337.2 524.9L322.5 540.5L311.8 555.2L316.7 565.9L325.7 564.3L335.6 554.4L330.7 570L335.6 575.7L344.6 571.6L354.4 560.2L347.9 574.1L352.8 579.8L362.6 573.3L374.1 552C376.6 538 372.5 526.5 364.3 520Z',fill:skin,stroke:ink,width:1.6,group:'body'},
    {d:'M154.2 531.5C161.6 537.2 169 543.8 176.4 553.6M162.4 565.9L171.4 571.6',fill:'none',stroke:skinShadow,width:1.5,group:'body'},
    {d:'M357.7 530.6C350.3 537.2 343 545.4 335.6 554.4M349.5 566.7L340.5 573.3',fill:'none',stroke:skinShadow,width:1.5,group:'body'},

    // Small seams give the robe the same hand-drawn contour density as the
    // other wardrobe states without gradients or glossy highlights.
    {d:'M178 303C166 394 159 479 163 590M334 303C346 394 353 479 349 590M223 558C211 624 205 677 204 724M289 558C301 624 307 677 308 724',fill:'none',stroke:'#3b3f4a',width:1.7,group:'outfit'},
  ];
}

function graduationCap(): PaintPath[] {
  return [
    {d:'M198 40C211 24 230 17 256 17C282 17 301 24 314 40L311 77C293 86 275 91 256 91C237 91 219 86 201 77Z',fill:'#20232c',stroke:'#11141a',width:1.8,group:'graduation-cap'},
    {d:'M256 -12L371 31L256 79L141 31Z',fill:'#292c35',stroke:'#11141a',width:2.2,group:'graduation-cap'},
    {d:'M256 -6L350 29L256 68L162 29Z',fill:'#242730',stroke:'#3a3e49',width:1.1,group:'graduation-cap'},
    {d:'M256 -12L256 79M371 31L350 38',fill:'none',stroke:'#14171d',width:1.2,group:'graduation-cap'},
    {d:'M350 30C351 59 352 88 350 119',fill:'none',stroke:'#c39a4a',width:1.7,group:'graduation-cap'},
    {d:'M345 117L355 117L358 157L342 157Z',fill:'#c39a4a',stroke:'#6f5428',width:1.1,group:'graduation-cap'},
  ];
}

function actionDrawing(face:FaceSelections,pose:ActionPose):CharacterDrawing {
  if(!actions)throw new Error('Preload action contours before drawing.');
  const action=actions[pose];
  const tone=featureValue(face,'skin');
  const headScale=action.headScale,[headX,headY]=action.headOffset;
  // Facial control points remain the same as the editor. They are painted
  // directly with the new full-body curves; no old head or body sits beneath.
  const traced=referenceHead(face,'original').filter(path=>path.group!=='hair-back'&&path.group!=='reference-neck')
    .map(path=>bakeHeadPath(path,headScale,headX,headY));
  const shapes:PaintPath[]=action.shapes.map(shape=>{
    const rgb=shape.rgb?.map((c,i)=>shape.skin?Math.round(Math.min(255,c*(1-tone)+c*(face.skin==='deep'?[.73,.65,.58][i]:[236/247,223/216,208/177][i])*tone)):c);
    return {d:shape.d,fill:rgb?`rgb(${rgb.join(',')})`:'none',stroke:shape.stroke,width:shape.width,group:shape.group};
  });
  const paths=[...shapes];
  for(const group of ['scalp-base','face','jewelry','hair-front'])paths.push(...traced.filter(path=>path.group===group));
  return {paths,head:{x:HEAD_LOCAL_X*headScale+headX,y:HEAD_FOCUS_Y*headScale+headY},headScale,actionPose:pose};
}

export function buildCharacterDrawing({face,hair,look,graduation=false,actionPose}:CharacterDrawingOptions):CharacterDrawing{
  if(actionPose)return actionDrawing(face,actionPose);
  const body=graduation?bodies.natural:bodies[look];
  // Derive the head transform from the body's immutable source chin on every
  // render. This avoids independent per-outfit offsets accumulating drift.
  const headScale=body.headScale;
  const bodyChin={x:body.chin[0]*body.scale+body.offset[0],y:body.chin[1]*body.scale+body.offset[1]};
  const headX=bodyChin.x-HEAD_LOCAL_X*headScale;
  const headY=bodyChin.y-HEAD_CHIN_Y*headScale;
  const traced=referenceHead(face,hair).map(path=>bakeHeadPath(path,headScale,headX,headY));
  if(graduation){
    const paths:PaintPath[]=[...traced.filter(path=>path.group==='hair-back'),...graduationBody(face)];
    for(const layer of ['scalp-base','face','jewelry','hair-front'])paths.push(...traced.filter(path=>path.group===layer));
    paths.push(...graduationCap());
    return {paths,head:{x:bodyChin.x,y:HEAD_FOCUS_Y*headScale+headY},headScale};
  }
  const paths:PaintPath[]=[...traced.filter(path=>path.group==='hair-back')];
  if(look==='qipao')paths.push(...qipaoNeck(traced,face),...qipaoGarment(face));
  else paths.push(...referenceBody(look,face));
  for(const layer of ['scalp-base','face','jewelry','hair-front'])paths.push(...traced.filter(path=>path.group===layer));
  return {paths,head:{x:bodyChin.x,y:HEAD_FOCUS_Y*headScale+headY},headScale};
}

// The same drawing is projected into a full-body or face camera. The face camera
// is an affine crop of the full model, not another portrait asset.
export function characterCamera(width: number, height: number, portrait: boolean, drawing?:Pick<CharacterDrawing,'head'|'headScale'|'actionPose'>) {
  if (portrait) {
    // Keep the editor centered on the face while leaving enough upper torso in
    // frame for the head, neck and shoulders to read as one proportioned model.
    const scale = Math.min(width / 300, height / 350)/(drawing?.headScale??1);
    const head=drawing?.head??{x:256,y:132};
    return { scale, x: width / 2 - head.x * scale, y: height * 0.4 - head.y * scale };
  }
  const scale = Math.min(width / (drawing?.actionPose?1050:512), height / (drawing?.actionPose?1600:1280));
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
    if(path.clip){
      let clips=compiledClips.get(path.clip);
      if(!clips){clips=new Map();compiledClips.set(path.clip,clips);}
      let clip=clips.get(Path);
      if(!clip){clip=new Path(path.clip);clips.set(Path,clip);}
      context.save();context.clip(clip);
    }
    if (path.fill !== 'none') { context.fillStyle = path.fill; context.fill(shape); }
    if (path.stroke !== 'none' && path.width > 0) { context.strokeStyle = path.stroke; context.lineWidth = path.width; context.stroke(shape); }
    if(path.clip)context.restore();
  }
  context.restore();
}
