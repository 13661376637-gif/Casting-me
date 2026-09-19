// Complete, original Canvas artwork. No image tracing, cut-out torso or face
// aperture. All anatomy, fabric, hands and instruments share one coordinate rig.
const ink='#191a1c',cloth='#292a29',dark='#202120',light='#353633';
const red='#81252a',redLight='#a33337',gold='#ba904c',skin='#f7d8b1',shade='#d6ad86';
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
function art(){
  const shapes=[];
  const p=(d,fill,group='action-costume',stroke=ink,width=1.5)=>shapes.push({d,rgb:fill==='none'?null:rgb(fill),skin:group==='action-skin'||group==='neck',group,stroke,width});
  return {shapes,p,line:(d,c,w=1)=>p(d,'none','action-costume',c,w)};
}
// One axis for blade, guard, tang and grip, baked directly into path vertices.
function place(d,x,y,ux,uy){return d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g,(_,a,b)=>`${(x+(+a)*ux-(+b)*uy).toFixed(2)} ${(y+(+a)*uy+(+b)*ux).toFixed(2)}`);}
function sword(a,x,y,ux,uy){
  const p=(d,c,s=ink,w=1.5)=>a.p(place(d,x,y,ux,uy),c,'action-costume',s,w);
  p('M-70 -6L-5 -6L-5 6L-70 6Q-76 0 -70 -6Z','#252624');
  p('M-74 -6L-66 -6L-66 6L-74 6Z',gold);
  for(let k=-60;k<-8;k+=8)p(`M${k} -5L${k+5} 0L${k} 5L${k-4} 0Z`,'#736345','none',0);
  p('M2 -4L334 -7Q358 -7 381 -1Q369 8 348 9L3 5Z','#d8dddc');
  p('M6 1L348 3L376 -1L351 7L6 5Z','#f4f3ed','none',0);
  p('M-4 -15Q4 -18 8 -12L8 13Q1 19 -5 13Z',gold);
  p('M-1 -11L3 -11L3 11L-1 11Z','#d4b477','none',0);
}
function scabbard(a,x,y,ux,uy,length=290){
  const p=(d,c,s=ink,w=1.5)=>a.p(place(d,x,y,ux,uy),c,'action-costume',s,w);
  p(`M-34 -9L${length-12} -7Q${length} 0 ${length-12} 7L-34 9Z`,'#252625');
  p(`M-25 -5L${length-15} -4L${length-11} -1L-25 -1Z`,'#40423f','none',0);
  p('M-36 -10L-26 -10L-26 10L-36 10Z',gold);
  p(`M${length-12} -7Q${length} 0 ${length-12} 7L${length-20} 7L${length-20} -7Z`,gold);
}
function grip(a,x,y,ux,uy){
  const p=(d,c,s=ink,w=1.2)=>a.p(place(d,x,y,ux,uy),c,'action-skin',s,w);
  p('M-15 8C-23 7 -23 -3 -20 -9L-11 -16C-6 -19 -3 -15 -4 -10L-8 -4L-3 -8C1 -10 5 -7 4 -3L10 -5C14 -5 17 -1 14 3L19 5C23 9 19 15 14 16L-1 21C-8 21 -14 17 -15 8Z',skin);
  p('M-14 5Q-7 12 3 12L14 9L14 15L-1 20Q-10 18 -14 13Z',shade,'none',0);
  for(const d of ['M-8 -4L-4 5Q-2 9 2 8','M4 -3L7 6Q8 10 12 8','M14 3L16 8','M-17 -8Q-12 -12 -8 -11'])p(d,'none','#987759',.9);
}
function embroidery(a,x,y,s=1){
  const d='M0 60C18 46 -12 28 4 12C18 -1 20 20 9 23C-2 27 -3 13 5 3M3 37C18 28 30 37 21 45C15 50 11 42 15 38M-1 48C-17 39 -25 49 -16 55C-8 58 -6 51 -12 49M5 14C-10 5 -18 18 -9 22';
  a.line(place(d,x,y,s,0),gold,1.4*s);
  for(const [dx,dy] of [[4,8],[17,39],[-13,49]]){
    const flower=`M${dx} ${dy}C${dx-13} ${dy-14} ${dx-17} ${dy+2} ${dx-2} ${dy+3}C${dx-10} ${dy+18} ${dx+9} ${dy+19} ${dx+3} ${dy+4}C${dx+19} ${dy+8} ${dx+17} ${dy-10} ${dx+3} ${dy}C${dx+12} ${dy-15} ${dx-6} ${dy-16} ${dx} ${dy}Z`;
    a.p(place(flower,x,y,s,0),gold,'action-costume','none',0);
  }
}
function makePose(raised){
  const a=art(),{p,line}=a;
  // Long hair begins beneath the same crown as the editable face. There is no
  // second head silhouette, straight portrait-hair panel or rectangular mask.
  p('M192 118C181 148 190 181 173 204C155 229 167 248 149 275C138 292 143 314 130 334C116 355 133 378 143 394C151 409 133 427 141 446C170 439 161 416 180 410C199 403 190 380 211 371L304 371C318 393 307 421 330 433C348 443 339 465 358 472C377 445 355 429 370 410C385 391 367 370 374 348C382 323 355 306 360 282C366 257 341 236 343 211C346 179 327 151 321 122Z','#222321','hair-back');
  for(const d of ['M190 163C167 210 190 231 160 269C141 295 167 321 143 350C133 364 159 391 150 411','M199 186C180 224 201 250 175 278C155 302 181 327 161 351C147 369 171 390 160 411','M316 168C342 203 318 226 339 253C358 276 335 301 353 321C372 344 342 370 360 390C376 410 349 425 353 445'])line(d,'#40413b',2);
  // Whole legs and shoes are constructed first, under a complete gown.
  p('M224 656C233 786 222 924 224 1059L230 1191C226 1207 207 1222 185 1228C173 1236 174 1250 190 1251C221 1252 251 1231 257 1214L271 1052L288 729Z',skin,'action-skin');
  p('M319 625C351 707 341 791 367 858C389 911 383 995 398 1048L430 1196C435 1213 431 1224 417 1231C400 1239 381 1226 378 1210L340 1066C324 996 326 926 307 876L281 735Z',skin,'action-skin');
  p('M320 671C343 764 323 815 350 880L359 1057L405 1203L424 1211L392 1050C377 988 382 920 366 867C339 786 347 735 320 671Z',shade,'action-skin','none',0);
  p('M184 1227C204 1234 231 1214 246 1199L255 1205L257 1225C241 1245 206 1263 179 1258C166 1253 170 1236 184 1227Z','#202222');
  p('M247 1218L257 1215L256 1251L250 1251Z','#17191a');
  p('M377 1196C389 1209 412 1218 430 1196L438 1216C438 1235 428 1258 412 1261C394 1264 377 1252 375 1237Z','#202222');
  line('M180 1248C203 1253 232 1234 247 1223M384 1245Q410 1261 430 1227','#4b4d49',2);
  // One shoulder-to-hem contour, with a planted pelvis and continuous folds.
  p('M219 212C198 217 172 220 153 237C139 271 155 322 166 360C180 401 193 434 189 470C185 509 175 542 166 582C150 669 158 791 145 877C132 972 121 1071 104 1174C156 1203 209 1208 270 1190L321 694C331 782 350 868 372 959L406 1188L461 1167C431 1083 409 980 395 885C380 783 378 676 363 590C355 544 337 511 326 474C318 443 333 394 346 352C358 313 369 270 351 244C334 225 307 223 291 211Z',cloth);
  p('M279 277C311 308 312 351 330 370C320 408 313 444 317 479C327 534 355 566 359 620L389 866L445 1162L409 1178L373 961C347 862 332 778 321 694L307 713L282 592L300 482L272 412Z',dark,'action-costume','none',0);
  p('M318 475C330 514 349 550 355 590C371 679 375 784 390 887C405 986 430 1092 454 1163L432 1171C413 1083 396 985 381 891C367 794 363 687 347 601C340 558 323 523 312 491Z',red);
  p('M321 694C333 783 352 870 374 959L406 1188L400 1186C384 1091 362 1014 353 919C333 829 321 747 317 708Z',redLight,'action-costume',ink,1.1);
  p('M155 270C152 316 177 367 185 397C203 402 240 407 275 396C253 425 221 425 195 413L209 464L196 519C180 470 181 428 165 387C148 340 138 295 155 270Z',light,'action-costume','none',0);
  p('M192 509C228 519 279 518 315 489L309 516C278 535 230 542 185 544Z',dark,'action-costume','none',0);
  p('M184 579C209 618 223 682 226 754L270 1190L238 1196C213 970 194 819 184 579Z','#323330','action-costume','none',0);
  p('M171 650L162 927L129 1179L151 1187L183 890Z',dark,'action-costume','none',0);
  p('M311 543L276 774L277 918L313 678Z','#191b1b','action-costume','none',0);
  p('M182 305C201 278 224 290 252 304C275 285 301 293 323 324C312 353 285 371 253 357C224 373 196 359 182 338Z','#30312e','action-costume','none',0);
  p('M184 335C205 354 227 360 253 351C278 365 304 348 323 328L315 353C292 375 268 379 250 367C224 380 205 367 187 356Z','#1d201f','action-costume','none',0);
  p('M207 385Q255 400 301 382L288 407Q248 419 214 404Z','#30312e','action-costume','none',0);
  p('M195 554C208 565 221 571 240 578L214 563L198 559Z','#41413b','action-costume','none',0);
  p('M185 595Q197 754 179 863L184 716Z','#3a3b35','action-costume','none',0);
  p('M241 684Q253 840 251 941L235 773Z','#363731','action-costume','none',0);
  for(const d of ['M167 311C188 345 216 351 245 348','M189 383Q231 403 281 384','M198 437Q245 454 309 428','M192 473Q253 491 313 469','M187 550Q247 555 306 527','M210 584Q242 620 266 684','M177 767Q181 949 169 1147','M238 812L263 1143'])line(d,'#181b1b',1.4);
  if(raised){
    p('M158 238C133 224 105 182 83 145L35 41L13 -10L49 -32L85 20C104 66 119 111 153 144L206 214C196 235 181 244 158 238Z',cloth);
    p('M293 218L357 144C387 113 407 61 424 19L451 -33L488 -13L470 42L424 151C404 187 379 221 354 242C333 245 310 237 293 218Z',cloth);
    p('M71 29C83 85 115 139 144 168L184 218L158 228L110 174L65 94Z',dark,'action-costume','none',0);
    p('M429 49L399 149L340 226L366 219L423 160L458 69Z',dark,'action-costume','none',0);
    p('M13 -10L49 -32L74 10L30 35Z',red);
    p('M451 -33L488 -13L472 34L430 11Z',red);
    line('M37 46Q72 78 89 113M126 184L160 202M423 52Q415 99 397 114M379 186L351 207','#464640',1.5);
    p('M21 -14L15 -42C10 -53 14 -67 24 -72L40 -75C48 -69 48 -59 43 -53L45 -30Z',skin,'action-skin');
    p('M457 -33L462 -58C459 -66 462 -79 473 -80L487 -74C493 -64 488 -53 482 -45L479 -17Z',skin,'action-skin');
    sword(a,68,-87,.85,-.5268);scabbard(a,464,-66,-.85,-.5268,420);
    grip(a,37,-67,.85,-.5268);grip(a,474,-60,-.85,-.5268);
    embroidery(a,38,-9,.45);embroidery(a,457,-5,.45);
  }else{
    p('M156 237C129 247 125 291 118 326L105 384L98 430L92 455L130 480C150 457 156 422 165 394L192 311C200 278 185 245 156 237Z',cloth);
    p('M349 241C373 249 379 282 386 313L408 401L439 493L452 537L411 555L387 511C367 473 354 427 342 397L313 310C309 278 323 249 349 241Z',cloth);
    p('M130 296L120 377L103 430L126 442L151 378L166 312Z',dark,'action-costume','none',0);
    p('M372 286L387 409L430 514L411 530L366 427L348 331Z',dark,'action-costume','none',0);
    p('M97 424L140 443L130 480L90 458Z',red);
    p('M404 516L444 499L458 539L416 557Z',red);
    line('M134 354L157 329M107 401L137 384M374 393Q386 407 402 411M388 467L413 476','#464640',1.5);
    p('M98 459L129 474L123 499L107 503L92 483Z',skin,'action-skin');
    p('M421 554L449 542L463 575L461 598L445 603L433 577Z',skin,'action-skin');
    sword(a,91,451,-.59,-.8074);scabbard(a,461,596,.79,.6131);
    grip(a,111,480,-.59,-.8074);grip(a,453,591,.79,.6131);
    embroidery(a,112,437,.46);embroidery(a,425,517,.46);
  }
  // Neck skin is authored through the collar opening with one fixed chin.
  p('M228 163C232 184 230 198 220 212L237 241L276 244L296 216C281 201 281 181 284 164Z',skin,'neck');
  p('M228 177Q251 202 282 176L282 195Q260 220 232 210Z',shade,'neck','none',0);
  p('M220 202C216 213 219 230 238 253L251 269L251 239L240 225L231 205Z',cloth);
  p('M286 200L301 216C291 235 270 242 251 269L251 239C263 224 278 220 286 200Z',cloth);
  line('M221 206Q219 226 244 251M289 205Q280 222 258 240L251 264',redLight,2.8);
  line('M249 264C229 288 203 304 196 333C181 382 204 425 199 470C199 534 169 549 171 603',redLight,3.4);
  for(const [x,y] of [[248,263],[224,288],[204,321],[194,365],[200,470],[187,530]]){
    p(`M${x} ${y}C${x-17} ${y-14} ${x-27} ${y-1} ${x-10} ${y+3}L${x} ${y}C${x+19} ${y+15} ${x+30} ${y+2} ${x+10} ${y-2}Z`,redLight,'action-costume',ink,1.2);
    p(`M${x-4} ${y-4}L${x+4} ${y-4}L${x+5} ${y+4}L${x-4} ${y+4}Z`,redLight);
  }
  embroidery(a,300,429,.65);embroidery(a,298,476,.6);
  embroidery(a,236,1076,.8);embroidery(a,221,1124,.75);
  line('M158 255Q174 277 176 304M348 255Q332 273 333 296M292 277C300 332 291 370 291 397','#131818',1.3);
  line('M151 1169Q199 1187 264 1176M411 1166L447 1154','#46463e',1.1);
  return {headScale:.9,headOffset:[25.6,0],shapes:a.shapes};
}
export default {crossed:makePose(true),guard:makePose(false)};
