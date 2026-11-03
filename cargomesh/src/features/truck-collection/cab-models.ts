import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { TessellateModifier } from 'three/addons/modifiers/TessellateModifier.js';
import type { CollectionTruck } from './catalog';
import { buildSeatedDriver } from './driver-model';
import { addMarking } from './markings';

type Vec=readonly[number,number,number];
export type VehiclePart='paint'|'body'|'metal'|'frame'|'rubber'|'glass'|'cargoGlass'|'seat'|'wood'|'load'|'strap'|'lamp'|'red'|'amber'|'skin'|'uniform'|'hair'|'white'|'print'|'grille'|'wrap';
export type AddVehiclePart=(g:T.BufferGeometry,m:VehiclePart,p?:Vec,rot?:Vec)=>void;

/** Original coachwork, in metres. Engine, passenger cell and sleeper occupy separate volumes. */
export function buildVehicleCab(t:CollectionTruck,front:number,radius:number,add:AddVehiclePart){
  const d=t.design,small=t.size==='small',large=t.size==='large',serial=Number(t.driver.id.slice(-3));
  const W=t.widthM*d.width,back=front+d.cabLength-.06,axle=front+d.frontAxle;
  const low=d.architecture==='step'||d.architecture==='low-entry'?.30:small?.43:large?.65:.54;
  const base=front+Math.max(d.nose,.13),top=base+d.rake;
  const roofFront=d.roof;
  const wt=Math.min(roofFront-.21,large?3.20:small?2.60:3.02),sill=wt-(small?.78:large?.99:.91);
  const seatX=Math.min(back-.42,base+Math.max(d.rake+.46,.92));
  const doorEnd=Math.min(back-.12,Math.max(seatX+.39,top+.65));
  const neck=d.sleeper?Math.min(back-.4,doorEnd+.16):back;
  const place=add;
  const curvedZ=(x:number,y:number,z:number)=>{
    const edge=T.MathUtils.smoothstep(Math.abs(z),W*.34,W*.49);
    return z-Math.sign(z)*(.065*T.MathUtils.smoothstep(y,sill,roofFront)+.025*(1-T.MathUtils.smoothstep(x,base,base+.30)))*edge;
  };
  add=(geometry,material,p=[0,0,0],rotation=[0,0,0])=>{
    geometry.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...p),new T.Quaternion().setFromEuler(new T.Euler(...rotation)),new T.Vector3(1,1,1)));
    const vertices=geometry.attributes.position,normals=geometry.attributes.normal;
    for(let i=0;i<vertices.count;i++){
      const x=vertices.getX(i),y=vertices.getY(i),z=vertices.getZ(i),e=.001;
      const zx=(curvedZ(x+e,y,z)-curvedZ(x-e,y,z))/(2*e),zy=(curvedZ(x,y+e,z)-curvedZ(x,y-e,z))/(2*e),zz=(curvedZ(x,y,z+e)-curvedZ(x,y,z-e))/(2*e);
      const nz=normals.getZ(i)/zz,n=new T.Vector3(normals.getX(i)-nz*zx,normals.getY(i)-nz*zy,nz).normalize();
      vertices.setZ(i,curvedZ(x,y,z));normals.setXYZ(i,n.x,n.y,n.z);
    }
    place(geometry,material);
  };
  const box=(s:Vec,p:Vec,m:VehiclePart,r=.02,rot:Vec=[0,0,0])=>add(r?new RoundedBoxGeometry(...s,Math.min(...s)<.18?1:2,Math.min(r,...s.map(v=>v/3))):new T.BoxGeometry(...s),m,p,rot);
  const sphere=(s:Vec,p:Vec,m:VehiclePart)=>{const g=new T.SphereGeometry(1,16,12);g.scale(...s);add(g,m,p);};
  const cyl=(r:number,h:number,p:Vec,m:VehiclePart,rot:Vec=[0,0,0],n=16)=>add(new T.CylinderGeometry(r,r,h,n),m,p,rot);
  const bar=(a:Vec,b:Vec,r:number,m:VehiclePart)=>{const x=new T.Vector3(...a),v=new T.Vector3(...b).sub(x),g=new T.CylinderGeometry(r,r,v.length(),8);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.normalize()));add(g,m,x.add(new T.Vector3(...b)).multiplyScalar(.5).toArray() as [number,number,number]);};
  const seam=(points:Vec[],r=.006,m:VehiclePart='rubber',closed=false)=>{
    const path=new T.CurvePath<T.Vector3>(),vertices=points.map(p=>new T.Vector3(...p));
    if(closed)vertices.push(vertices[0]);
    for(let i=1;i<vertices.length;i++)path.add(new T.LineCurve3(vertices[i-1],vertices[i]));
    add(new T.TubeGeometry(path,Math.max(12,points.length*4),r,5,closed),m);
  };
  const surface=(fn:(u:number,v:number)=>Vec,m:VehiclePart,cols=16,rows=8)=>{
    const p:number[]=[],uv:number[]=[],idx:number[]=[];
    for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){p.push(...fn(i/cols,j/rows));uv.push(i/cols,j/rows);}
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i;idx.push(a,a+1,a+cols+1,a+1,a+cols+2,a+cols+1);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();add(g,m);
  };
  const frontSurface=(y0:number,y1:number,x0:number,x1:number,w0:number,w1:number,m:VehiclePart,bow=.12)=>surface((u,v)=>[x0+(x1-x0)*v+bow*Math.pow(Math.abs(u-.5)*2,3),y0+(y1-y0)*v,(u-.5)*(w0+(w1-w0)*v)],m);
  const windowShape=(x0:number,x1:number,y0:number,y1:number,rake:number)=>{
    const s=new T.Shape();s.moveTo(x0+.04,y0);s.lineTo(x0+rake+.04,y1-.06);s.quadraticCurveTo(x0+rake+.06,y1,x0+rake+.14,y1);s.lineTo(x1-.08,y1);s.quadraticCurveTo(x1,y1,x1,y1-.08);s.lineTo(x1,y0+.07);s.quadraticCurveTo(x1,y0,x1-.08,y0);s.closePath();return s;
  };
  const window=windowShape(base+.06,doorEnd-.05,sill+.045,wt-.025,d.rake);
  const windows=[window];
  if(d.crew&&back-doorEnd>.40)windows.push(windowShape(doorEnd+.10,back-.13,sill+.06,wt-.03,.04));
  if(d.sleeper&&back-doorEnd>.60)windows.push(windowShape(doorEnd+.20,back-.17,wt-.18,wt+.12,.04));

  for(const side of [-1,1]){
    const z=side*W/2,shell=new T.Shape(),ar=radius+.095,dy=low-radius;
    const wheelAt=(x:number)=>Math.abs(x-axle)<ar?radius+Math.sqrt(ar*ar-(x-axle)**2):low;
    shell.moveTo(base-.02,Math.max(low,wheelAt(base-.02)));shell.lineTo(base-.02,sill-.12);shell.quadraticCurveTo(base-.02,sill,base+.03,sill+.10);
    shell.lineTo(top+.03,roofFront-.18);shell.quadraticCurveTo(top+.10,roofFront,top+.26,roofFront);
    if(d.sleeper&&d.roof>roofFront+.05){shell.lineTo(neck-.20,roofFront);shell.quadraticCurveTo(neck,roofFront,neck+.10,d.roof-.14);}
    shell.lineTo(back-.14,d.roof);shell.quadraticCurveTo(back,d.roof,back,d.roof-.14);shell.lineTo(back,low);
    if(Math.abs(dy)<ar&&axle+ar<back&&axle+ar>base){const dx=Math.sqrt(ar*ar-dy*dy),left=Math.max(base-.02,axle-dx);shell.lineTo(axle+dx,low);shell.absarc(axle,radius,ar,Math.asin(dy/ar),Math.acos((left-axle)/ar),false);}
    shell.lineTo(base-.02,Math.max(low,wheelAt(base-.02)));shell.closePath();
    for(const w of windows)shell.holes.push(new T.Path(w.getPoints(18)));
    const sheet=new T.ExtrudeGeometry(shell,{depth:.045,bevelEnabled:true,bevelThickness:.023,bevelSize:.043,bevelSegments:3,curveSegments:16});
    add(new TessellateModifier(.28,3).modify(sheet),'paint',[0,0,side===1?W/2-.045:-W/2]);sheet.dispose();
    for(const w of windows){add(new T.ShapeGeometry(w,16),'glass',[0,0,z+side*.018]);seam(w.getPoints(16).map(p=>[p.x,p.y,z+side*.025] as Vec),.014,'rubber',true);}
    // Bowed lower door skin and stamped shoulder remove the old flat slab appearance.
    const doorLow=Math.max(low+.18,radius*1.5),x0=Math.max(base+.08,axle+radius+.11);
    if(doorEnd>x0+.14)surface((u,v)=>[x0+(doorEnd-x0)*(side>0?u:1-u),doorLow+(sill-.08-doorLow)*v,z+side*(.025+.035*Math.sin(u*Math.PI)*Math.sin(v*Math.PI))],'paint',12,5);
    seam([[base+.13,sill-.08,z+side*.045],[doorEnd+.01,sill-.08,z+side*.045],[doorEnd+.02,low+.13,z+side*.03],[Math.max(base+.13,axle+radius+.11),low+.13,z+side*.03]],.005);
    box([.25,.075,.017],[doorEnd-.20,sill-.16,z+side*.038],'frame',.03);
    box([.19,.026,.035],[doorEnd-.20,sill-.15,z+side*.057],'metal',.012);
    box([.035,.035,.022],[doorEnd-.06,sill-.16,z+side*.06],'frame',.01);
    addMarking(add,2,.34,.17,[doorEnd-.32,sill-.38,z+side*.07],side===1?[0,0,0]:[0,Math.PI,0]);
    if(d.crew){seam([[doorEnd+.08,wt-.03,z+side*.03],[doorEnd+.08,low+.08,z+side*.03],[back-.08,low+.08,z+side*.03],[back-.08,wt-.03,z+side*.03]],.006);box([.18,.028,.04],[back-.3,sill-.15,z+side*.04],'frame');}
    const stepX=d.hood?base+.4:Math.min(back-.3,axle+radius+.26),steps=small?1:large?3:2;
    for(let i=0;i<steps;i++){const y=.28+i*.23;box([d.hood?.66:.48,.055,.28],[stepX,y,z-side*.04],'frame',.025);for(let r=0;r<6;r++)box([.035,.008,.22],[stepX-.20+r*.075,y+.033,z-side*.04],'metal',.003);}
    if(d.architecture==='step'||d.architecture==='low-entry'){
      const bottomWindow=windowShape(Math.max(base+.1,axle+radius+.14),back-.15,.52,sill-.22,.04);
      if(back-.15>Math.max(base+.1,axle+radius+.14)+.2){add(new T.ShapeGeometry(bottomWindow),'glass',[0,0,z+side*.037]);seam(bottomWindow.getPoints(10).map(p=>[p.x,p.y,z+side*.045] as Vec),.014,'frame',true);}
      bar([doorEnd-.13,.66,z+side*.07],[doorEnd-.13,1.22,z+side*.07],.018,'metal');
    }
    const mirrorX=base+.06,my=sill+(wt-sill)*.64,mz=side*(W/2+.22);
    const compactMirror=small&&d.hood;
    bar([mirrorX+.13,my-.18,z],[mirrorX-.02,my,mz],.025,'frame');
    if(!compactMirror)bar([mirrorX+.12,my+.24,z],[mirrorX-.02,my+.21,mz],.019,'frame');
    box([compactMirror?.19:.17,compactMirror?.22:.44,.18],[mirrorX-.04,my,mz],'frame',.055);
    box([.018,compactMirror?.17:.36,.13],[mirrorX+.055,my,mz],'metal',.035);
    if(!small){box([.14,.14,.17],[mirrorX-.04,my-.33,mz],'frame',.04);box([.015,.1,.12],[mirrorX+.04,my-.33,mz],'metal',.02);}
    box([.14,.045,.022],[base+.17,sill-.24,z+side*.04],'amber',.014);
    if(d.sleeper){
      box([Math.max(.28,back-neck-.08),.42,.06],[(neck+back)/2,low+.43,z+side*.025],'paint',.07);
      for(let v=0;v<5;v++)box([.27,.02,.025],[back-.29,sill+.03+v*.052,z+side*.04],'frame',.004);
      seam([[back-.07,low+.15,z+side*.04],[neck+.10,low+.15,z+side*.04],[neck+.10,d.roof-.20,z+side*.04]],.005);
    }
    if(d.architecture==='long-hood'||d.architecture==='conventional'){
      cyl(.085,roofFront-low-.15,[back+.15,(roofFront+low)/2,side*W*.49],'metal');cyl(.105,.14,[back+.15,low+.24,side*W*.49],'frame');
      bar([back+.06,roofFront-.25,z],[back+.15,roofFront-.25,side*W*.49],.025,'frame');
    }
  }
  // Crowned roof with a separate raised sleeper; rounded shoulders have actual curvature.
  surface((u,v)=>{const x=top+.15+(back-top-.15)*v,ry=d.sleeper?roofFront+(d.roof-roofFront)*T.MathUtils.smoothstep(x,neck-.20,neck+.22):d.roof;return[x,ry+.065*Math.sin(u*Math.PI),(u-.5)*(W-.04)];},'paint',20,12);
  box([.08,d.roof-low,W-.05],[back,low+(d.roof-low)/2,0],'paint',.055);
  box([back-base,.08,W-.15],[(base+back)/2,low+.12,0],'frame');
  const bow=d.architecture==='round'?.23:d.architecture==='retro'?.05:.14;
  frontSurface(sill,wt,base-.025,top-.025,W-.13,W-.22,'glass',bow);
  frontSurface(wt+.02,roofFront-.025,top,top+.13,W-.10,W-.08,'paint',bow);
  if(large&&roofFront-wt>.42)addMarking(add,2,1.15,.36,[top-.012,wt+.28,0],[0,-Math.PI/2,0]);
  for(const side of [-1,1])bar([base+.08,sill,side*(W/2-.065)],[top+.08,wt,side*(W/2-.11)],.027,'paint');
  seam(Array.from({length:21},(_,i)=>[base-.025+bow*Math.pow(Math.abs(i/20-.5)*2,3),sill,(i/20-.5)*(W-.13)] as Vec),.021);
  seam(Array.from({length:21},(_,i)=>[top-.025+bow*Math.pow(Math.abs(i/20-.5)*2,3),wt,(i/20-.5)*(W-.22)] as Vec),.019);
  if(d.architecture==='retro'||d.architecture==='step')bar([base-.03,sill,0],[top-.03,wt,0],.025,'rubber');
  const hoodTop=sill-.10,drop=['long-hood','conventional'].includes(d.architecture)?.14:['panel','city','aero-hood'].includes(d.architecture)?.22:.24,frontTop=d.hood?hoodTop-drop:sill-.05;
  if(d.hood){
    box([.30,.20,W*.91],[base+.015,sill-.12,0],'paint',.045);
    frontSurface(hoodTop,sill,base-.035,base-.025,W*.91,W-.13,'paint',.10);
    const tipW=W*(d.architecture==='long-hood'?.66:d.architecture==='conventional'?.78:.92);
    surface((u,v)=>[front-.02+.09*v,low+.08+(frontTop+.09*Math.sin(u*Math.PI)-low-.08)*v,(u-.5)*tipW],'paint',18,8);
    surface((u,v)=>{const cross=Math.sin(u*Math.PI),x=front+.07+(base-front-.04)*v;return[x,frontTop+(hoodTop-frontTop)*v+.07*cross+.018*Math.sin(v*Math.PI)*cross,(u-.5)*(tipW+(W*.94-tipW)*v)];},'paint',24,16);
    for(const side of [-1,1]){
      surface((u,v)=>{const q=side>0?u:1-u;return[front-.02+.09*v+.09*(1-v)*q,low+.08+(frontTop-low-.08)*v,side*(tipW/2+.035*Math.sin(v*Math.PI)*q)];},'paint',4,6);
      surface((u,v)=>{const q=side>0?u:1-u,x=front+.07+(base-front-.02)*q,r=radius+.095,bottom=Math.abs(x-axle)<r?Math.max(low+.08,radius+Math.sqrt(r*r-(x-axle)**2)):low+.08;return[x,bottom+(frontTop+(hoodTop-frontTop)*q-bottom)*v,side*(tipW+(W*.94-tipW)*q)/2+side*.025*Math.sin(v*Math.PI)];},'paint',28,10);
      seam([[front+.18,frontTop-.035,side*tipW*.48],[base-.08,hoodTop-.035,side*W*.445]],.006);
      for(let slat=0;slat<(['long-hood','conventional','expedition'].includes(d.architecture)?7:0);slat++){
        const x=base-.18-slat*.065,u=T.MathUtils.clamp((x-front-.07)/(base-front-.04),0,1);
        box([.030,.13,.024],[x,frontTop+(hoodTop-frontTop)*u-.115,side*((tipW+(W*.91-tipW)*u)/2+.014)],'frame',.006,[0,0,-.12]);
      }
    }
  }else{
    const corner=.16;
    frontSurface(low+.12,sill-.025,front+.015,base-.025,W-corner*2,W-corner*2,'paint',.025);
    for(const side of [-1,1])surface((u,v)=>{
      const angle=(side>0?u:1-u)*Math.PI/2;
      return[front+.015+(base-front-.04)*v+corner*(1-Math.cos(angle)),low+.12+(sill-low-.145)*v,side*(W/2-corner+corner*Math.sin(angle))];
    },'paint',12,14);
    // Pressed cowl under the glazing and the lower service panel form separate stamped parts.
    frontSurface(sill-.24,sill-.045,base-.03,base-.025,W-.15,W-.13,'frame',.06);
    for(const side of [-1,1])seam([[front+.02,low+.19,side*W*.43],[front+.03,sill-.30,side*W*.43],[base+.04,sill-.12,side*W*.46]],.004);
  }
  const grilleBottom=low+.22,grilleTop=Math.max(grilleBottom+.27,frontTop-.12),gh=grilleTop-grilleBottom,gz=W*(d.front==='vertical'?.48:d.front==='oval'?.58:.65),gy=(grilleTop+grilleBottom)/2;
  box([.12,gh+.055,gz+.055],[front-.025,gy,0],d.front==='bars'||d.front==='vertical'?'metal':'paint',.055);
  box([.065,gh,gz],[front-.055,gy,0],'frame',d.front==='oval'?.15:.035);
  if(d.front==='vertical')for(let n=0;n<12;n++)box([.023,gh-.045,.017],[front-.096,gy,(n-5.5)*gz/12],'metal',.004);
  else if(d.front==='mesh'){
    add(new T.PlaneGeometry(gz-.035,gh-.035),'grille',[front-.091,gy,0],[0,-Math.PI/2,0]);
    if(!small)for(const ratio of [.30,.66])box([.033,.055,gz+.02],[front-.103,grilleBottom+gh*ratio,0],'paint',.016);
  }else{
    const ribs=d.front==='bars'?4:d.front==='split'?3:d.front==='inset'?2:6;
    for(let n=0;n<ribs;n++)box([.025,d.front==='bars'?.028:.017,gz-.04],[front-.096,grilleBottom+.045+n*(gh-.09)/(ribs-1),0],d.front==='bars'||d.front==='horizontal'?'metal':'rubber',.005);
    if(d.front==='split'||d.front==='shield')box([.035,gh+.03,.065],[front-.11,gy,0],'paint',.012);
  }
  box([.25,.22,W*.98],[front+.04,low+.015,0],d.architecture==='expedition'?'metal':'paint',.075);
  box([.23,.075,W*.78],[front+.025,low-.10,0],'frame',.025);
  if(!d.hood&&!small){
    for(const side of [-1,1]){
      const z=side*W*.40,h=large?.57:.43,w=W*.12,hy=low+.40;
      const outline=new T.Shape();outline.moveTo(-w*.48,-h*.46);outline.lineTo(w*.40,-h*.50);outline.quadraticCurveTo(w*.56,-h*.45,w*.42,-h*.25);outline.lineTo(w*.22,h*.42);outline.quadraticCurveTo(w*.18,h*.52,-w*.12,h*.48);outline.lineTo(-w*.42,-h*.20);outline.closePath();
      add(new T.ExtrudeGeometry(outline,{depth:.04,bevelEnabled:true,bevelSize:.012,bevelThickness:.009,bevelSegments:3}),'frame',[front-.055,hy,z],[0,-Math.PI/2,0]);
      const lining=new T.ShapeGeometry(outline);lining.scale(.86,.90,1);add(lining,'metal',[front-.107,hy,z],[0,-Math.PI/2,0]);
      for(const yy of [-h*.23,h*.12]){cyl(.067,.016,[front-.119,hy+yy,z],'frame',[0,0,Math.PI/2],24);sphere([.015,.054,.054],[front-.132,hy+yy,z],'lamp');}
      seam([[front-.134,hy-h*.36,z-side*w*.27],[front-.134,hy+h*.34,z-side*w*.04],[front-.134,hy+h*.39,z+side*w*.18]],.009,'white');
      box([.015,.027,w*.70],[front-.132,hy-h*.39,z],'amber',.008);
    }
  }
  for(const side of [-1,1]){
    const z=side*W*.39,hy=d.hood?frontTop-.20:low+.39;
    if(!d.hood&&!small){/* Integrated multi-projector cluster above. */}
    else if(d.lamps==='round'||d.lamps==='twin'){
      const count=d.lamps==='twin'?2:1;
      for(let n=0;n<count;n++){const zz=z+(n-(count-1)/2)*.16; cyl(.091,.065,[front-.055,hy,zz],'frame',[0,0,Math.PI/2],24);cyl(.076,.015,[front-.095,hy,zz],'metal',[0,0,Math.PI/2],24);sphere([.013,.066,.066],[front-.108,hy,zz],'lamp');}
    }else if(d.lamps==='vertical'){
      box([.085,.36,.17],[front-.025,hy+.06,z],'frame',.045);for(let n=0;n<3;n++)box([.025,.078,.125],[front-.08,hy-.05+n*.106,z],'lamp',.025);
    }else{
      const shape=new T.Shape(),h=d.lamps==='blade'?.13:.24,w=W*.18;
      shape.moveTo(-w/2,-h*.36);shape.quadraticCurveTo(-w*.52,-h*.52,-w*.35,-h/2);shape.lineTo(w*.46,-h*.30);shape.quadraticCurveTo(w*.54,-h*.23,w*.47,h*.14);shape.lineTo(w*.30,h/2);shape.lineTo(-w*.36,h*.43);shape.quadraticCurveTo(-w*.52,h*.37,-w/2,-h*.36);shape.closePath();
      add(new T.ExtrudeGeometry(shape,{depth:.045,bevelEnabled:true,bevelThickness:.006,bevelSize:.008,bevelSegments:3}),'frame',[front-.04,hy,z],[0,-Math.PI/2,0]);
      const reflector=new T.ShapeGeometry(shape,16);reflector.scale(.88,.83,1);add(reflector,'metal',[front-.089,hy,z],[0,-Math.PI/2,0]);
      for(const offset of [-w*.20,w*.18]){
        cyl(h*.27,.016,[front-.101,hy-.01,z+offset],'frame',[0,0,Math.PI/2],24);
        sphere([.014,h*.205,h*.205],[front-.113,hy-.01,z+offset],'lamp');
        for(let flute=0;flute<5;flute++)bar([front-.115,hy-h*.18,z+offset+(flute-2)*h*.065],[front-.115,hy+h*.15,z+offset+(flute-2)*h*.065],.0015,'metal');
      }
      box([.012,.018,w*.70],[front-.112,hy+h*.35,z],'white',.006);
      box([.014,h*.38,w*.11],[front-.109,hy,z+side*w*.34],'amber',.008);
    }
    box([.025,.036,.12],[front-.10,hy-.14,z],'amber',.01);
    box([.035,.075,.11],[front-.09,low+.025,side*W*.37],'lamp',.02);
    cyl(.035,.07,[front-.085,low-.025,side*W*.20],'metal',[0,0,Math.PI/2],10);
    bar([base-.035,sill+.04,side*W*.31],[base+.02,sill+.23,side*W*.19],.011,'frame');
    bar([base+.02,sill+.23,side*W*.23],[base+d.rake*.45,sill+.43,side*W*.12],.013,'rubber');
    // Thick formed fenders and an inner wheel liner, not a paper half-cylinder.
    const shape=new T.Shape(),r=radius+.095;shape.absarc(axle,radius,r,0,Math.PI,false);shape.absarc(axle,radius,r+.075,Math.PI,0,true);shape.closePath();
    add(new T.ExtrudeGeometry(shape,{depth:.18,bevelEnabled:true,bevelSize:.015,bevelThickness:.012,bevelSegments:2,curveSegments:22}),d.architecture==='expedition'?'frame':'paint',[0,0,side===1?W/2-.14:-W/2-.04]);
  }
  box([.022,.10,.42],[front-.112,low+.025,0],'white',.014);
  addMarking(add,1,.40,.10,[front-.126,low+.025,0],[0,-Math.PI/2,0]);
  box([.025,.055,.20],[front-.105,grilleTop-.035,0],'metal',.014);
  if(d.roofFeature==='visor')box([.27,.065,W*.94],[top+.015,wt+.065,0],'frame',.025,[0,0,-.08]);
  if(d.roofFeature==='pod')box([.68,.16,W*.62],[back-.55,d.roof+.08,0],'white',.07);
  if(d.roofFeature==='scoop')box([.43,.13,W*.49],[top+.48,roofFront+.06,0],'paint',.06);
  if(d.roofFeature==='fairing'){
    surface((u,v)=>[top+.27+(back-top-.34)*v,(d.sleeper?roofFront+(d.roof-roofFront)*v:d.roof)+.04+.23*Math.sin(v*Math.PI),(u-.5)*(W*.94-.18*Math.sin(v*Math.PI))],'paint',16,10);
  }
  if(d.roofFeature==='rack')for(const side of [-1,1]){
    bar([top+.28,d.roof+.13,side*W*.38],[back-.16,d.roof+.13,side*W*.38],.025,'frame');
    for(const x of [top+.30,back-.18]){bar([x,d.roof-.03,side*W*.38],[x,d.roof+.13,side*W*.38],.022,'frame');bar([x,d.roof+.13,-W*.38],[x,d.roof+.13,W*.38],.025,'metal');}
  }
  if(large){
    cyl(.24,.12,[back+.65,radius*2+.08,0],'frame');
    for(let n=0;n<9;n++)add(new T.TorusGeometry(.045,.009,5,16),'red',[back+.16,1.20+n*.037,.28],[0,Math.PI/2,0]);
    for(const side of [-1,1])box([.25,.04,.08],[top+.33,roofFront+.10,side*W*.28],'amber',.015);
  }
  // Small manufactured details are attached to the correct panels, not scattered over the cab.
  for(const side of [-1,1]){
    seam([[doorEnd-.07,low+.25,side*(W/2+.03)],[doorEnd-.07,sill-.33,side*(W/2+.035)]],.003);
    for(const y of [low+.30,sill-.39]){box([.045,.065,.018],[doorEnd-.06,y,side*(W/2+.04)],'metal',.006);cyl(.008,.023,[doorEnd-.06,y,side*(W/2+.055)],'frame',[Math.PI/2,0,0],6);}
    for(let vent=0;vent<4;vent++)box([.18,.009,.013],[back-.18,low+.30+vent*.035,side*(W/2+.025)],'frame',.003);
  }
  bar([top+.35,roofFront+.04,-W*.30],[top+.39,roofFront+.32,-W*.30],.005,'frame');
  // Visible seated anatomy; the head varies independently of clothing and paint.
  const headY=sill+.43,seatY=headY-.67,dz=W*.235,dx=seatX-.025,innerFloor=headY-1.19;
  box([back-base-.12,.06,W-.16],[(base+back)/2,innerFloor,0],'frame',.012);
  box([.66,.16,.43],[seatX-.17,innerFloor+.10,0],'frame',.045);
  for(const side of [-1,1]){
    const z=side*dz;
    box([.50,.13,.48],[seatX,seatY,z],'seat',.065);box([.16,.58,.44],[seatX+.24,seatY+.29,z],'seat',.07,[0,0,-.10]);box([.14,.20,.29],[seatX+.27,seatY+.70,z],'seat',.055);
    for(const s of [-1,1])box([.37,.11,.075],[seatX+.04,seatY+.09,z+s*.205],'seat',.04);
    const pedestal=seatY-innerFloor-.17;
    cyl(.065,pedestal,[seatX,innerFloor+.09+pedestal/2,z],'frame');
    box([.32,.04,.34],[seatX,innerFloor+.05,z],'frame',.008);
    for(const s of [-1,1])bar([seatX+s*.12,innerFloor+.10,z],[seatX-s*.12,seatY-.10,z],.014,'metal');
  }
  box([.36,.21,W-.15],[base+.37,sill-.18,0],'seat',.065);
  for(const side of [-1,1])for(let n=0;n<5;n++)box([.022,.013,.10],[base+.18+n*.032,sill-.061,side*W*.31],'frame',.003);
  box([.05,.14,.25],[base+.57,sill-.11,dz],'frame',.025,[0,0,-.24]);
  cyl(.035,.065,[seatX-.04,seatY+.15,0],'frame');
  const anatomy=buildSeatedDriver(t,[dx,headY,dz],add);
  const wheel:Vec=[dx-.40,headY-.41,dz];add(new T.TorusGeometry(.205,.018,7,32),'frame',wheel,[0,Math.PI/2,-.34]);
  for(const s of [-1,1])bar(wheel,[wheel[0],wheel[1]+s*.14,dz+s*.10],.013,'frame');bar([dx-.27,seatY-.02,dz],wheel,.025,'frame');
  box([.033,.54,.012],[dx-.025,headY-.39,dz+.025],'rubber',.004,[.59,0,-.10]);
  // Instrument binnacle, switches, gear gaiter and pedal faces remain visible through clear glazing.
  box([.045,.12,.21],[base+.57,sill-.095,dz],'frame',.025,[0,0,-.24]);
  for(const z of [dz-.055,dz+.055]){cyl(.035,.008,[base+.597,sill-.084,z],'white',[0,0,Math.PI/2],20);bar([base+.604,sill-.084,z],[base+.605,sill-.066,z+.016],.002,'red');}
  for(let i=0;i<5;i++)box([.011,.012,.012],[base+.58,sill-.19,-.10+i*.045],'white',.002);
  for(const z of [dz-.07,dz+.08])box([.09,.014,.065],[dx-.43,seatY-.39,z],'rubber',.008,[0,0,-.28]);
  if(d.sleeper)box([Math.max(.30,back-doorEnd-.18),.13,W-.18],[(back+doorEnd)/2,low+.32,0],'seat',.055);
  return {head:[dx,headY,dz] as Vec,anatomy,bounds:{min:[front-.15,.16,-W/2-.35] as Vec,max:[back+.25,d.roof+.32,W/2+.35] as Vec},architecture:d.architecture};
}
