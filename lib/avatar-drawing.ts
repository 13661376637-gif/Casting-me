import type { AvatarHair, AvatarLook, FaceSelections } from './avatar-model';
import reference from './avatar-reference.json' with { type: 'json' };

// One coordinate system for every pose, hairstyle, facial feature and garment.
// No raster image is loaded, clipped or painted by the protagonist renderer.
export type PaintPath = { d: string; fill: string; stroke: string; width: number; group: string };
export type CharacterDrawing = { paths: PaintPath[]; head: { x: number; y: number }; };
export type CharacterDrawingOptions = { face: FaceSelections; hair: AvatarHair; look: AvatarLook; graduation?: boolean };

const mix = (a: string, b: string, t: number) => {
  const channels = [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t));
  return `rgb(${channels.join(',')})`;
};

const referenceCache = new Map<string, PaintPath[]>();
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
    paths.push({d:contourPath(contour.loops,contour.group),fill,stroke:fill,width:0.1,group:groupNames[contour.group]});
  }
  referenceCache.set(key,paths);
  if(referenceCache.size>3)referenceCache.delete(referenceCache.keys().next().value!);
  return paths;
}

export function buildCharacterDrawing({ face, hair, look, graduation = false }: CharacterDrawingOptions): CharacterDrawing {
  const paths: PaintPath[] = [];
  const traced=referenceHead(face,hair);
  const ink = '#292925';
  const skinAmount = featureValue(face,'skin');
  const skin = mix('#f7d8b1', face.skin === 'deep' ? '#b28d67' : '#eee0d2', skinAmount);
  const shade = mix('#d8ab81', face.skin === 'deep' ? '#947052' : '#cdb5a1', skinAmount);
  const skinLine = '#986f58';
  let group = 'body';
  const p = (d: string, fill = 'none', stroke = ink, width = 2.1) => paths.push({ d, fill, stroke, width, group });
  const ellipse = (x: number, y: number, rx: number, ry: number, fill: string, stroke = ink, width = 1.6) => p(`M ${x - rx} ${y} a ${rx} ${ry} 0 1 0 ${rx * 2} 0 a ${rx} ${ry} 0 1 0 ${-rx * 2} 0`, fill, stroke, width);

  paths.push(...traced.filter(path=>path.group==='hair-back'));

  group = 'body';
  // Fixed skeleton and matching skin palette for head, neck, arms, hands and legs.
  p('M 222 188 L 218 235 Q 208 249 181 255 L 143 266 Q 126 276 129 318 L 146 451 L 365 453 L 383 311 Q 389 276 366 266 L 329 255 Q 302 248 294 234 L 290 188 Z', skin);
  p('M 222 190 Q 255 219 290 190 L 291 224 Q 267 248 228 225 Z', shade, 'none');
  p('M 178 270 Q 207 262 239 282 M 276 282 Q 308 262 337 270', 'none', skinLine, 1.5);
  p('M 136 279 C 121 304 128 357 121 403 L 104 526 L 93 640 Q 79 674 92 698 L 110 713 Q 121 711 115 694 L 111 674 L 118 657 Q 117 704 128 699 L 138 647 L 143 537 L 165 418 L 165 309 Z', skin);
  p('M 133 337 L 132 422 L 115 530 L 106 638 L 117 653 L 126 637 L 129 531 L 151 419 L 155 334 Z', shade, 'none');
  p('M 98 652 L 96 680 L 107 699 M 105 650 L 103 677 L 113 697 M 115 656 L 113 673', 'none', skinLine, 1.4);
  p('M 376 279 C 391 304 384 356 391 403 L 408 526 L 419 640 Q 433 674 420 698 L 402 713 Q 391 711 397 694 L 401 674 L 394 657 Q 395 704 384 699 L 374 647 L 369 537 L 347 418 L 347 309 Z', skin);
  p('M 379 337 L 380 422 L 397 530 L 406 638 L 395 653 L 386 637 L 383 531 L 361 419 L 357 334 Z', shade, 'none');
  p('M 414 652 L 416 680 L 405 699 M 407 650 L 409 677 L 399 697 M 397 656 L 399 673', 'none', skinLine, 1.4);
  p('M 212 599 L 306 598 L 318 853 L 303 1015 L 303 1190 L 330 1237 Q 304 1266 268 1249 L 269 1209 L 266 1028 L 255 874 L 245 1053 L 244 1210 L 222 1249 L 185 1247 L 199 1203 L 198 1032 L 187 836 Z', skin);
  p('M 291 655 L 304 854 L 288 1012 L 291 1197 L 275 1223 L 271 1019 L 270 860 Z', shade, 'none');
  p('M 189 1220 Q 219 1235 242 1215 L 246 1247 Q 216 1269 177 1253 Z', '#272b29');
  p('M 270 1222 Q 293 1235 311 1218 L 332 1242 Q 315 1264 269 1255 Z', '#252925');
  p('M 271 1190 Q 291 1201 303 1190 L 304 1201 Q 287 1210 270 1201 Z', '#292b28');

  paths.push(...traced.filter(path=>path.group==='reference-neck'));

  group = 'outfit';
  if (look === 'editorial') {
    p('M 159 492 L 354 492 L 370 730 L 389 1211 Q 352 1233 310 1217 L 262 736 L 244 1218 Q 204 1235 168 1215 L 154 709 Z', '#743541');
    p('M 267 593 L 281 770 L 320 1206 L 309 1217 L 262 736 L 241 1207 L 227 1219 L 241 711 Z', '#572b35', 'none');
    p('M 211 262 L 302 262 L 325 473 L 183 473 Z', '#292d2a');
    p('M 218 242 L 163 259 L 137 275 L 130 395 L 101 638 L 135 645 L 166 452 L 159 568 Q 202 590 250 542 L 256 457 Z', '#793946');
    p('M 294 242 L 349 259 L 375 275 L 382 395 L 411 638 L 377 645 L 346 452 L 353 568 Q 305 590 250 542 L 256 457 Z', '#743541');
    p('M 215 248 L 190 308 L 214 317 L 198 337 L 250 441 Z', '#944b55');
    p('M 297 249 L 321 308 L 300 317 L 314 337 L 258 454 Z', '#914650');
    p('M 139 288 L 151 374 L 129 622 M 373 288 L 361 374 L 383 622 M 188 490 L 225 490 L 222 503 L 185 503 Z M 287 490 L 328 490 L 331 503 L 290 503 Z', 'none', '#4b2930', 2);
    ellipse(255, 469, 7, 7, '#34342e');
    p('M 190 687 L 198 1169 M 315 687 L 353 1169', 'none', '#9c545b', 1.4);
  } else if (look === 'qipao') {
    p('M 222 228 Q 251 246 293 228 L 300 255 L 355 270 L 346 393 L 337 463 Q 354 530 350 650 L 376 1247 Q 340 1267 293 1253 L 297 846 L 238 1258 Q 169 1271 119 1245 L 160 647 Q 155 530 175 463 L 165 395 L 156 270 L 215 253 Z', '#292e2b');
    p('M 155 270 L 138 280 L 125 407 L 101 625 L 140 639 L 176 411 Z M 355 270 L 374 280 L 387 407 L 411 625 L 372 639 L 337 411 Z', '#2c302d');
    p('M 102 609 L 143 620 L 138 651 L 97 639 Z M 370 620 L 410 609 L 415 639 L 374 651 Z', '#833039');
    p('M 220 231 Q 221 255 253 265 Q 278 259 295 232 M 254 266 C 232 313 214 340 196 370 L 183 467 Q 177 532 181 606 M 300 805 L 303 1252 M 293 808 L 239 1258', 'none', '#aa3d44', 4);
    p('M 310 325 Q 328 385 312 465 L 295 570 L 307 637 L 324 801 L 305 1249 L 373 1248 L 347 650 Q 352 530 337 463 L 346 393 Z', '#202522', 'none');
    for (const [x, y] of [[250, 278], [227, 325], [200, 373], [185, 434], [181, 489], [181, 551]]) {
      p(`M ${x - 11} ${y} q -10 -10 -14 -1 q 4 10 14 1 L ${x + 11} ${y} q 10 -10 14 -1 q -4 10 -14 1 Z`, '#9c3540', ink, 1.4);
    }
    p('M 316 473 C 292 479 323 501 302 508 C 283 514 315 535 288 546 C 273 553 292 575 279 581 M 300 511 q -18 -21 -20 -3 q 2 15 20 3 M 296 532 q 25 -21 27 -1 q -4 15 -27 1 M 284 555 q -20 -20 -22 -2 q 3 15 22 2', 'none', '#bfa060', 2.5);
    p('M 109 622 q 17 -18 20 7 q -8 12 -16 -1 M 384 627 q 14 -20 19 -1 q -6 15 -15 0', 'none', '#c3a05e', 2);
  } else {
    p('M 160 310 Q 204 319 247 305 L 317 252 L 340 261 L 335 351 Q 342 420 323 468 Q 351 544 342 650 L 351 1018 Q 368 1166 414 1246 Q 369 1273 310 1254 L 294 874 L 243 1258 Q 154 1270 96 1247 Q 141 1192 153 1022 L 163 642 Q 156 532 181 466 Q 161 415 160 310 Z', '#303430');
    p('M 169 345 L 320 273 L 309 242 L 155 332 Z', look === 'premiere' ? '#8b3038' : '#272c29');
    p('M 323 335 Q 306 398 319 465 L 239 537 L 274 562 L 244 598 L 319 553 Q 337 598 329 656 L 334 997 L 367 1246 L 413 1247 Q 371 1190 351 1018 L 342 650 Q 351 544 323 468 Z', '#232925', 'none');
    p('M 179 466 Q 233 485 315 460 L 207 510 L 317 483 L 213 541 L 310 517 L 189 589 L 301 551 M 176 378 Q 238 402 318 373 M 175 410 Q 240 426 319 406 M 195 614 L 174 1038 L 135 1233 M 227 647 L 199 1156 L 181 1250 M 322 737 L 333 1090', 'none', '#171f1b', 1.8);
    p('M 183 492 L 211 490 L 176 643 L 166 1003 L 151 1155 L 161 819 L 167 640 Z', '#41463d', 'none');
  }

  if (graduation) {
    p('M 155 274 L 217 252 L 256 323 L 296 252 L 357 274 L 360 704 L 385 1139 Q 254 1170 130 1139 L 154 704 Z', '#303440');
    p('M 214 253 L 255 319 L 244 656 L 194 281 Z M 297 253 L 258 319 L 270 656 L 316 281 Z', '#c5ab73');
  }

  for(const layer of ['face','jewelry','hair-front']) paths.push(...traced.filter(path=>path.group===layer));

  if (graduation) {
    p('M 179 56 L 178 29 L 256 4 L 336 29 L 335 56 Q 255 38 179 56 Z', '#303440');
    p('M 159 28 L 256 0 L 352 28 L 256 62 Z', '#3c404a');
    p('M 256 28 L 336 35 L 335 107', 'none', '#c5ab73', 2.4);
  }
  return { paths, head: { x: 256, y: 132 } };
}

// The same drawing is projected into a full-body or face camera. The face camera
// is an affine crop of the full model, not another portrait asset.
export function characterCamera(width: number, height: number, portrait: boolean) {
  if (portrait) {
    const scale = Math.min(width / 265, height / 310);
    return { scale, x: width / 2 - 256 * scale, y: height * 0.44 - 132 * scale };
  }
  const scale = Math.min(width / 512, height / 1280);
  return { scale, x: (width - 512 * scale) / 2, y: height - 1280 * scale };
}

export function paintCharacter(context: CanvasRenderingContext2D, drawing: CharacterDrawing, width: number, height: number, portrait: boolean, Path = Path2D) {
  const camera = characterCamera(width, height, portrait);
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
    if (path.fill !== 'none') { context.fillStyle = path.fill; context.fill(shape); }
    if (path.stroke !== 'none' && path.width > 0) { context.strokeStyle = path.stroke; context.lineWidth = path.width; context.stroke(shape); }
  }
  context.restore();
}
