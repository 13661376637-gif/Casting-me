// Source-space cleanup, not a bitmap compositor. Remove retired head vertices
// once, then keep the finished complete figure as editable Canvas contours.
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
const {Path2D,PathOp}=createRequire(join(process.argv[2],'package.json'))('@napi-rs/canvas');
const source=JSON.parse(execFileSync(process.argv[3],['show','b23725f6d8b1d88b31ba6d2c784215003b340d70:lib/avatar-action.json'],{maxBuffer:30_000_000,encoding:'utf8'}));
const outlines={
  crossed:[[232,70],[274,70],[291,99],[307,122],[305,154],[280,185],[275,191],[260,198],[242,208],[236,216],[232,226],[230,224],[229,211],[221,203],[217,178],[199,156],[181,151],[180,136],[201,120],[222,95]],
  guard:[[232,68],[274,68],[291,98],[308,122],[305,152],[280,181],[275,181],[261,187],[247,194],[239,201],[234,211],[231,220],[229,217],[227,202],[219,196],[215,169],[199,150],[181,144],[180,132],[201,117],[222,93]],
};
function cleanCloth(d,rgb){
  // Remove sub-pixel neutral grain, not drawn seams, gilding, skin or nails.
  // Long thin folds are retained by their extent even when their area is low.
  if(Math.max(...rgb)>90||Math.max(...rgb)-Math.min(...rgb)>22)return d;
  return [...d.matchAll(/M[^M]+/g)].map(m=>m[0]).filter(loop=>{
    const points=[...loop.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map(m=>[+m[1],+m[2]]);
    let area=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];area+=a[0]*b[1]-b[0]*a[1];}
    const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    return Math.abs(area)/2>2.5||Math.max(...xs)-Math.min(...xs)>7||Math.max(...ys)-Math.min(...ys)>7;
  }).join('');
}
function headContours(d){
  // Reduce every contour to a small convex work region before path operations;
  // this avoids native path-op failure on very large connected garment ink.
  return [...d.matchAll(/M[^M]+/g)].map(m=>{
    let p=[...m[0].matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map(m=>[+m[1],+m[2]]);
    for(const [axis,edge,sign] of [[0,130,1],[0,345,-1],[1,0,1],[1,182,-1]]){
      const q=[];for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],ia=(a[axis]-edge)*sign>=0,ib=(b[axis]-edge)*sign>=0;if(ia)q.push(a);if(ia!==ib){const t=(edge-a[axis])/(b[axis]-a[axis]);q.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}}p=q;
    }
    return p.length<3?'':p.map(([x,y],i)=>`${i?'L':'M'}${x} ${y}`).join('')+'Z';
  }).join('');
}
for(const [pose,action] of Object.entries(source)){
  const opening=outlines[pose].map(([x,y],i)=>`${i?'L':'M'}${x} ${y}`).join('')+'Z';
  action.headOpening=opening;
  action.preparedHead=true;
  const hairRegion=new Path2D('M130 0L345 0L345 182L306 182L295 158L297 133L293 111L286 91L276 79L258 75L251 77L246 75L232 77L223 89L207 111L196 122L181 132L184 146L200 151L211 168L215 182L130 182Z');
  // Retain the film hair's real curved fringe as native foreground geometry.
  // It wraps the customized forehead instead of stacking a second hairstyle.
  action.foreHair=action.shapes.slice(1).filter(s=>!s.skin&&Math.max(...s.rgb)<125&&Math.max(...s.rgb)-Math.min(...s.rgb)<40).map(s=>({...s,d:new Path2D(headContours(s.d)).op(new Path2D(hairRegion),PathOp.Intersect).toSVGString()})).filter(s=>s.d);
  for(const s of action.foreHair){const [l,t,r,b]=new Path2D(s.d).getBounds();if(l<129||t<-.1||r>346||b>183)throw new Error('Hair contours escaped work region');}
  // Boolean subtraction modifies the actual native mesh, eliminating the
  // runtime rectangular/cutout head mask and its antialiased seams.
  action.shapes=action.shapes.map((shape,i)=>({...shape,d:new Path2D(i?cleanCloth(shape.d,shape.rgb):shape.d).op(new Path2D(opening),PathOp.Difference).toSVGString()}));
  console.log(`${pose}: retired head removed from ${action.shapes.length} vector material paths`);
}
writeFileSync('lib/avatar-action.json',JSON.stringify(source));
