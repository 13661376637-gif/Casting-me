// Offline, deterministic contour extraction shared by read-only reference tools.
export function traceColors(data,width,height,mask,colorCount=64){
  const histogram=new Map();
  for(let i=0;i<mask.length;i++)if(mask[i]){
    const o=i*4,r=data[o],g=data[o+1],b=data[o+2],key=(r>>2)*4096+(g>>2)*64+(b>>2);
    const bin=histogram.get(key)??{r:0,g:0,b:0,n:0};bin.r+=r;bin.g+=g;bin.b+=b;bin.n++;histogram.set(key,bin);
  }
  const samples=[...histogram.values()].map(s=>({r:s.r/s.n,g:s.g/s.n,b:s.b/s.n,n:s.n}));
  const boxes=[samples];
  while(boxes.length<colorCount){
    let at=-1,axis='r',score=-1;
    for(let i=0;i<boxes.length;i++)if(boxes[i].length>1){
      const n=boxes[i].reduce((v,s)=>v+s.n,0);
      for(const key of ['r','g','b']){const v=boxes[i].map(s=>s[key]),s=(Math.max(...v)-Math.min(...v))*Math.sqrt(n);if(s>score){score=s;at=i;axis=key;}}
    }
    if(at<0)break;
    const box=boxes[at].sort((a,b)=>a[axis]-b[axis]),half=box.reduce((v,s)=>v+s.n,0)/2;
    let weight=0,cut=1;for(let i=0;i<box.length-1;i++){weight+=box[i].n;if(weight>=half){cut=i+1;break;}}
    boxes.splice(at,1,box.slice(0,cut),box.slice(cut));
  }
  const palette=boxes.map(box=>{const n=box.reduce((v,s)=>v+s.n,0);return ['r','g','b'].map(key=>Math.round(box.reduce((v,s)=>v+s[key]*s.n,0)/n));});
  const lookup=new Map(),labels=new Int16Array(mask.length).fill(-1);
  for(let i=0;i<mask.length;i++)if(mask[i]){
    const o=i*4,r=data[o],g=data[o+1],b=data[o+2],key=(r>>2)*4096+(g>>2)*64+(b>>2);
    let color=lookup.get(key);
    if(color===undefined){let best=Infinity;color=0;for(let j=0;j<palette.length;j++){const c=palette[j],d=(r-c[0])**2+(g-c[1])**2+(b-c[2])**2;if(d<best){best=d;color=j;}}lookup.set(key,color);}
    labels[i]=color;
  }
  return {palette,contours:traceLabels(labels,width,height),silhouette:traceLabels(Int16Array.from(mask,v=>v?0:-1),width,height)};
}

export function traceLabels(labels,width,height){
  const groups=new Map(),stride=width+1;
  function edge(label,a,b,dir){const edges=groups.get(label)??new Map(),out=edges.get(a)??[];out.push([b,dir]);edges.set(a,out);groups.set(label,edges);}
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=y*width+x,v=labels[i];if(v<0)continue;const a=y*stride+x;
    if(y===0||labels[i-width]!==v)edge(v,a,a+1,0);
    if(x===width-1||labels[i+1]!==v)edge(v,a+1,a+stride+1,1);
    if(y===height-1||labels[i+width]!==v)edge(v,a+stride+1,a+stride,2);
    if(x===0||labels[i-1]!==v)edge(v,a+stride,a,3);
  }
  const result=[];
  for(const [label,edges] of groups){const loops=[];
    while(edges.size){
      const start=edges.keys().next().value;let cursor=start,dir=0;const points=[];
      do{points.push([cursor%stride,Math.floor(cursor/stride)]);const out=edges.get(cursor);if(!out)throw new Error('Open contour');
        let selected=0;if(out.length>1){const order=[(dir+1)%4,dir,(dir+3)%4,(dir+2)%4];selected=out.map((e,i)=>[order.indexOf(e[1]),i]).sort((a,b)=>a[0]-b[0])[0][1];}
        const [next,nextDir]=out.splice(selected,1)[0];if(!out.length)edges.delete(cursor);cursor=next;dir=nextDir;
      }while(cursor!==start);
      if(points.length<4)continue;
      let far=1;for(let i=2;i<points.length;i++)if(distance(points[i],points[0])>distance(points[far],points[0]))far=i;
      const loop=[...simplify(points.slice(0,far+1)).slice(0,-1),...simplify([...points.slice(far),points[0]]).slice(0,-1)];
      if(loop.length>2)loops.push(loop.flat());
    }
    result.push({color:label,loops});
  }
  return result;
}
const distance=(a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2;
function simplify(points,tolerance=0.42){
  if(points.length<=3)return points;const a=points[0],b=points.at(-1),dx=b[0]-a[0],dy=b[1]-a[1];let max=0,at=0;
  for(let i=1;i<points.length-1;i++){const p=points[i],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1))),d=(p[0]-a[0]-t*dx)**2+(p[1]-a[1]-t*dy)**2;if(d>max){max=d;at=i;}}
  return max>tolerance*tolerance?[...simplify(points.slice(0,at+1),tolerance).slice(0,-1),...simplify(points.slice(at),tolerance)]:[a,b];
}
