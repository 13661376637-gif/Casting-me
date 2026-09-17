import {createRequire} from 'node:module';
import {join} from 'node:path';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {buildCharacterDrawing,paintCharacter,preloadActionDrawings} from '../lib/avatar-drawing.ts';
import {DEFAULT_FACE,adjustFace} from '../lib/avatar-model.ts';
import actions from '../lib/avatar-action.json' with {type:'json'};
const {createCanvas,Path2D}=createRequire(join(process.argv[2],'package.json'))('@napi-rs/canvas');
await preloadActionDrawings();
mkdirSync('work/action-verification',{recursive:true});
const canvas=createCanvas(1400,1000),ctx=canvas.getContext('2d');ctx.fillStyle='#9dafa9';ctx.fillRect(0,0,1400,1000);
const drawings=[];
// Compare the real editor contours, not just whether a slider changes anything.
// Undo each pose's affine placement and verify geometry, colors and ink widths.
function sameFace(regular,action){
  const groups=new Set(['face','jewelry']);
  const expected=regular.paths.filter(p=>groups.has(p.group));
  const actual=action.paths.filter(p=>groups.has(p.group));
  assert.equal(actual.length,expected.length,'Same editor contour set in every pose');
  for(let i=0;i<expected.length;i++){
    const a=actual[i],b=expected[i];
    assert.equal(a.fill,b.fill,'Face uses the editor palette');
    assert.equal(a.stroke,b.stroke,'Same ink color');
    assert.equal(a.group,b.group);
    assert.ok(Math.abs(a.width/action.headScale-b.width/regular.headScale)<.002);
    const normalize=(p,d)=>[...p.d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map(m=>[(+m[1]-d.head.x)/d.headScale,(+m[2]-d.head.y)/d.headScale]);
    const av=normalize(a,action),bv=normalize(b,regular);
    assert.equal(av.length,bv.length);
    for(let n=0;n<av.length;n++)for(let axis=0;axis<2;axis++)assert.ok(Math.abs(av[n][axis]-bv[n][axis])<.002,'Identical normalized facial vertices');
  }
}
const faces=createCanvas(1200,640),facesContext=faces.getContext('2d');facesContext.fillStyle='#a7b4b0';facesContext.fillRect(0,0,1200,640);
for(const [i,pose] of ['crossed','guard'].entries()){
  const drawing=buildCharacterDrawing({face:DEFAULT_FACE,hair:'original',look:'qipao',actionPose:pose});drawings.push(drawing);
  sameFace(buildCharacterDrawing({face:DEFAULT_FACE,hair:'original',look:'natural'}),drawing);
  assert.deepEqual(drawing.paths.filter(p=>p.group==='action-skin'||p.group==='action-costume').map(p=>p.d),actions[pose].shapes.map(p=>p.d),'Body, hands, blade, hilt and scabbard are not warped');
  assert.ok(!drawing.paths.some(p=>p.group==='action-face-underlay'),'No painted patches over the old face');
  const sprite=createCanvas(700,1000);paintCharacter(sprite.getContext('2d'),drawing,700,1000,false,Path2D);ctx.drawImage(sprite,i*700,0);
  const edited=buildCharacterDrawing({face:{...DEFAULT_FACE,skin:'deep',jaw:'long-square'},hair:'original',look:'qipao',actionPose:pose});
  assert.deepEqual(drawing.head,edited.head);
  assert.notDeepEqual(drawing.paths.filter(p=>p.group==='action-skin'),edited.paths.filter(p=>p.group==='action-skin'));
  for(const feature of ['eyes','nose','cheekbones','jaw','skin']){
    const customized=buildCharacterDrawing({face:adjustFace(DEFAULT_FACE,feature,1),hair:'original',look:'qipao',actionPose:pose});
    assert.notDeepEqual(drawing.paths,customized.paths,`${pose}: ${feature} must affect action character`);
    assert.deepEqual(drawing.head,customized.head,`${pose}: no head drift`);
    sameFace(buildCharacterDrawing({face:adjustFace(DEFAULT_FACE,feature,1),hair:'original',look:'natural'}),customized);
  }
  for(const [j,skin] of ['original','porcelain','deep'].entries()){
    const face={...DEFAULT_FACE,skin,eyes:j?'coded':'natural',cheekbones:j?'high':'soft',nose:j?'rounded':'defined',jaw:j?'long-square':'oval'};
    const variant=buildCharacterDrawing({face,hair:'original',look:'qipao',actionPose:pose});
    sameFace(buildCharacterDrawing({face,hair:'original',look:'natural'}),variant);
    const portrait=createCanvas(400,320);paintCharacter(portrait.getContext('2d'),variant,400,320,true,Path2D);facesContext.drawImage(portrait,j*400,i*320);
    assert.deepEqual(variant.paths.filter(p=>p.group==='action-costume').map(p=>p.fill),drawing.paths.filter(p=>p.group==='action-costume').map(p=>p.fill),'Costume and gold embroidery must not be recolored');
  }
  const pixels=sprite.getContext('2d').getImageData(0,0,700,1000).data;
  for(let x=0;x<700;x++){assert.equal(pixels[x*4+3],0,'weapon crosses top camera edge');assert.equal(pixels[((999*700)+x)*4+3],0,'feet cross bottom camera edge');}
}
assert.notDeepEqual(drawings[0].paths,drawings[1].paths);
writeFileSync('work/action-verification/poses.png',canvas.toBuffer('image/png'));
writeFileSync('work/action-verification/faces.png',faces.toBuffer('image/png'));
const compare=createCanvas(1200,1440),compareContext=compare.getContext('2d');
compareContext.fillStyle='#a7b4b0';compareContext.fillRect(0,0,1200,1440);
const variants=[DEFAULT_FACE,{...DEFAULT_FACE,skin:'porcelain',eyes:'coded',cheekbones:'high',nose:'rounded',jaw:'long-square'},{...DEFAULT_FACE,skin:'deep',eyes:'coded',cheekbones:'high',nose:'rounded',jaw:'long-square'},['eyes','nose','jaw','cheekbones','skin'].reduce((face,key)=>adjustFace(face,key,.43),DEFAULT_FACE)];
for(const [row,face] of variants.entries())for(const [column,actionPose] of [undefined,'crossed','guard'].entries()){
  const drawing=buildCharacterDrawing({face,hair:'original',look:'qipao',actionPose});
  const regular=buildCharacterDrawing({face,hair:'original',look:'natural'});
  sameFace(regular,drawing);
  const portrait=createCanvas(400,320);paintCharacter(portrait.getContext('2d'),drawing,400,320,true,Path2D);
  compareContext.drawImage(portrait,column*400,row*360+40);
  compareContext.fillStyle='#182332';compareContext.font='18px sans-serif';compareContext.fillText(`${actionPose??'Editor / normal'} · ${row===3?'43% controls':face.skin}`,column*400+12,row*360+26);
}
writeFileSync('work/action-verification/identity.png',compare.toBuffer('image/png'));
console.log('Both action poses match actual editor face geometry/colors, including continuous edits; fixed anchors and unchanged weapon/body paths verified.');
