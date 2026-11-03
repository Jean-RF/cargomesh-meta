import * as T from 'three';
import base from './driver-base.json';
import type { CollectionTruck } from './catalog';
import type { AddVehiclePart, VehiclePart } from './cab-models';

type Vec=readonly[number,number,number];
const smooth=T.MathUtils.smoothstep;
const point=(x:number,y:number,z:number)=>new T.Vector3(x,y,z);
const rest=(x:number,y:number,z:number)=>point(y+.04,z-1.565,x);
function bone(a:T.Vector3,b:T.Vector3,c:T.Vector3,d:T.Vector3){
  const axis=b.clone().sub(a),target=d.clone().sub(c),ratio=target.length()/axis.length();axis.normalize();
  const q=new T.Quaternion().setFromUnitVectors(axis,target.normalize());
  return (p:T.Vector3)=>{const v=p.clone().sub(a);return v.addScaledVector(axis,v.dot(axis)*(ratio-1)).applyQuaternion(q).add(c);};
}
type SurfacePoint={p:T.Vector3;n:T.Vector3;source:T.Vector3;c:T.Vector3;d:number};
function clipSurface(polygon:SurfacePoint[]){
  const result:SurfacePoint[]=[];
  for(let i=0;i<polygon.length;i++){
    const a=polygon[i],b=polygon[(i+1)%polygon.length];if(a.d>=0)result.push(a);
    if((a.d>=0)!==(b.d>=0)){
      const blend=a.d/(a.d-b.d);
      result.push({p:a.p.clone().lerp(b.p,blend),n:a.n.clone().lerp(b.n,blend).normalize(),source:a.source.clone().lerp(b.source,blend),c:a.c.clone().lerp(b.c,blend),d:0});
    }
  }
  return result;
}

/** CC0 anatomical topology, posed into the seat; no spherical head or cylinder limbs. */
export function buildSeatedDriver(t:CollectionTruck,head:Vec,add:AddVehiclePart){
  const serial=Number(t.driver.id.slice(-3)),positions=base.positions;
  const width=.94+(serial%7)*.018,height=.96+(serial%5)*.017;
  const tiedHair=serial%2===0,build=.94+(serial%5)*.035;
  const hairColor=new T.Color(t.driver.hair),skinColor=new T.Color(t.driver.skin);
  const put:AddVehiclePart=(geometry,part,at,rotation)=>{
    if(part==='hair'&&!geometry.attributes.color){
      const color:number[]=[];for(let i=0;i<geometry.attributes.position.count;i++)color.push(hairColor.r,hairColor.g,hairColor.b);
      geometry.setAttribute('color',new T.Float32BufferAttribute(color,3));
    }
    add(geometry,part,at,rotation);
  };
  const posed:number[]=[],colors:number[]=[];
  const arms=[-1,1].map(s=>[
    bone(rest(s*.17,0,1.38),rest(s*.31,-.01,1.17),point(0,-.24,s*.17),point(-.06,-.48,s*.195)),
    bone(rest(s*.31,-.01,1.17),rest(s*.40,-.045,.97),point(-.06,-.48,s*.195),point(-.27,-.40,s*.185)),
    bone(rest(s*.40,-.045,.97),rest(s*.43,-.12,.73),point(-.27,-.40,s*.185),point(-.43,-.39,s*.185)),
  ]);
  const legs=[-1,1].map(s=>[
    bone(rest(s*.10,0,.85),rest(s*.10,-.025,.45),point(0,-.62,s*.10),point(-.31,-.67,s*.10)),
    bone(rest(s*.10,-.025,.45),rest(s*.09,-.015,.06),point(-.31,-.67,s*.10),point(-.41,-1.08,s*.10)),
  ]);
  const skinDistance=(x:number,z:number)=>Math.max(z-1.43,Math.min(.55*(Math.abs(x)-.17)-.84*(z-1.38)-.235,Math.abs(x)-.28,z-.68));
  const region=(x:number,z:number):VehiclePart=>skinDistance(x,z)>0?'skin':z<.12?'frame':'uniform';
  for(let i=0;i<positions.length;i+=3){
    const x=positions[i],y=positions[i+1],z=positions[i+2],side=x<0?0:1,part=region(x,z);
    let p=rest(x,y,z);
    // The source's outer toes reach x=.27482; the narrower mask left them standing.
    if(z<.96&&Math.abs(x)<.28){
      const upper=legs[side][0](p),lower=legs[side][1](p);
      lower.lerp(upper,smooth(z,.39,.51));
      p.lerp(lower,1-smooth(z,.85,.96));
    }
    if(z>.68&&z<1.46&&Math.abs(x)>.125){
      const upper=arms[side][0](rest(x,y,z)),lower=arms[side][1](rest(x,y,z)),hand=arms[side][2](rest(x,y,z));
      hand.lerp(lower,smooth(z,.935,1.005));hand.lerp(upper,smooth(z,1.12,1.22));
      p.lerp(hand,z<1.22?(Math.abs(x)>.21?1:0):smooth(Math.abs(x),.125,.205));
      if(Math.abs(x)>.30&&z<.91){const curl=1-smooth(z,.74,.91);p.x+=.043*curl;p.y-=.052*curl;}
    }
    if(z>1.43){
      p.z*=width;
      p.y*=height;
      // Different jaw, nose and cheek proportions retain the source's facial topology.
      p.x-=(.003+(serial%4)*.0015)*Math.exp(-Math.pow((z-1.565)/.022,2))*Math.exp(-Math.pow(x/.025,2));
      p.z*=1+(serial%3-.8)*.055*Math.exp(-Math.pow((z-1.515)/.045,2));
      if(tiedHair)p.z*=1-.10*Math.exp(-Math.pow((z-1.515)/.035,2));
    }else if(part==='uniform'&&z>.92){
      const fold=.009+.003*Math.sin(z*93+x*27);
      p.x+=y<-.025?-fold:fold;p.z+=Math.sign(x)*.007;
      const torso=smooth(z,.94,1.06)*(1-smooth(z,1.33,1.43))*(1-smooth(Math.abs(x),.16,.24));
      p.z*=1+(build-1)*torso;p.x-=.012*torso*(y<-.025?1:-1);
    }
    posed.push(p.x+head[0],p.y+head[1],p.z+head[2]);
    const front=smooth(-y,.07,.12),lip=front*Math.exp(-Math.pow((z-1.523)/.009,2))*Math.exp(-Math.pow(x/.028,4));
    const cheek=front*Math.exp(-Math.pow((Math.abs(x)-.052)/.021,2))*Math.exp(-Math.pow((z-1.557)/.024,2));
    const socket=front*Math.exp(-Math.pow((Math.abs(x)-.032)/.019,2))*Math.exp(-Math.pow((z-1.592)/.014,2));
    const shade=part==='skin'?[1-.18*lip-.07*socket,.96-.38*lip-.07*cheek-.08*socket,.92-.34*lip-.06*cheek-.08*socket]:z<.92?[.22,.25,.30]:[1,1,1];
    if(part==='skin'&&!tiedHair&&serial%3===0){
      const edge=Math.min(z-1.477,1.545+.040*smooth(Math.abs(x),.025,.075)-z,-.043-y,.082-Math.abs(x),(Math.hypot(x/.031,(z-1.522)/.017)-1)*.015);
      const coverage=(.50+.12*Math.sin(x*900+z*700))*smooth(edge,0,.014);
      for(let k=0;k<3;k++)shade[k]=T.MathUtils.lerp(shade[k],hairColor.toArray()[k]/skinColor.toArray()[k],coverage);
    }
    colors.push(...shade);
  }
  const full=new T.BufferGeometry();full.setAttribute('position',new T.Float32BufferAttribute(posed,3));full.setIndex(base.indices);full.computeVertexNormals();
  const sample=(v:number):SurfacePoint=>({p:point(posed[v*3],posed[v*3+1],posed[v*3+2]),n:point(full.attributes.normal.getX(v),full.attributes.normal.getY(v),full.attributes.normal.getZ(v)),source:point(positions[v*3],positions[v*3+1],positions[v*3+2]),c:point(colors[v*3],colors[v*3+1],colors[v*3+2]),d:skinDistance(positions[v*3],positions[v*3+2])});
  const groups=new Map<VehiclePart,{p:number[];n:number[];c:number[];uv:number[]}>();
  for(let i=0;i<base.indices.length;i+=3){
    const triangle=base.indices.slice(i,i+3).map(sample),foot=triangle.every(v=>v.source.z<.12);
    for(const part of (foot?['frame']:['skin','uniform']) as VehiclePart[]){
      const polygon=foot?triangle:clipSurface(triangle.map(v=>({...v,d:v.d*(part==='skin'?1:-1)}))),bucket=groups.get(part)??{p:[],n:[],c:[],uv:[]};
      for(let j=1;j+1<polygon.length;j++)for(const v of [polygon[0],polygon[j],polygon[j+1]]){
        const p=v.p.clone().addScaledVector(v.n,part==='uniform'?.003:0);
        bucket.p.push(p.x,p.y,p.z);bucket.n.push(v.n.x,v.n.y,v.n.z);bucket.c.push(v.c.x,v.c.y,v.c.z);bucket.uv.push(v.source.x*3+v.source.z,v.source.y*3+v.source.z);
      }
      groups.set(part,bucket);
    }
  }
  for(const [part,bucket] of groups){
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(bucket.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(bucket.n,3));g.setAttribute('color',new T.Float32BufferAttribute(bucket.c,3));g.setAttribute('uv',new T.Float32BufferAttribute(bucket.uv,2));add(g,part);
  }
  // Clip triangles at the hairline instead of leaving a stair-step polygon edge.
  const hairSurface=(distance:(x:number,y:number,z:number)=>number)=>{
    const values:number[]=[],normals:number[]=[],shades:number[]=[],tex:number[]=[];
    for(let i=0;i<base.indices.length;i+=3){
      const polygon=base.indices.slice(i,i+3).map(v=>({...sample(v),d:distance(positions[v*3],positions[v*3+1],positions[v*3+2])})),clipped=clipSurface(polygon);
      for(let j=1;j+1<clipped.length;j++)for(const v of [clipped[0],clipped[j],clipped[j+1]]){
        const {x,z}=v.source,crown=smooth(z,1.60,1.68),parting=Math.exp(-Math.pow((x-.018)/.006,2));
        const coverage=smooth(v.d,0,.012),p=v.p.clone().addScaledVector(v.n,.0015*coverage);
        p.y+=crown*((tiedHair?.003:.004)-parting*.002+.0015*Math.sin(x*300+z*40))*coverage;
        const grain=.88+.09*Math.sin(x*1300+z*170),color=skinColor.clone().lerp(hairColor.clone().multiplyScalar(grain),coverage);
        values.push(p.x,p.y,p.z);normals.push(v.n.x,v.n.y,v.n.z);shades.push(color.r,color.g,color.b);tex.push(x*12,z*12);
      }
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(values,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('color',new T.Float32BufferAttribute(shades,3));g.setAttribute('uv',new T.Float32BufferAttribute(tex,2));put(g,'hair');
  };
  if(tiedHair||serial%9!==0)hairSurface((x,y,z)=>z-T.MathUtils.lerp(1.566,1.632-(serial%3)*.005,smooth(-y,.035,.105))+.008*smooth(Math.abs(x),.04,.08)+.0012*Math.sin(x*340)*smooth(-y,.04,.10));
  const dot=(scale:Vec,at:Vec,part:VehiclePart)=>{const g=new T.SphereGeometry(1,12,8);g.scale(...scale);put(g,part,[head[0]+at[0],head[1]+at[1],head[2]+at[2]]);};
  const stitch=(path:Vec[],part:VehiclePart,r=.002)=>put(new T.TubeGeometry(new T.CatmullRomCurve3(path.map(p=>point(p[0]+head[0],p[1]+head[1],p[2]+head[2]))),20,r,4,false),part);
  for(const s of [-1,1]){
    const y=.019*height,z=s*.032*width;
    dot([.007,.0052,.0105],[-.097,y,z],'white');
    dot([.0024,.0042,.0046],[-.105,y,z],'hair');
    dot([.0012,.0025,.0027],[-.1075,y,z],'frame');
    dot([.0008,.0011,.0011],[-.109,y+.0015,z+.0012],'white');
    stitch([[-.099,y,z-.0105],[-.104,y+.0058,z],[-.099,y,z+.0105]],'skin',.0014);
    stitch([[-.099,y,z-.0105],[-.103,y-.0048,z],[-.099,y,z+.0105]],'skin',.0010);
    stitch([[-.098,.041*height,s*.017*width],[-.102,.046*height,s*.032*width],[-.094,.040*height,s*.054*width]],'hair',tiedHair?.0018:.0025);
  }
  const cloth=(points:Vec[])=>{
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points.flatMap(p=>[head[0]+p[0],head[1]+p[1],head[2]+p[2]]),3));
    g.setIndex([0,1,2,0,2,3,2,1,0,3,2,0]);const fabric=g.toNonIndexed();g.dispose();fabric.computeVertexNormals();put(fabric,'uniform');
  };
  for(const side of [-1,1]){
    cloth([[-.045,-.15,side*.05],[-.117,-.19,side*.083],[-.147,-.27,side*.033],[-.123,-.21,side*.008]]);
    stitch([[-.046,-.15,side*.051],[-.118,-.19,side*.084],[-.148,-.268,side*.034]],'uniform',.0009);
    const cuff=new T.CylinderGeometry(.044,.047,.035,24,1,true);cuff.applyQuaternion(new T.Quaternion().setFromUnitVectors(point(0,1,0),point(-.06,-.24,side*.025).normalize()));put(cuff,'uniform',[head[0]-.056,head[1]-.463,head[2]+side*.194]);
  }
  put(new T.BoxGeometry(.008,.155,.020),'uniform',[head[0]-.147,head[1]-.32,head[2]]);
  cloth([[-.146,-.29,.055],[-.144,-.30,.125],[-.148,-.39,.12],[-.150,-.40,.06]]);
  stitch([[-.147,-.30,.056],[-.151,-.40,.06],[-.149,-.39,.12],[-.145,-.31,.124]],'uniform',.0008);
  for(let i=0;i<3;i++)dot([.002,.003,.003],[-.154,-.27-i*.034,0],'white');
  if(serial%7===2){
    for(const side of [-1,1]){
      const z=side*.033*width,y=.020*height;
      stitch([[-.119,y+.009,z-.018],[-.121,y+.012,z],[-.119,y+.009,z+.018],[-.119,y-.009,z+.017],[-.121,y-.010,z],[-.119,y-.009,z-.017],[-.119,y+.009,z-.018]],'frame',.0015);
      stitch([[-.119,y+.004,side*.052*width],[-.09,y+.007,side*.076],[-.015,y+.004,side*.083]],'frame',.0015);
    }
    stitch([[-.121,.022,-.014],[-.124,.027,0],[-.121,.022,.014]],'frame',.0015);
  }
  const beltPath=[[-.025,-.17,.165],[-.115,-.32,.075],[-.156,-.46,-.01],[-.148,-.65,-.135]] as const;
  const curve=new T.CatmullRomCurve3(beltPath.map(p=>point(p[0]+head[0],p[1]+head[1],p[2]+head[2]))),belt:number[]=[],beltIndices:number[]=[];
  const torso=new T.Mesh(full,new T.MeshBasicMaterial()),beltRay=new T.Raycaster();torso.updateMatrixWorld();
  for(let i=0;i<=16;i++){
    const p=curve.getPoint(i/16),tangent=curve.getTangent(i/16),edge=point(0,-tangent.z,tangent.y).normalize().multiplyScalar(.022);
    beltRay.set(point(head[0]-.8,p.y,p.z),point(1,0,0));const surface=beltRay.intersectObject(torso)[0];if(surface)p.x=Math.min(p.x,surface.point.x-.012);
    for(const depth of [-.003,.003])for(const side of [-1,1])belt.push(p.x+depth,p.y+edge.y*side,p.z+edge.z*side);
    if(i)for(const [a,b] of [[0,1],[1,3],[3,2],[2,0]]){
      const offset=(i-1)*4;beltIndices.push(offset+a,offset+b,offset+4+b,offset+a,offset+4+b,offset+4+a);
    }
  }
  const webbing=new T.BufferGeometry();webbing.setAttribute('position',new T.Float32BufferAttribute(belt,3));webbing.setIndex(beltIndices);webbing.computeVertexNormals();add(webbing,'rubber');
  torso.material.dispose();full.dispose();
  add(new T.BoxGeometry(.025,.045,.040),'metal',[head[0]-.153,head[1]-.64,head[2]-.13]);
  add(new T.BoxGeometry(.028,.024,.025),'red',[head[0]-.166,head[1]-.64,head[2]-.13]);
  if(tiedHair){
    const tail=new T.CatmullRomCurve3([point(.087,.042,0),point(.130,.025,0),point(.148,-.065,.006),point(.128,serial%4===0?-.14:-.23,.009)]),vertices:number[]=[],indices:number[]=[],tailUv:number[]=[];
    const frames=tail.computeFrenetFrames(14,false);
    for(let i=0;i<=14;i++){
      const center=tail.getPoint(i/14),radius=.002+.025*Math.pow(1-i/14,.8);
      for(let j=0;j<12;j++){
        const a=j*Math.PI/6,r=radius*(1+.05*Math.sin(j*7+i*1.7)),p=center.clone().addScaledVector(frames.normals[i],Math.cos(a)*r).addScaledVector(frames.binormals[i],Math.sin(a)*r);
        vertices.push(p.x+head[0],p.y+head[1],p.z+head[2]);
        tailUv.push(j/12*2,i/14*2);
        if(i){const k=i*12+j,n=i*12+(j+1)%12;indices.push(k-12,n-12,n,k-12,n,k);}
      }
    }
    const hair=new T.BufferGeometry();hair.setAttribute('position',new T.Float32BufferAttribute(vertices,3));hair.setAttribute('uv',new T.Float32BufferAttribute(tailUv,2));hair.setIndex(indices);hair.computeVertexNormals();put(hair,'hair');
    stitch([[.095,.035,-.024],[.112,.034,0],[.095,.035,.024]],'rubber',.003);
  }
  return {source:base.source,vertices:positions.length/3,pose:'seated-steering',identity:serial};
}
