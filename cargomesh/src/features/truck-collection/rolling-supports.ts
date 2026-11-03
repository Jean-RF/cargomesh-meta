type Size=readonly[number,number,number];
export type RollingSupport={x:number;centerY:number;radius:number;tireRadius:number};
export function trackProfile([a,,h]:Size){
  const trackLength=a*.59,trackRadius=h*.085;
  return {trackLength,trackRadius,straight:trackLength-2*trackRadius,trackY:h*.105};
}
/** Shared with the native tyres/tracks, including the protruding tread. */
export function rollingSupports(kind:string,size:Size):RollingSupport[]{
  const [a,,h]=size;
  if(kind==='cars')return [-.31,.30].map(x=>({x:x*a,centerY:h*.205,radius:h*.185+.0035,tireRadius:h*.185}));
  if(kind==='tractor')return [[-.325,.15],[.23,.245]].map(([x,r])=>({x:x*a,centerY:h*r+.017,radius:h*r+.0145,tireRadius:h*r}));
  if(kind==='excavator'){
    const {straight,trackY,trackRadius}=trackProfile(size);
    return Array.from({length:13},(_,i)=>({x:(i/12-.5)*straight,centerY:trackY-trackRadius-.009,radius:0,tireRadius:0}));
  }
  return [];
}

export type Road=readonly(readonly[number,number])[];
/** Minimum wheel-centre height above finite line segments (circular tyre envelope). */
export function rollingClearance(road:Road,x:number,radius:number){
  let height=-Infinity;
  for(let i=1;i<road.length;i++){
    const [x0,y0]=road[i-1],[x1,y1]=road[i],lo=Math.max(x0,x-radius),hi=Math.min(x1,x+radius);
    if(lo>hi)continue;
    const slope=(y1-y0)/(x1-x0),q=Math.max(lo,Math.min(hi,x+slope*radius/Math.sqrt(1+slope*slope)));
    height=Math.max(height,y0+slope*(q-x0)+Math.sqrt(Math.max(0,radius*radius-(q-x)*(q-x))));
  }
  return height;
}
export function rollingPose(road:Road,supports:readonly RollingSupport[],x:number,halfHeight:number){
  const clearance=(s:RollingSupport,pitch:number)=>{
    const y=s.centerY-halfHeight,px=x+s.x*Math.cos(pitch)-y*Math.sin(pitch),py=s.x*Math.sin(pitch)+y*Math.cos(pitch);
    return rollingClearance(road,px,s.radius)-py;
  };
  let lo=-.65,hi=.65;
  if(supports.length===2){
    for(let i=0;i<42;i++){const mid=(lo+hi)/2;if(clearance(supports[0],mid)>clearance(supports[1],mid))hi=mid;else lo=mid;}
  }else{
    const height=(p:number)=>Math.max(...supports.map(s=>clearance(s,p)));
    for(let i=0;i<42;i++){const p=lo+(hi-lo)/3,q=hi-(hi-lo)/3;if(height(p)<height(q))hi=q;else lo=p;}
  }
  const pitch=(lo+hi)/2,y=Math.max(...supports.map(s=>clearance(s,pitch)))+.0005;
  return {pitch,y};
}
