import type { AvatarHair, AvatarLook, FaceSelections } from './avatar-model';

// One coordinate system for every pose, hairstyle, facial feature and garment.
// No raster image is loaded, clipped or painted by the protagonist renderer.
export type PaintPath = { d: string; fill: string; stroke: string; width: number; group: string };
export type CharacterDrawing = { paths: PaintPath[]; head: { x: number; y: number }; };
export type CharacterDrawingOptions = { face: FaceSelections; hair: AvatarHair; look: AvatarLook; graduation?: boolean };

const mix = (a: string, b: string, t: number) => {
  const channels = [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t));
  return `rgb(${channels.join(',')})`;
};

export function buildCharacterDrawing({ face, hair, look, graduation = false }: CharacterDrawingOptions): CharacterDrawing {
  const paths: PaintPath[] = [];
  const ink = '#292925';
  const original: Record<string, string> = { eyes: 'natural', cheekbones: 'soft', nose: 'defined', skin: 'original', jaw: 'oval' };
  const amount = (key: keyof typeof original) => {
    const value = face.adjustments?.[key as keyof NonNullable<FaceSelections['adjustments']>];
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : face[key as 'eyes'] === original[key] ? 0 : 1;
  };
  const eyes = amount('eyes'), cheeks = amount('cheekbones'), nose = amount('nose'), jaw = amount('jaw');
  const skinAmount = amount('skin');
  const skin = mix('#f1d2b4', face.skin === 'deep' ? '#ae8867' : '#f6e4d5', skinAmount);
  const shade = mix('#d7aa89', face.skin === 'deep' ? '#87634f' : '#dfc2ad', skinAmount);
  const skinLine = '#986f58';
  const hairDark = '#252723', hairMid = '#363932', hairLight = '#474940';
  let group = 'body';
  const p = (d: string, fill = 'none', stroke = ink, width = 2.1) => paths.push({ d, fill, stroke, width, group });
  const ellipse = (x: number, y: number, rx: number, ry: number, fill: string, stroke = ink, width = 1.6) => p(`M ${x - rx} ${y} a ${rx} ${ry} 0 1 0 ${rx * 2} 0 a ${rx} ${ry} 0 1 0 ${-rx * 2} 0`, fill, stroke, width);

  group = 'hair-back';
  if (hair === 'pony') {
    p('M 285 49 C 348 37 363 121 337 194 C 327 231 353 262 340 293 C 316 270 305 237 310 198 C 327 122 310 90 285 75 Z', hairDark);
    p('M 330 104 C 345 163 310 211 335 266', 'none', hairLight, 3);
    p('M 226 48 C 205 8 239 -1 270 17 C 302 8 321 24 303 55 Z', hairMid);
  } else if (hair === 'bob') {
    p('M 181 67 C 157 94 151 145 151 197 L 164 237 Q 188 254 222 239 L 285 244 Q 329 253 349 225 C 361 181 347 109 327 76 Z', hairDark);
    p('M 161 125 C 160 176 163 221 178 237 M 337 112 C 350 165 347 220 330 238', 'none', hairLight, 3);
  } else if (hair === 'sleek') {
    p('M 180 74 C 150 122 173 203 152 283 L 138 455 Q 164 432 186 451 L 325 448 L 366 467 C 336 329 346 204 333 113 L 312 58 Z', hairDark);
    p('M 175 159 C 177 259 155 363 158 431 M 333 163 C 327 256 335 365 344 438', 'none', hairLight, 3);
  } else {
    p('M 180 70 C 140 111 159 155 145 199 C 124 232 145 254 123 281 C 103 312 127 339 105 365 C 86 389 112 412 91 446 Q 120 447 135 429 C 123 456 151 464 180 447 L 321 448 Q 356 470 374 447 C 348 422 380 402 356 375 C 343 355 365 326 344 303 C 322 277 349 251 332 220 C 313 184 357 117 319 74 Z', hairDark);
    p('M 157 188 C 177 230 126 260 145 299 C 163 331 119 353 137 393 Q 151 419 131 441 M 330 220 C 315 252 347 277 325 309 C 304 340 350 366 335 401 Q 328 418 343 440', 'none', hairLight, 3);
  }

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

  group = 'face';
  const chin = 216 + jaw * 10;
  const side = 62 + cheeks * 5 + jaw * 4;
  // Face silhouette and all features are derived from this shared head origin.
  ellipse(191, 149, 11, 24, skin);
  ellipse(321, 149, 11, 24, skin);
  p('M 186 137 Q 199 140 192 156 L 195 164 M 326 137 Q 313 140 320 156 L 317 164', 'none', skinLine, 1.4);
  p(`M 190 117 C 187 62 215 38 255 37 C 298 37 325 64 322 116 L ${256 + side} 161 Q ${315 + jaw * 2} ${190 + jaw * 6} ${282 + jaw * 9} ${chin - 13} Q 257 ${chin + 8} ${230 - jaw * 9} ${chin - 13} Q ${197 - jaw * 2} ${190 + jaw * 6} ${256 - side} 161 Z`, skin);
  p(`M 192 122 Q 199 158 ${210 + cheeks * 5} 174 L ${229 - jaw * 6} ${chin - 15} Q 205 ${chin - 29} ${256 - side} 161 Z M 320 122 Q 314 157 ${302 - cheeks * 5} 174 L ${283 + jaw * 6} ${chin - 15} Q 309 ${chin - 29} ${256 + side} 161 Z`, shade, 'none');
  if (cheeks > 0.04) {
    p(`M 201 158 L ${218 + cheeks * 5} ${162 - cheeks * 7} L 216 176 Z M 311 158 L ${294 - cheeks * 5} ${162 - cheeks * 7} L 296 176 Z`, shade, 'none');
  }
  // Brows preserve the protagonist's confident expression across adjustments.
  p('M 205 119 Q 215 106 228 111 L 243 118 L 241 122 Q 222 115 205 123 Z', hairDark, 'none');
  p('M 269 118 L 284 111 Q 297 106 307 119 L 307 123 Q 290 115 271 122 Z', hairDark, 'none');
  group = 'eyes';
  const drawEye = (center: number, mirrored: boolean) => {
    const sign = mirrored ? -1 : 1;
    const x = (local: number) => center + sign * local;
    const outerY = 139 - eyes * 7;
    const upper = 128 + eyes * 3;
    const lower = 149 - eyes * 5;
    p(`M ${x(-21)} ${outerY} Q ${x(-5)} ${upper} ${x(18)} 139 Q ${x(4)} ${lower} ${x(-21)} ${outerY} Z`, '#f2e8dc', '#382a27', 1.5);
    ellipse(center - sign * 1, 139, 6.7, 7.8 - eyes * 3.5, '#615647', '#312c25', 1.3);
    ellipse(center - sign * 1, 139, 3.2, 4.3 - eyes * 1.7, '#20251f', 'none', 0);
    p(`M ${x(-24)} ${outerY - 4} L ${x(-19)} ${outerY} Q ${x(-4)} ${upper - 1} ${x(18)} 139`, 'none', '#282821', 2.6);
    p(`M ${x(-22)} ${outerY} l ${-sign * 3} -4 M ${x(-17)} ${outerY - 3} l ${-sign * 2} -4`, 'none', '#282821', 1.25);
    p(`M ${x(-18)} ${outerY + 6} Q ${x(0)} ${lower + 2} ${x(15)} 144`, 'none', skinLine, 0.9);
  };
  drawEye(224, false); drawEye(288, true);
  group = 'nose';
  const tip = 172 - nose * 2;
  const nw = 6 + nose * 4;
  p(`M 254 143 Q ${249 + nose * 2} 158 ${250 - nose * 3} ${tip - 4} L ${256 - nw} ${tip} Q 256 ${tip + 5} ${256 + nw} ${tip}`, 'none', skinLine, 1.2);
  p(`M ${256 - nw} ${tip} l 3 1 M ${256 + nw} ${tip} l -3 1`, 'none', '#714c3c', 1.7);
  p(`M 259 148 L 262 ${tip - 5} L ${256 + nw} ${tip} L 260 ${tip - 1} Z`, shade, 'none');
  group = 'mouth';
  p('M 236 188 Q 247 183 253 185 L 257 187 L 262 184 Q 270 186 278 188 L 258 193 Z', '#9d6050', '#815344', 0.8);
  p('M 237 188 Q 253 194 278 188 Q 263 204 249 198 Z', '#b57b61', 'none');
  p('M 237 189 Q 256 192 277 189', 'none', '#694637', 1.1);
  p('M 248 205 Q 256 208 264 204', 'none', skinLine, 0.7);
  group = 'jewelry';
  for (const x of [190, 322]) {
    ellipse(x, 170, 3.3, 4, '#ddd6be', '#696d65', 1.1);
    p(`M ${x} 174 L ${x} 194 M ${x} 181 l -4 11 l 4 8 l 4 -8 Z`, '#b7bcb0', '#686e64', 1.1);
  }

  group = 'hair-front';
  // Front and rear hair follow the exact head anchors; they never have asset offsets.
  if (hair === 'pony') {
    p('M 188 121 C 174 76 192 33 220 24 Q 250 11 279 26 C 318 25 338 73 324 122 Q 306 72 271 65 Q 236 61 209 100 L 190 143 Z', hairDark);
    p('M 198 87 Q 221 41 261 43 Q 304 48 317 83 M 214 73 Q 244 39 274 51', 'none', hairLight, 2.6);
    p('M 207 99 Q 190 123 190 150 L 185 175 Q 190 145 178 143 Q 172 121 191 103 Z', hairMid);
    p('M 309 100 Q 325 126 323 157 L 330 178 Q 320 156 333 144 Q 337 126 322 108 Z', hairMid);
  } else {
    p('M 183 135 C 164 97 176 50 204 28 C 225 11 247 19 258 26 C 276 14 303 25 321 45 C 343 71 340 110 326 141 L 311 119 Q 304 77 269 61 Q 256 57 248 68 Q 227 92 206 117 L 190 147 Z', hairDark);
    p('M 183 111 Q 184 52 222 32 Q 241 22 254 34 Q 220 47 207 74 Z M 272 33 Q 309 30 327 88 Q 308 58 276 57 Z', hairMid, 'none');
    p('M 183 113 C 200 83 225 47 252 39 M 186 126 Q 219 72 247 61 M 265 33 Q 282 39 288 57 M 280 27 Q 322 40 328 106', 'none', hairLight, 1.7);
    if (hair === 'bob') {
      p('M 184 117 Q 174 164 184 214 L 200 240 Q 166 239 161 216 Q 151 168 175 111 Z M 325 115 Q 340 161 330 216 L 316 238 Q 342 233 346 210 Q 356 159 335 111 Z', hairMid);
      p('M 178 142 Q 170 191 184 226 M 337 149 Q 344 192 330 226', 'none', hairLight, 1.5);
    } else if (hair === 'sleek') {
      p('M 182 114 Q 171 175 190 223 L 177 346 L 161 423 Q 178 312 169 231 Q 151 165 173 113 Z M 326 114 Q 346 172 328 231 L 342 422 L 320 353 L 316 222 Q 335 169 318 113 Z', hairMid);
      p('M 176 173 L 179 264 L 167 391 M 330 173 L 324 248 L 335 391', 'none', hairLight, 1.6);
    } else {
      p('M 185 115 C 160 153 187 182 170 212 C 151 236 182 252 157 280 C 137 305 160 326 141 352 C 123 378 152 397 124 424 Q 153 424 169 395 C 183 370 157 350 179 321 C 205 286 172 271 192 241 C 210 210 181 191 196 160 L 204 118 Z', hairMid);
      p('M 325 119 C 346 157 319 179 337 211 C 357 246 329 264 347 289 C 368 321 341 340 358 365 Q 380 403 348 423 Q 364 390 335 365 C 315 343 345 319 322 291 C 298 264 329 241 309 212 C 294 185 326 168 313 136 Z', hairMid);
      p('M 180 150 C 169 182 189 196 179 216 C 158 246 184 260 167 280 C 145 309 171 330 155 353 Q 142 383 153 396 M 324 147 C 339 175 315 195 327 215 C 348 249 319 261 334 286 Q 358 313 341 339', 'none', hairLight, 2);
      p('M 181 261 Q 183 286 165 307 M 162 355 Q 171 376 158 397 M 337 275 Q 328 291 343 310', 'none', '#222721', 1.3);
    }
  }
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
    const shape = new Path(path.d);
    if (path.fill !== 'none') { context.fillStyle = path.fill; context.fill(shape); }
    if (path.stroke !== 'none' && path.width > 0) { context.strokeStyle = path.stroke; context.lineWidth = path.width; context.stroke(shape); }
  }
  context.restore();
}
