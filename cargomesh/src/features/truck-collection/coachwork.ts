import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { CollectionTruck } from './catalog';
import { tankDimensions } from './vehicle-designs';
import type { AddVehiclePart, VehiclePart } from './cab-models';
type Vec=readonly[number,number,number];
type Layout={start:number;rear:number;center:number;floor:number;cabEnd:number};

/** Functional body sections and permanent equipment, independent of paint and merchandise. */
export function buildCoachwork(t:CollectionTruck,l:Layout,reveal:boolean,add:AddVehiclePart){
  const {start:S,rear:R,center:C,floor:F}=l,L=t.bodyLengthM,W=t.widthM,H=t.bodyHeightM,d=t.design;
  const box=(s:Vec,p:Vec,m:VehiclePart,r=.015,rot:Vec=[0,0,0])=>add(r?new RoundedBoxGeometry(...s,1,Math.min(r,...s.map(v=>v/3))):new T.BoxGeometry(...s),m,p,rot);
  const cyl=(r:number,h:number,p:Vec,m:VehiclePart,rot:Vec=[0,0,0],n=20)=>add(new T.CylinderGeometry(r,r,h,n),m,p,rot);
  const bar=(a:Vec,b:Vec,r:number,m:VehiclePart)=>{const v=new T.Vector3(...b).sub(new T.Vector3(...a)),g=new T.CylinderGeometry(r,r,v.length(),8);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.normalize()));add(g,m,new T.Vector3(...a).add(new T.Vector3(...b)).multiplyScalar(.5).toArray() as [number,number,number]);};
  const beam=(a:Vec,b:Vec,width:number,m:VehiclePart)=>{const v=new T.Vector3(...b).sub(new T.Vector3(...a)),g=new T.BoxGeometry(width,v.length(),width);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.normalize()));add(g,m,new T.Vector3(...a).add(new T.Vector3(...b)).multiplyScalar(.5).toArray() as [number,number,number]);};
  const strip=(points:readonly[number,number][],x0:number,length:number,m:VehiclePart,thickness=.035)=>{
    const s=new T.Shape();points.forEach(([z,y],i)=>i?s.lineTo(z,y):s.moveTo(z,y));
    [...points].reverse().forEach(([z,y])=>s.lineTo(z+(z<0?thickness:-thickness),y-thickness));s.closePath();
    add(new T.ExtrudeGeometry(s,{depth:length,bevelEnabled:false,curveSegments:12}),m,[x0,F,0],[0,Math.PI/2,0]);
  };
  if(t.id==='cm-mobile-workshop'){
    for(const side of [-1,1])for(let bay=0;bay<3;bay++){
      const x=S+(bay+.5)*L/3,width=L/3-.06,z=side*(W/2-.17);
      box([width,.76,.26],[x,F+.40,z],'body',.025);
      box([width+.02,.025,.30],[x,F+.80,z],'metal',.007);
      if(!reveal||side<0){
        box([width-.025,.68,.012],[x,F+.40,side*(W/2-.032)],'rubber',.005);
        if(bay===2){
          for(let slat=0;slat<18;slat++)box([width-.055,.031,.020],[x,F+.10+slat*.035,side*(W/2-.018)],'metal',.004);
          box([.20,.025,.035],[x,F+.14,side*(W/2+.005)],'frame',.004);
        }else for(let drawer=0;drawer<4;drawer++){
          const y=F+.15+drawer*.16;
          box([width-.055,.145,.018],[x,y,side*(W/2-.016)],'body',.006);
          box([width*.48,.020,.025],[x,y+.025,side*(W/2+.003)],'metal',.004);
          box([.018,.018,.027],[x+width*.31,y,side*(W/2+.005)],'frame',.004);
        }
      }
      for(const end of [-1,1])box([.025,.78,.035],[x+end*width/2,F+.40,side*(W/2-.015)],'metal',.004);
    }
    box([.055,.80,W-.08],[S+.03,F+.40,0],'body',.008);
    box([.045,.22,W-.12],[R-.03,F+.13,0],'body',.008);
    const vx=S+.55,vz=-W/2+.17;
    box([.25,.045,.20],[vx,F+.84,vz],'frame',.008);cyl(.07,.09,[vx,F+.89,vz],'metal');
    for(const end of [-1,1])box([.065,.12,.18],[vx+end*.07,F+.97,vz],'metal',.008);
    bar([vx,F+.91,vz-.18],[vx,F+.91,vz+.18],.012,'metal');
    return true;
  }
  if(t.id==='cm-market-awning'){
    const inner=W/2+.025,outer=inner+.95,y0=F+1.90,y1=F+1.76;
    for(const x of [S+.12,R-.12]){
      box([.055,1.87,.055],[x,F+.935,inner],'metal',.005);
      beam([x,y0,inner],[x,y1,outer],.035,'metal');
      const joint:Vec=[x,F+1.48,inner+.46];
      beam([x,F+1.13,inner],joint,.028,'frame');beam(joint,[x,y1-.025,outer-.015],.025,'metal');
      for(const p of [joint,[x,F+1.13,inner] as Vec])cyl(.029,.06,p,'metal',[0,0,Math.PI/2],12);
    }
    const vertices:number[]=[],indices:number[]=[],uv:number[]=[];
    for(let i=0;i<=24;i++)for(let j=0;j<=3;j++){
      const u=i/24,v=j/3;vertices.push(S+.08+u*(L-.16),y0+(y1-y0)*v-.018*Math.sin(u*Math.PI)*Math.sin(v*Math.PI),inner+v*.95);uv.push(u*L,v);
    }
    for(let i=0;i<24;i++)for(let j=0;j<3;j++){const p=i*4+j;indices.push(p,p+1,p+4,p+1,p+5,p+4);}
    const cloth=new T.BufferGeometry();cloth.setAttribute('position',new T.Float32BufferAttribute(vertices,3));cloth.setAttribute('uv',new T.Float32BufferAttribute(uv,2));cloth.setIndex(indices);cloth.computeVertexNormals();add(cloth,'strap');
    box([L-.16,.10,.018],[C,y1-.045,outer],'strap',.003);
    for(const z of [inner,outer])bar([S+.08,z===inner?y0:y1,z],[R-.08,z===inner?y0:y1,z],.018,'metal');
    box([L-.35,.035,.32],[C,F+.69,inner-.08],'metal',.008);
  }
  if(t.id==='cm-drum-rail'){
    for(const side of [-1,1]){
      for(let n=0;n<4;n++)box([.055,.82,.055],[S+.16+n*(L-.32)/3,F+.41,side*(W/2-.055)],'body',.006);
      for(const y of [.18,.68])box([L-.12,.040,.040],[C,F+y,side*(W/2-.055)],'metal',.005);
    }
    box([.05,.70,W-.16],[S+.06,F+.35,0],'body',.006);
    for(const y of [.18,.68])box([.04,.04,W-.15],[R-.08,F+y,0],'metal',.005);
    return true;
  }
  if(t.id==='cm-gravel-halfpipe'){
    const h=1.2,rx=W/2-.07,ry=h,segments=40,x0=S+.08,x1=R-.10;
    for(const inside of [false,true]){
      const vertices:number[]=[],normals:number[]=[],uv:number[]=[],indices:number[]=[],r=rx-(inside?.012:0),v=ry-(inside?.012:0);
      for(const x of [x0,x1])for(let n=0;n<=segments;n++){
        const angle=Math.PI+n*Math.PI/segments,z=Math.cos(angle)*r,y=h+Math.sin(angle)*v,normal=new T.Vector3(0,Math.sin(angle)/v,Math.cos(angle)/r).normalize().multiplyScalar(inside?-1:1);
        vertices.push(x,F+y,z);normals.push(...normal.toArray());uv.push(x,(angle-Math.PI)*r);
      }
      for(let n=0;n<segments;n++){const p=n,q=n+segments+1;indices.push(...(inside?[p,p+1,q,p+1,q+1,q]:[p,q,p+1,p+1,q,q+1]));}
      const shell=new T.BufferGeometry();shell.setAttribute('position',new T.Float32BufferAttribute(vertices,3));shell.setAttribute('normal',new T.Float32BufferAttribute(normals,3));shell.setAttribute('uv',new T.Float32BufferAttribute(uv,2));shell.setIndex(indices);add(shell,inside?'metal':'body');
    }
    const gate=new T.Shape();for(let n=0;n<=segments;n++){const angle=Math.PI+n*Math.PI/segments,z=Math.cos(angle)*rx,y=h+Math.sin(angle)*ry;n?gate.lineTo(z,y):gate.moveTo(z,y);}gate.closePath();
    for(const x of [S+.055,R-.08])add(new T.ExtrudeGeometry(gate,{depth:.025,bevelEnabled:false}),'body',[x,F,0],[0,Math.PI/2,0]);
    box([.04,.30,W-.14],[S+.06,F+h+.15,0],'body',.01);
    for(const side of [-1,1]){
      box([L-.08,.065,.065],[C,F+h,side*rx],'metal',.008);
      box([L-.30,.14,.10],[C,F-.10,side*.43],'frame',.006);
      const saddleY=h-h*Math.sqrt(1-Math.pow(.43/rx,2)),angle=Math.atan(h*.43/(rx*rx*Math.sqrt(1-Math.pow(.43/rx,2))));
      for(let n=0;n<4;n++){
        const x=S+.40+n*(L-.8)/3;
        box([.18,saddleY+.08,.10],[x,F+(saddleY-.08)/2,side*.43],'frame',.004);
        box([.20,.04,.18],[x,F+saddleY-.02*Math.cos(angle),side*(.43+.02*Math.sin(angle))],'rubber',.003,[-side*angle,0,0]);
      }
      box([.16,.10,.13],[R-.09,F+h-.025,side*(rx-.05)],'metal',.007);
      cyl(.032,.22,[R-.055,F+h-.025,side*(rx-.05)],'metal',[Math.PI/2,0,0],12);
      box([.11,.12,.09],[R-.015,F+.23,side*.48],'frame',.008);
      bar([R-.03,F+.23,side*.48],[R+.02,F+.40,side*.64],.018,'metal');
    }
    for(const y of [.30,.60,.90])box([.025,.035,W*.55],[R-.045,F+y,0],'body',.006);
    for(const side of [-1,1])bar([S-.10,F-.12,side*.14],[S-.10,F+h+.08,side*.14],side===-1?.075:.045,side===-1?'frame':'metal');
    for(let step=0;step<4;step++)box([.06,.04,.33],[S-.10,F+.12+step*.27,W/2-.10],'metal',.003);
    bar([S-.10,F+.05,W/2-.25],[S-.10,F+1.1,W/2-.25],.018,'metal');bar([S-.10,F+.05,W/2+.05],[S-.10,F+1.1,W/2+.05],.018,'metal');
    cyl(.045,L-.15,[C,F+h+.07,-rx-.04],'rubber',[0,0,Math.PI/2],16);
    return true;
  }
  if(t.id==='cm-glass-stand'||t.id==='cm-panel-a-frame'){
    const height=t.cargo.unitM[2]+.12,foot=.32,top=.10;
    const outer=.22+Math.floor((t.cargo.count-1)/2)*(t.cargo.unitM[1]+.02)+t.cargo.unitM[1]/2,padDepth=Math.max(.36,outer-.04),padZ=.10+padDepth/2;
    for(const x of [C-L*.29,C,C+L*.29]){
      box([.16,.10,W*.72],[x,F+.05,0],'metal',.005);
      for(const s of [-1,1]){
        beam([x,F+.10,s*foot],[x,F+height,s*top],.055,'metal');
        beam([x,F+.15,s*(foot+.025)],[x,F+height-.05,s*(top+.025)],.027,'rubber');
        box([.18,.025,padDepth],[x,F+.10,s*padZ],'metal',.004);
        box([.16,.018,padDepth-.02],[x,F+.123,s*padZ],'rubber',.002);
        for(const end of [-1,1])cyl(.009,.015,[x+end*.055,F+.11,s*.40],'metal',[0,0,0],6);
      }
      box([.055,.055,top*2+.055],[x,F+height,0],'metal',.005);
    }
    for(const s of [-1,1]){
      for(const level of [.16,height*.55,height-.08])box([L*.64,.04,.04],[C,F+level,s*(foot-(foot-top)*(level-.10)/(height-.10))],'metal',.004);
      box([L-.25,.14,.055],[C,F+.05,s*(W/2-.06)],'body',.01);
    }
    box([.05,.52,W*.70],[S+.04,F+.27,0],'body',.01);
    return true;
  }
  if(t.id==='cm-beverage-rack'||t.id==='cm-returnable-crates'){
    const height=1.30,bays=3;
    box([.055,height,W-.10],[S+.04,F+height/2,0],'body',.015);
    for(const s of [-1,1]){
      box([L,.12,.06],[C,F+.08,s*(W/2-.04)],'body',.008);
      box([L,.045,.10],[C,F+height,s*(W/2-.06)],'metal',.008);
      for(let n=0;n<=bays;n++){
        const x=S+.05+n*(L-.10)/bays;
        box([.045,height,.055],[x,F+height/2,s*(W/2-.06)],'metal',.005);
        box([.06,.025,W*.44],[x,F+.035,s*W*.24],'metal',.004);
      }
      box([L-.1,.025,.025],[C,F+.98,s*(W/2-.085)],'strap',.004);
      for(let n=0;n<3;n++)box([.05,.08,.035],[S+(n+.5)*L/3,F+.94,s*(W/2-.07)],'metal',.004);
    }
    box([L,.045,W-.04],[C,F+height+.025,0],'white',.018);
    for(const x of [S+.08,R-.08])box([.045,.06,W-.08],[x,F+height-.015,0],'metal',.005);
    return true;
  }
  if(['van','box','reefer','curtain'].includes(t.form)){
    const shoulder=d.bodyProfile==='bevel'?.21:d.bodyProfile==='taper'?.33:d.bodyProfile==='wedge'?.29:.08;
    const crown=d.bodyProfile==='crown'?.18:d.bodyProfile==='smooth'?.10:0;
    const sideH=H-shoulder,topW=W/2-shoulder*.70;
    for(const side of [-1,1])if(!reveal||side<0){
      const z=side*(W/2-.02),isGlass=t.id==='cm-florist-glass';
      box([L,sideH,isGlass?.04:.055],[C,F+sideH/2,z],isGlass?'glass':t.form==='curtain'?'paint':'body',.02);
      box([L,.12,.065],[C,F+.06,z+side*.025],'metal',.015);
      if(isGlass){for(let n=0;n<5;n++)box([.045,sideH,.065],[S+.05+n*(L-.1)/4,F+sideH/2,z],'frame');}
      else if(t.form==='curtain')for(let n=0;n<32;n++){
        const x=S+.10+n*(L-.20)/31;box([.026,sideH-.16,.024],[x,F+sideH/2,z+side*.033],'body',.012);
        if(n%2===0){box([.04,.17,.035],[x,F+.15,z+side*.05],'frame');box([.072,.04,.04],[x,F+.20,z+side*.07],'metal');}
      }else if(d.bodyProfile==='ribbed')for(let n=0;n<L/.14;n++)box([.028,sideH-.18,.025],[S+.08+n*.14,F+sideH/2,z+side*.04],'metal',.007);
      else{
        for(const y of [.18,sideH-.12])box([L-.12,.025,.025],[C,F+y,z+side*.045],'metal');
        for(let n=0;n<L/.35;n++)for(const y of [.20,sideH-.14])cyl(.009,.014,[S+.12+n*.35,F+y,z+side*.05],'metal',[Math.PI/2,0,0],6);
      }
      if(t.id.includes('shutter')||t.id.includes('locker')){
        const bays=t.id.includes('locker')?5:3;
        for(let n=0;n<bays;n++){
          const x=S+(n+.5)*L/bays;
          box([L/bays-.075,sideH-.23,.035],[x,F+sideH/2+.02,z+side*.052],'paint',.035);
          for(let r=0;r<(bays===5?2:14);r++)box([L/bays-.12,.013,.018],[x,F+.20+r*(sideH-.35)/(bays===5?2:14),z+side*.079],'metal');
          box([.18,.03,.035],[x,F+.28,z+side*.09],'frame');
          for(const offset of [-.15,.15])box([.045,.075,.03],[x+offset,F+.22,z+side*.09],'metal');
        }
      }
      if(t.id==='cm-medical-van'||t.id==='cm-courier-van'){
        const x=S+L*.30;box([L*.36,sideH-.16,.035],[x,F+sideH/2,z+side*.055],'body',.06);box([.20,.035,.04],[x+L*.12,F+sideH*.48,z+side*.08],'frame');
        box([L*.37,.045,.20],[x,F-.08,z+side*.02],'metal');bar([x-L*.17,F+.16,z+side*.08],[x-L*.17,F+1.05,z+side*.08],.018,'metal');
      }
      if(t.form==='reefer'){
        for(const x of [S+.035,R-.025])box([.065,sideH,.055],[x,F+sideH/2,z+side*.035],'metal',.008);
        box([L-.08,.16,.035],[C,F+.13,z+side*.05],'white',.006);
        for(const y of [.22,.48,.72])box([L-.18,.05,.035],[C,F+y,z-side*.06],'metal',.004);
        if(side===1){
          const dx=S+L*.28,dh=sideH*.77,dw=Math.min(1,L*.22);
          box([dw+.035,dh+.035,.015],[dx,F+.16+dh/2,z+.05],'rubber',.006);
          box([dw,dh,.025],[dx,F+.16+dh/2,z+.065],'white',.008);
          for(let n=0;n<3;n++){box([.09,.055,.022],[dx-dw/2+.03,F+.27+n*(dh-.22)/2,z+.087],'metal',.003);}
          bar([dx+dw*.32,F+.22,z+.09],[dx+dw*.32,F+dh+.08,z+.09],.010,'metal');
          box([.12,.03,.027],[dx+dw*.28,F+.72,z+.10],'frame',.003);
        }
      }
    }
    box([.06,H,W-.08],[S+.03,F+H/2,0],'body');
    if(!reveal){
      strip([[-W/2,H-shoulder],[-topW,H],[0,H+crown],[topW,H],[W/2,H-shoulder]],S,L,t.id==='cm-florist-glass'?'glass':'body',.055);
      // A sealed portal fills the shoulder under the roof; door leaves fit inside it.
      const header=new T.Shape();
      [[-W/2,sideH-.04],[-W/2,sideH],[-topW,H],[0,H+crown],[topW,H],[W/2,sideH],[W/2,sideH-.04]].forEach(([z,y],i)=>i?header.lineTo(z,y):header.moveTo(z,y));header.closePath();
      for(const x of [S,R-.055])add(new T.ExtrudeGeometry(header,{depth:.075,bevelEnabled:false}),'body',[x,F,0],[0,Math.PI/2,0]);
      for(const side of [-1,1]){
        box([.095,sideH,.055],[R+.015,F+sideH/2,side*(W/2-.045)],'metal',.008);
        const doorW=W/2-.075,doorH=sideH-.085,z=side*(doorW/2+.010),lockZ=side*W*.26;
        box([.033,doorH+.018,doorW+.018],[R+.038,F+.04+doorH/2,z],'rubber',.004);
        box([.035,doorH,doorW],[R+.060,F+.04+doorH/2,z],'body',.008);
        cyl(.012,doorH-.13,[R+.102,F+.06+doorH/2,lockZ],'metal');
        for(let n=0;n<3;n++){
          const hy=F+.18+n*(doorH-.28)/2;
          box([.025,.070,.14],[R+.09,hy,side*(W/2-.105)],'metal',.003);
          cyl(.018,.087,[R+.108,hy,side*(W/2-.065)],'metal',[0,0,0],10);
          box([.02,.035,.045],[R+.105,hy,lockZ],'metal',.002);
        }
        box([.035,.05,.18],[R+.133,F+.33,lockZ+side*.045],'metal',.004);
        box([.04,.07,.045],[R+.145,F+.33,lockZ+side*.12],'frame',.003);
        for(const yy of [.10,sideH-.08])box([.012,.024,doorW-.07],[R+.083,F+yy,z],'white',.002);
      }
      box([.15,.07,W-.08],[R+.015,F+.015,0],'metal',.008);
      box([.025,sideH-.06,.016],[R+.048,F+sideH/2,0],'rubber',.002);
    }
    if(t.form==='reefer'){
      const compact=t.size==='small',height=compact?.56:.74,uy=Math.max(F+H-.20,d.roof+.20+height/2),nose=S-.40;
      if(t.id==='cm-meat-rail'){
        const ux=S+1.65,uz=W/2-.28,cy=F-.34;
        box([1.05,.52,.43],[ux,cy,uz],'white',.045);
        box([.89,.36,.018],[ux,cy,uz+.224],'frame',.018);
        for(let vent=0;vent<12;vent++)box([.014,.28,.020],[ux-.39+vent*.071,cy,uz+.237],'metal',.002);
        for(const end of [-1,1])box([.075,.10,.38],[ux+end*.38,F-.055,uz],'metal',.005);
        bar([ux-.42,F-.20,uz-.15],[S+.12,F-.20,uz-.15],.018,'frame');
        bar([S+.12,F-.20,uz-.15],[S+.12,F+H-.18,uz-.15],.018,'frame');
      }else{
      box([.48,height,W*.71],[S-.16,uy,0],'white',.075);
      box([.012,height*.72,W*.60],[nose-.009,uy,0],'frame',.02);
      for(const side of [-1,1]){
        const r=compact?.11:.16,z=side*W*.17;
        cyl(r,.022,[nose-.025,uy+.07,z],'frame',[0,0,Math.PI/2],24);
        for(let n=0;n<8;n++){const angle=n*Math.PI/4;bar([nose-.042,uy+.07,z],[nose-.042,uy+.07+Math.sin(angle)*r,z+Math.cos(angle)*r],.005,'metal');}
      }
      for(let n=0;n<8;n++)box([.012,.009,W*.54],[nose-.028,uy-height*.38+n*.018,0],'metal',.002);
      }
      box([.30,.16,W*.55],[S+.25,F+H-.13,0],'white',.025);
      for(const side of [-1,1])cyl(.10,.015,[S+.25,F+H-.22,side*W*.14],'frame',[0,0,0],20);
      bar([S+.24,F+H-.07,-W*.37],[S+.9,F+H-.07,-W*.37],.012,'metal');
    }
    if(t.id.includes('luton')){
      const podY=Math.max(F+H-.40,d.roof+.15);box([1.35,.62,W-.09],[S-.57,podY,0],'body',.10);box([.16,.43,W-.17],[S-1.17,podY-.05,0],'body',.065,[0,0,-.30]);
    }
    return true;
  }
  if(t.form==='tipper'||t.form==='hopper'){
    if(t.size==='small'){
      const h=.50;
      box([L-.06,.012,W-.10],[C,F+.037,0],'metal',0);
      box([.035,.67,W-.08],[S+.03,F+.36,0],'body',.008);
      for(const side of [-1,1]){
        box([L-.10,h,.025],[C,F+.05+h/2,side*(W/2-.055)],'body',.006);
        for(const yy of [.07,.18,.29,.40,.54])box([L-.15,.022,.018],[C,F+yy,side*(W/2-.075)],'body',.005);
        box([L,.045,.045],[C,F+h+.05,side*(W/2-.055)],'metal',.005);
        for(let n=0;n<3;n++){
          const x=S+.20+n*(L-.40)/2;
          box([.11,.05,.055],[x,F+.06,side*(W/2-.035)],'metal',.004);
          cyl(.022,.13,[x,F+.055,side*(W/2-.026)],'metal',[0,0,Math.PI/2],10);
        }
        for(const x of [S+.10,R-.10]){
          box([.055,h+.07,.055],[x,F+(h+.07)/2,side*(W/2-.05)],'metal',.004);
          box([.04,.14,.03],[x,F+h-.04,side*(W/2-.015)],'frame',.004);
          bar([x-.018,F+h,side*(W/2+.005)],[x+.025,F+h-.08,side*(W/2+.005)],.007,'metal');
        }
        box([L-.30,.10,.07],[C,F-.13,side*W*.24],'frame',.005);
        cyl(.042,.17,[R-.16,F-.04,side*W*.30],'metal',[Math.PI/2,0,0],12);
      }
      box([.028,h,W-.10],[R-.03,F+.05+h/2,0],'body',.008);
      for(const yy of [.10,.22,.34,.46])box([.025,.025,W-.15],[R-.012,F+yy,0],'body',.004);
      cyl(.065,.26,[S+.52,F-.12,0],'frame');bar([S+.52,F-.20,0],[S+.90,F+.018,0],.034,'metal');
      return true;
    }
    const h=t.size==='medium'?1.2:1.9;
    const half=t.id==='cm-gravel-halfpipe',three=t.id==='cm-sand-threeway';
    let section:[number,number][];
    if(half)section=Array.from({length:25},(_,i)=>{const a=Math.PI+i*Math.PI/24;return [Math.cos(a)*(W/2-.06),h+Math.sin(a)*h] as [number,number];});
    else section=[[-W/2+.06,h],[-W*.34,.08],[W*.34,.08],[W/2-.06,h]];
    strip(section,S+.04,L-.08,'body',.055);
    const cap=new T.Shape();section.forEach(([z,y],i)=>i?cap.lineTo(z,y):cap.moveTo(z,y));cap.closePath();
    for(const x of [S+.015,R-.055])add(new T.ExtrudeGeometry(cap,{depth:.055,bevelEnabled:false}),'body',[x,F,0],[0,Math.PI/2,0]);
    for(const side of [-1,1]){
      box([L,.075,.085],[C,F+h,side*(W/2-.06)],'metal',.025);
      if(!half)for(let n=0;n<(three?4:7);n++)bar([S+.20+n*(L-.40)/(three?3:6),F+.12,side*W*.35],[S+.20+n*(L-.40)/(three?3:6),F+h-.04,side*(W/2-.035)],.035,'metal');
      for(const x of [S+.22,R-.22]){cyl(.06,.18,[x,F+.04,side*W*.39],'metal',[Math.PI/2,0,0]);box([.16,.11,.12],[x,F-.01,side*W*.39],'frame');}
      if(three)for(let n=0;n<3;n++)box([.18,.075,.06],[S+.35+n*(L-.7)/2,F+h-.12,side*W*.50],'frame');
    }
    cyl(.13,.38,[S+.35,F+.12,0],'frame');bar([S+.70,F-.27,0],[S+.35,F+.51,0],.075,'metal');
    for(const side of [-1,1])bar([S+.3,F-.22,side*W*.31],[R-.25,F-.22,side*W*.31],.055,'frame');
    if(t.form==='hopper')for(let n=0;n<3;n++){
      const x=S+(n+.5)*L/3;add(new T.CylinderGeometry(W*.40,.16,.69,4),'body',[x,F-.08,0],[0,Math.PI/4,0]);box([.55,.055,.35],[x,F-.45,0],'metal');bar([x,F-.43,.25],[x+.35,F-.43,.25],.024,'metal');
    }
    return true;
  }
  if(t.form==='tank'||t.form==='silo'){
    const {rx,ry,length}=tankDimensions(t),silo=t.form==='silo',y=F+ry+(silo?.68:.08);
    const tank=new T.CylinderGeometry(1,1,length,48,1,true);tank.scale(ry,1,rx);add(tank,'body',[C,y,0],[0,0,Math.PI/2]);
    for(const side of [-1,1]){const cap=new T.SphereGeometry(1,32,16);cap.scale(t.id==='cm-fuel-multicell'?.21:.32,ry,rx);add(cap,'body',[C+side*length/2,y,0]);}
    const supports=t.form==='silo'?3:t.size==='large'?4:2;
    for(let n=0;n<supports;n++){
      const x=C+(n-(supports-1)/2)*length/(supports+.5);
      box([.24,.26,W*.73],[x,F+.04,0],'frame');
      for(const side of [-1,1])bar([x,F+.04,side*rx*.69],[x,y,side*rx*.92],.045,'metal');
      const hoop=new T.TorusGeometry(1,.017,6,48);hoop.scale(rx+.01,ry+.01,1);add(hoop,'metal',[x,y,0],[0,Math.PI/2,0]);
      if(silo){
        const cone=new T.CylinderGeometry(rx*.96,.12,.86,32);cone.scale(1.32,1,1);add(cone,'body',[x,F+.36,0]);
        cyl(.12,.17,[x,F-.12,0],'metal');bar([x,F-.19,0],[R-.23,F-.19,0],.065,'metal');
      }
    }
    const hatches=t.id==='cm-fuel-multicell'?5:t.form==='silo'?3:t.size==='small'?1:2;
    for(let n=0;n<hatches;n++){
      const x=C+(n-(hatches-1)/2)*length/(hatches+1);cyl(.20,.09,[x,y+ry+.04,0],'metal');cyl(.16,.03,[x,y+ry+.10,0],'frame');bar([x-.09,y+ry+.13,0],[x+.09,y+ry+.13,0],.015,'metal');
    }
    box([length-.4,.05,.43],[C,y+ry+.06,0],'metal');
    for(const side of [-1,1]){
      for(let n=0;n<5;n++)bar([S+.45+n*(L-.9)/4,y+ry+.08,side*.28],[S+.45+n*(L-.9)/4,y+ry+.43,side*.28],.018,'metal');bar([S+.45,y+ry+.43,side*.28],[R-.45,y+ry+.43,side*.28],.020,'metal');
      bar([S+.4,F+.08,side*rx*.86],[R-.4,F+.08,side*rx*.86],.055,t.id==='cm-food-stainless'?'metal':'frame');
      box([length*.63,.36,.10],[C,F-.14,side*W*.40],'body',.06);
    }
    for(const side of [-1,1])bar([R-.26,F+.12,side*.25],[R-.26,y+ry+.14,side*.25],.024,'metal');
    for(let n=0;n<9;n++)bar([R-.26,F+.18+n*(ry*2+.18)/9,-.25],[R-.26,F+.18+n*(ry*2+.18)/9,.25],.019,'metal');
    bar([R-.28,F+.08,0],[R+.06,F+.08,0],.06,'metal');cyl(.10,.025,[R+.08,F+.08,0],'red',[0,0,Math.PI/2]);
    return true;
  }
  return false;
}
