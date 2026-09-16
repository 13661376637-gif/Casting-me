import {createRequire} from 'node:module';
import {join} from 'node:path';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {buildCharacterDrawing,paintCharacter,preloadActionDrawings} from '../lib/avatar-drawing.ts';
import {DEFAULT_FACE,adjustFace} from '../lib/avatar-model.ts';
const {createCanvas,Path2D}=createRequire(join(process.argv[2],'package.json'))('@napi-rs/canvas');
await preloadActionDrawings();
mkdirSync('work/action-verification',{recursive:true});
const canvas=createCanvas(1400,1000),ctx=canvas.getContext('2d');ctx.fillStyle='#9dafa9';ctx.fillRect(0,0,1400,1000);
const drawings=[];
const faces=createCanvas(1200,640),facesContext=faces.getContext('2d');facesContext.fillStyle='#a7b4b0';facesContext.fillRect(0,0,1200,640);
for(const [i,pose] of ['crossed','guard'].entries()){
  const drawing=buildCharacterDrawing({face:DEFAULT_FACE,hair:'original',look:'qipao',actionPose:pose});drawings.push(drawing);
  const sprite=createCanvas(700,1000);paintCharacter(sprite.getContext('2d'),drawing,700,1000,false,Path2D);ctx.drawImage(sprite,i*700,0);
  const edited=buildCharacterDrawing({face:{...DEFAULT_FACE,skin:'deep',jaw:'long-square'},hair:'original',look:'qipao',actionPose:pose});
  assert.deepEqual(drawing.head,edited.head);
  assert.notDeepEqual(drawing.paths.filter(p=>p.group==='action-skin'),edited.paths.filter(p=>p.group==='action-skin'));
  for(const feature of ['eyes','nose','cheekbones','jaw','skin']){
    const customized=buildCharacterDrawing({face:adjustFace(DEFAULT_FACE,feature,1),hair:'original',look:'qipao',actionPose:pose});
    assert.notDeepEqual(drawing.paths,customized.paths,`${pose}: ${feature} must affect action character`);
    assert.deepEqual(drawing.head,customized.head,`${pose}: no head drift`);
  }
  for(const [j,skin] of ['original','porcelain','deep'].entries()){
    const face={...DEFAULT_FACE,skin,eyes:j?'coded':'natural',cheekbones:j?'high':'soft',nose:j?'rounded':'defined',jaw:j?'long-square':'oval'};
    const variant=buildCharacterDrawing({face,hair:'original',look:'qipao',actionPose:pose});
    const portrait=createCanvas(400,320);paintCharacter(portrait.getContext('2d'),variant,400,320,true,Path2D);facesContext.drawImage(portrait,j*400,i*320);
    assert.deepEqual(variant.paths.filter(p=>p.group==='action-costume').map(p=>p.fill),drawing.paths.filter(p=>p.group==='action-costume').map(p=>p.fill),'Costume and gold embroidery must not be recolored');
  }
  const pixels=sprite.getContext('2d').getImageData(0,0,700,1000).data;
  for(let x=0;x<700;x++){assert.equal(pixels[x*4+3],0,'weapon crosses top camera edge');assert.equal(pixels[((999*700)+x)*4+3],0,'feet cross bottom camera edge');}
}
assert.notDeepEqual(drawings[0].paths,drawings[1].paths);
writeFileSync('work/action-verification/poses.png',canvas.toBuffer('image/png'));
writeFileSync('work/action-verification/faces.png',faces.toBuffer('image/png'));
console.log('Both action poses retain the same editable face and head anchor.');
