import * as T from 'three';
import {rollingSupports,trackProfile} from './rolling-supports';
import type {VehiclePart} from './cab-models';

type Vec=readonly[number,number,number];
type Part=VehiclePart;
type Builder={
  add:(geometry:T.BufferGeometry,part:Part,p?:Vec,rotation?:Vec)=>void;
  box:(size:Vec,p:Vec,part:Part,radius?:number,rotation?:Vec)=>void;
  cylinder:(radius:number,height:number,p:Vec,part:Part,rotation?:Vec,segments?:number)=>void;
  bar:(a:Vec,b:Vec,radius:number,part:Part)=>void;
  ring:(radius:number,tube:number,p:Vec,part:Part,rotation?:Vec)=>void;
};

/** Goods with their own packaging and support surfaces, rather than a solid bounding box. */
export function buildTransportLoad(kind:string,size:Vec,origin:Vec,serial:number,b:Builder){
  const [a,w,h]=size,[x,y,z]=origin;
  const color=(g:T.BufferGeometry,base:T.Color,variation=.06)=>{
    const p=g.attributes.position,values:number[]=[];
    for(let i=0;i<p.count;i++){const shade=1-variation+variation*(1+Math.sin(p.getX(i)*147+p.getY(i)*91+serial*2.1))/2;values.push(base.r*shade,base.g*shade,base.b*shade);}
    g.setAttribute('color',new T.Float32BufferAttribute(values,3));return g;
  };
  const bands=(height:number)=>{
    for(const end of [-1,1]){
      const px=x+end*a*.30;
      b.box([.027,.010,w-.008],[px,y+height,z],'strap',.001);
      for(const side of [-1,1])b.box([.027,height-.015,.008],[px,y+height/2,z+side*(w/2-.008)],'strap',.001);
      b.box([.045,.055,.012],[px,y+height*.32,z+w/2-.005],'metal',.002);
    }
  };
  if(kind==='drums'){
    const r=Math.min(a,w)/2-.013;
    const profile=[[.93,.012],[1,.025],[1,.045],[.97,.06],[.97,h*.25-.012],[1,h*.25],[1,h*.25+.018],[.97,h*.25+.03],[.97,h*.70-.014],[1,h*.70],[1,h*.70+.018],[.97,h*.70+.03],[.97,h-.05],[1,h-.025],[.93,h-.010]].map(([q,v])=>new T.Vector2(r*q,v));
    b.add(new T.LatheGeometry(profile,24),'load',[x,y,z]);
    for(const top of [false,true]){
      const cy=y+(top?h-.018:.018);
      b.cylinder(r*.94,.012,[x,cy,z],'load',[0,0,0],24);
      b.add(new T.TorusGeometry(r*.98,.006,4,32),'metal',[x,cy,z],[Math.PI/2,0,0]);
    }
    for(const [offset,radius] of [[r*.43,.025],[-r*.48,.012]]){
      b.cylinder(radius*1.25,.008,[x+offset,y+h-.008,z],'metal',[0,0,0],12);
      b.cylinder(radius,.005,[x+offset,y+h-.002,z],'frame',[0,0,0],8);
      b.box([radius*1.1,.003,.003],[x+offset,y+h+.001,z],'metal',0);
    }
    b.add(new T.CylinderGeometry(r+.001,r+.001,h*.18,8,1,true,-.35,.70),'white',[x,y+h*.48,z]);
    return true;
  }
  if(kind==='ibc'){
    for(const side of [-1,1])b.box([a-.04,.045,.12],[x,y+.023,z+side*(w/2-.10)],'frame',.008);
    for(const end of [-1,0,1])for(const side of [-1,1])b.box([.14,.10,.14],[x+end*(a/2-.10),y+.075,z+side*(w/2-.10)],'frame',.006);
    b.box([a-.04,.025,w-.04],[x,y+.137,z],'metal',.008);
    b.box([a-.09,h-.23,w-.09],[x,y+.15+(h-.23)/2,z],'white',.09);
    for(let level=0;level<6;level++)for(const side of [-1,1]){
      const cy=y+.20+level*(h-.28)/5;
      b.bar([x-a/2+.025,cy,z+side*(w/2-.025)],[x+a/2-.025,cy,z+side*(w/2-.025)],.005,'metal');
      b.bar([x+side*(a/2-.025),cy,z-w/2+.025],[x+side*(a/2-.025),cy,z+w/2-.025],.005,'metal');
    }
    for(let rib=0;rib<9;rib++)for(const side of [-1,1]){
      const px=x-a/2+.05+rib*(a-.10)/8,pz=z-w/2+.05+rib*(w-.10)/8;
      b.bar([px,y+.15,z+side*(w/2-.025)],[px,y+h-.065,z+side*(w/2-.025)],.0045,'metal');
      b.bar([x+side*(a/2-.025),y+.15,pz],[x+side*(a/2-.025),y+h-.065,pz],.0045,'metal');
    }
    for(const end of [-1,1])b.box([.025,.025,w-.08],[x+end*a*.28,y+h-.065,z],'metal',.004);
    b.cylinder(.083,.035,[x,y+h-.038,z],'frame',[0,0,0],24);
    for(let n=0;n<12;n++){const v=n*Math.PI/6;b.box([.008,.024,.008],[x+Math.sin(v)*.083,y+h-.032,z+Math.cos(v)*.083],'frame',.001);}
    b.box([.022,.14,.18],[x+a/2-.060,y+.235,z],'frame',.025);
    b.cylinder(.029,.070,[x+a/2-.050,y+.235,z],'frame',[0,0,Math.PI/2],16);
    b.cylinder(.039,.012,[x+a/2-.014,y+.235,z],'white',[0,0,Math.PI/2],16);
    b.box([.025,.018,.10],[x+a/2-.050,y+.285,z],'frame',.004);
    b.box([.24,.20,.008],[x-a*.15,y+h*.56,z+w/2-.017],'white',.002);
    return true;
  }
  if(kind==='lumber'){
    for(const end of [-1,1])b.box([.09,.045,w-.012],[x+end*a*.32,y+.023,z],'wood',.002);
    const layers=10,columns=3,thick=(h-.05)/layers-.003;
    for(let row=0;row<layers;row++)for(let column=0;column<columns;column++){
      const length=a-.008-((row*3+column+serial)%4)*.006;
      b.box([length,thick,w/columns-.005],[x,y+.05+(row+.5)*(h-.05)/layers,z+(column-1)*w/columns],'wood',.001);
    }
    bands(h-.004);return true;
  }
  if(kind==='pipes'){
    const rows=w>.5?1:3,r=Math.min(w/rows,(h-.035)/rows)*.46;
    const profile=[new T.Vector2(r*.92,-a/2),new T.Vector2(r,-a/2),new T.Vector2(r,a/2),new T.Vector2(r*.92,a/2),new T.Vector2(r*.92,-a/2)];
    for(let row=0;row<rows;row++)for(let col=0;col<rows;col++){
      const cy=y+.035+(row+.5)*(h-.035)/rows,cz=z+(col-(rows-1)/2)*w/rows;
      b.add(new T.LatheGeometry(profile,24),'load',[x,cy,cz],[0,0,Math.PI/2]);
    }
    for(const end of [-1,1])b.box([.09,.032,w-.012],[x+end*a*.31,y+.016,z],'wood',.002);
    bands(h-.006);return true;
  }
  if(kind==='tools'||kind==='meat'){
    const cart=kind==='meat',bottom=cart?.12:.015,top=h-.025;
    b.box([a-.035,top-bottom,w-.035],[x,y+(top+bottom)/2,z],cart?'metal':'load',.018);
    if(cart){
      for(const sx of [-1,1])for(const sz of [-1,1]){
        const px=x+sx*(a/2-.075),pz=z+sz*(w/2-.075);
        b.cylinder(.045,.035,[px,y+.047,pz],'rubber',[Math.PI/2,0,0],12);
        b.box([.025,.070,.050],[px,y+.090,pz],'metal',.003);
      }
      b.box([a-.075,h-.19,.012],[x,y+(h+.10)/2,z+w/2-.008],'white',.009);
      for(const side of [-1,1])b.box([.015,h-.17,.020],[x+side*(a/2-.027),y+(h+.10)/2,z+w/2-.018],'metal',.002);
      b.bar([x+a*.30,y+h*.46,z+w/2-.005],[x+a*.30,y+h*.66,z+w/2-.005],.009,'metal');
      for(let seam=0;seam<3;seam++)b.box([.008,h-.22,w-.08],[x+(seam-1)*a*.26,y+(h+.10)/2,z],'metal',.002);
    }else{
      for(let drawer=0;drawer<4;drawer++){
        const cy=y+.06+drawer*(h-.12)/4;
        b.box([a-.055,(h-.14)/4,.012],[x,cy,z+w/2-.008],'metal',.004);
        b.box([a*.46,.014,.025],[x,cy+.025,z+w/2-.007],'frame',.003);
      }
      b.box([a-.04,.020,w-.04],[x,y+h-.012,z],'rubber',.002);
      for(let socket=0;socket<8;socket++)b.cylinder(.012,.035,[x+(socket-3.5)*a*.085,y+h-.020,z-w*.20],'metal',[0,0,0],10);
      b.box([a*.50,.015,.025],[x,y+h-.012,z+w*.18],'metal',.002);
    }
    return true;
  }
  if(kind==='flowers'){
    for(const sx of [-1,1])for(const sz of [-1,1]){
      const px=x+sx*(a/2-.035),pz=z+sz*(w/2-.035);
      b.cylinder(.032,.025,[px,y+.036,pz],'rubber',[Math.PI/2,0,0],10);
      b.box([.018,h-.08,.018],[px,y+(h+.04)/2,pz],'metal');
      b.box([.055,.04,.025],[px,y+.067,pz],'metal');
    }
    for(let shelf=0;shelf<3;shelf++){
      const sy=y+.10+shelf*h*.29;
      for(const sz of [-1,1])b.box([a-.03,.025,.018],[x,sy,z+sz*(w/2-.025)],'metal');
      for(let slat=0;slat<6;slat++)b.box([.018,.018,w-.055],[x+(slat-2.5)*(a-.08)/5,sy,z],'metal');
      for(let px=0;px<3;px++)for(let pz=0;pz<2;pz++){
        const cx=x+(px-1)*a*.29,cz=z+(pz-.5)*w*.47,base=sy+.015;
        b.add(new T.CylinderGeometry(.055,.038,.09,10),'frame',[cx,base+.045,cz]);
        for(let stem=0;stem<2;stem++){
          const bx=cx+(stem-.5)*.045,top=base+.20+(px%2)*.02;
          const stalk=new T.CylinderGeometry(.002,.002,top-base-.08,5);b.add(color(stalk,new T.Color('#426245')),'load',[bx,(top+base+.08)/2,cz]);
          for(let petal=0;petal<5;petal++){
            const angle=petal*Math.PI*2/5,shape=new T.Shape();shape.moveTo(0,0);shape.quadraticCurveTo(-.018,.013,0,.032);shape.quadraticCurveTo(.018,.013,0,0);
            const g=new T.ShapeGeometry(shape,3);g.rotateX(-Math.PI/2);g.rotateY(angle);b.add(color(g,new T.Color((shelf+serial)%3===0?'#b84b70':(shelf+serial)%3===1?'#e8d5af':'#90679c')),'load',[bx,top,cz]);
          }
          for(const s of [-1,1]){const leaf=new T.Shape();leaf.moveTo(0,0);leaf.quadraticCurveTo(.035,.035,.065,.01);leaf.quadraticCurveTo(.025,-.015,0,0);const g=new T.ShapeGeometry(leaf,3);g.rotateY(s*Math.PI/2);b.add(color(g,new T.Color('#3d6845')),'load',[bx,top-.055,cz]);}
        }
      }
    }
    return true;
  }
  if(kind==='plants'){
    const potH=h*.28,r=Math.min(a,w)*.34,soil=y+potH-.018;
    const pot=new T.LatheGeometry([[r*.68,0],[r*.96,potH-.025],[r,potH-.025],[r,potH],[r*.88,potH],[r*.85,potH-.035]].map(p=>new T.Vector2(p[0],p[1])),18);
    b.add(pot,'frame',[x,y,z]);b.ring(r*.94,.009,[x,y+potH-.008,z],'frame',[Math.PI/2,0,0]);
    b.add(color(new T.CylinderGeometry(r*.86,r*.86,.012,16),new T.Color('#393025')),'load',[x,soil,z]);
    for(let groove=0;groove<12;groove++){const angle=groove*Math.PI/6;b.bar([x+Math.sin(angle)*r*.70,y+.025,z+Math.cos(angle)*r*.70],[x+Math.sin(angle)*r*.94,y+potH-.04,z+Math.cos(angle)*r*.94],.0025,'frame');}
    const vertices:number[]=[],colors:number[]=[],indices:number[]=[];
    for(let branch=0;branch<5;branch++){
      const angle=branch*2.399+serial*.61,spread=Math.min(a,w)*.18;
      const end=new T.Vector3(x+Math.cos(angle)*spread,y+h*(.80+(branch%3)*.06),z+Math.sin(angle)*spread),root=new T.Vector3(x,soil,z);
      b.bar(root.toArray() as [number,number,number],end.toArray() as [number,number,number],.005,'wood');
      for(let leaf=0;leaf<12;leaf++){
        const u=.20+leaf*.061,stem=root.clone().lerp(end,u),az=angle+leaf*2.399;
        const length=Math.min(a,w)*(.26+.025*Math.sin(leaf*3.1+serial)),width=length*.64;
        const direction=new T.Vector3(Math.cos(az),.22+Math.sin(leaf)*.16,Math.sin(az)).normalize(),cross=new T.Vector3(-Math.sin(az),0,Math.cos(az));
        const start=vertices.length/3,shade=new T.Color().setHSL(.27+(branch%3)*.012,.48,.065+.04*((leaf+serial)%4)/3);
        for(let segment=0;segment<=5;segment++)for(const lane of [-1,0,1]){
          const t=segment/5,spread=Math.sin(Math.PI*t)*width*.5;
          const p=stem.clone().addScaledVector(direction,length*t).addScaledVector(cross,lane*spread).add(new T.Vector3(0,.018*Math.sin(Math.PI*t)*(1-Math.abs(lane))-.030*t*t,0));
          vertices.push(...p.toArray());const light=lane===0?1.14:1;colors.push(shade.r*light,shade.g*light,shade.b*light);
        }
        for(let segment=0;segment<5;segment++)for(let lane=0;lane<2;lane++){
          const p=start+segment*3+lane;indices.push(p,p+3,p+1,p+1,p+3,p+4);
        }
      }
    }
    const foliage=new T.BufferGeometry();foliage.setAttribute('position',new T.Float32BufferAttribute(vertices,3));foliage.setAttribute('color',new T.Float32BufferAttribute(colors,3));foliage.setIndex(indices);foliage.computeVertexNormals();b.add(foliage,'load');
    return true;
  }
  if(kind==='bottles'){
    b.box([a-.012,.014,w-.012],[x,y+.007,z],'frame');
    for(const s of [-1,1]){
      for(const height of [.04,h*.45,h*.69]){b.box([a,.018,.018],[x,y+height,z+s*(w/2-.009)],'frame');b.box([.018,.018,w],[x+s*(a/2-.009),y+height,z],'frame');}
      for(let rib=0;rib<6;rib++)b.box([.008,h*.64,.014],[x+(rib-2.5)*(a-.025)/5,y+h*.35,z+s*(w/2-.007)],'frame');
      for(const end of [-1,1])b.box([.018,h*.70,.018],[x+end*(a/2-.009),y+h*.36,z+s*(w/2-.009)],'frame');
      for(const end of [-1,1])b.box([.014,h*.58,w*.30],[x+s*(a/2-.007),y+h*.34,z+end*w*.33],'frame');
      b.box([.018,.027,w*.36],[x+s*(a/2-.009),y+h*.67,z],'frame');
    }
    for(let ix=0;ix<4;ix++)for(let iz=0;iz<3;iz++){
      const bx=x+(ix-1.5)*a*.235,bz=z+(iz-1)*w*.30,r=Math.min(a/9,w/7)*.88;
      const profile=[[0,.018],[r,.018],[r,h*.57],[r*.86,h*.65],[r*.36,h*.73],[r*.36,h*.90],[0,h*.90]].map(p=>new T.Vector2(p[0],p[1]));
      b.add(color(new T.LatheGeometry(profile,10),new T.Color(serial%3===0?'#735126':'#426748'),.08),'cargoGlass',[bx,y,bz]);
      b.cylinder(r*.43,.016,[bx,y+h*.91,bz],'metal',[0,0,0],8);
      b.add(new T.CylinderGeometry(r*1.015,r*1.015,h*.20,10,1,true),'white',[bx,y+h*.40,bz]);
      b.box([.008,.008,w*.87],[bx,y+.020,z],'frame');
    }
    return true;
  }
  if(kind==='glass'||kind==='panels'){
    const side=z<0?-1:1,lean=Math.asin(Math.min(.12,w*.65)/h),rotation:Vec=[-side*lean,0,0];
    const local=(p:Vec):Vec=>new T.Vector3(...p).applyEuler(new T.Euler(...rotation)).add(new T.Vector3(x,y+h/2,z)).toArray() as [number,number,number];
    for(let pane=0;pane<4;pane++){
      const depth=kind==='glass'?.006:.014,offset=(pane-1.5)*(depth+.004);
      b.box([a-.018,h-.02,depth],local([0,0,offset]),kind==='glass'?'cargoGlass':'load',.001,rotation);
      if(kind==='glass')for(const edge of [-1,1])b.box([.004,h-.02,.004],local([edge*(a/2-.011),0,offset]),'load',0,rotation);
      for(const edge of [-1,1])b.box([.06,.045,depth+.006],local([edge*a*.32,-h*.45,offset]),'wood',0,rotation);
    }
    for(const end of [-1,1]){
      const px=x+end*a*.32;
      b.box([.055,.06,w*.92],[px,y+.025,z],'rubber');
      b.box([.035,h*.95,.024],local([end*a*.32,-.01,side*.020]),'strap',.002,rotation);
      b.box([.075,.10,.035],local([end*a*.32,-h*.27,side*.025]),'metal',.004,rotation);
    }
    return true;
  }
  if(kind==='cable'){
    const radius=Math.min(a,h)*.485,cy=y+radius;
    const flange=new T.Shape();flange.absarc(0,0,radius,0,Math.PI*2,false);
    const hole=new T.Path();hole.absarc(0,0,radius*.14,0,Math.PI*2,true);flange.holes.push(hole);
    for(const s of [-1,1]){
      b.add(new T.ExtrudeGeometry(flange,{depth:.028,bevelEnabled:false,curveSegments:24}),'wood',[x,cy,z+s*(w/2-.045)-.014]);
      for(let bolt=0;bolt<6;bolt++){
        const angle=bolt*Math.PI/3,px=x+Math.cos(angle)*radius*.64,py=cy+Math.sin(angle)*radius*.64;
        b.cylinder(.012,.012,[px,py,z+s*(w/2-.02)],'metal',[Math.PI/2,0,0],6);
      }
      for(let seam=-3;seam<=3;seam++){
        const dx=seam*radius*.23,dy=Math.sqrt(radius*radius-dx*dx)*.96;
        if(seam!==0)b.bar([x+dx,cy-dy,z+s*(w/2-.026)],[x+dx,cy+dy,z+s*(w/2-.026)],.0015,'frame');
      }
    }
    const profile:T.Vector2[]=[];
    for(let turn=0;turn<=64;turn++)profile.push(new T.Vector2(radius*(turn%2===0?.79:.81),-w*.43+turn*w*.86/64));
    b.add(new T.LatheGeometry(profile,32),'rubber',[x,cy,z],[Math.PI/2,0,0]);
    for(const s of [-1,1])for(const end of [-1,1])b.box([.14,.10,.18],[x+end*radius*.77,y+.075,z+s*w*.34],'wood',.008,[0,0,end*.30]);
    b.bar([x,cy,z-w*.47],[x,cy,z+w*.47],.035,'metal');
    for(const end of [-1,1]){
      b.bar([x+end*radius*.70,y+.05,z-w*.48],[x+end*radius*.70,cy+radius*.58,z],.014,'strap');
      b.bar([x+end*radius*.70,cy+radius*.58,z],[x+end*radius*.70,y+.05,z+w*.48],.014,'strap');
    }
    return true;
  }
  return false;
}

/** Original construction-shaped cargo meshes, in the declared unit's metre envelope. */
export function buildDetailedLoad(kind:'cars'|'excavator'|'tractor',size:Vec,origin:Vec,b:Builder){
  const [a,w,h]=size,[x,y,z]=origin;
  const point=(u:number,v:number,s=0):Vec=>[x+u*a,y+v*h,z+s*w];
  const extrude=(shape:T.Shape,depth:number,part:Part,offset=-depth/2,bevel=0)=>b.add(new T.ExtrudeGeometry(shape,{depth,curveSegments:24,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2}),part,[x,y,z+offset]);
  const polygon=(points:readonly Vec[],part:Part)=>{
    const vertices=points.flatMap(p=>[...p]),indices:number[]=[];
    for(let i=1;i<points.length-1;i++)indices.push(0,i,i+1);
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();b.add(geometry,part);
  };
  const pin=(u:number,v:number,r=.025,center=0,width=.22)=>b.cylinder(h*r,w*width,point(u,v,center),'metal',[Math.PI/2,0,0],24);
  const hose=(points:Vec[])=>b.add(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),24,.009,5,false),'rubber');
  const piston=(start:Vec,end:Vec,radius:number)=>{
    const middle=new T.Vector3(...start).lerp(new T.Vector3(...end),.58).toArray() as [number,number,number];
    b.bar(start,middle,radius,'frame');b.bar(middle,end,radius*.57,'metal');
  };
  const tire=(u:number,radius:number,side:number,width:number,centerY=radius,agricultural=false)=>{
    const center:Vec=[x+a*u,y+centerY+(agricultural?.017:0),z+side*(w/2-width*.55)];
    const profile=[[.59,-.42],[.76,-.52],[.93,-.46],[1,-.31],[1,.31],[.93,.46],[.76,.52],[.59,.42],[.59,-.42]].map(([r,d])=>new T.Vector2(r*radius,d*width));
    b.add(new T.LatheGeometry(profile,32),'rubber',center,[Math.PI/2,0,0]);
    b.cylinder(radius*.60,width*.98,center,'metal',[Math.PI/2,0,0],32);
    b.cylinder(radius*.20,width*1.07,center,'frame',[Math.PI/2,0,0],20);
    for(let i=0;i<(agricultural?24:32);i++){
      const angle=i*Math.PI*2/(agricultural?24:32);
      for(const lane of [-1,1])b.box([radius*(agricultural?.15:.035),agricultural?.025:.003,width*.38],
        [center[0]+Math.sin(angle)*(radius+.002),center[1]+Math.cos(angle)*(radius+.002),center[2]+lane*width*.20],
        'rubber',0,[0,lane*(agricultural?.55:.10),-angle]);
    }
    for(let i=0;i<6;i++){const angle=i*Math.PI/3;b.cylinder(radius*.035,.013,[center[0]+Math.sin(angle)*radius*.35,center[1]+Math.cos(angle)*radius*.35,center[2]+side*width*.51],'frame',[Math.PI/2,0,0],8);}
    return center;
  };

  if(kind==='cars'){
    // Continuous sculpted body. Its lower side edges rise around real wheel-arch openings.
    const positions:number[]=[],indices:number[]=[],columns=80,ringCount=10;
    const stations=[[-.49,.36,.35],[-.43,.47,.44],[-.24,.49,.46],[.10,.49,.47],[.34,.46,.44],[.47,.39,.41],[.49,.33,.34]];
    for(let column=0;column<=columns;column++){
      const u=-.49+.98*column/columns;
      let station=0;while(station<stations.length-2&&u>stations[station+1][0])station++;
      const t=(u-stations[station][0])/(stations[station+1][0]-stations[station][0]);
      const top=(stations[station][1]*(1-t)+stations[station+1][1]*t)*h,half=(stations[station][2]*(1-t)+stations[station+1][2]*t)*w;
      let arch=h*.18;
      for(const axle of [-.31,.30]){const d=(u-axle)*a,r=h*.208;if(Math.abs(d)<r)arch=Math.max(arch,h*.205+Math.sqrt(r*r-d*d));}
      const section=[[-half*.78,h*.18],[-half*.98,arch],[-half,top-h*.055],[-half*.92,top],[-half*.67,top+h*.012],[half*.67,top+h*.012],[half*.92,top],[half,top-h*.055],[half*.98,arch],[half*.78,h*.18]];
      for(const [side,v] of section)positions.push(x+u*a,y+v,z+side);
    }
    for(let c=0;c<columns;c++)for(let j=0;j<ringCount;j++){const k=c*ringCount+j,n=c*ringCount+(j+1)%ringCount;indices.push(k,n,k+ringCount,n,n+ringCount,k+ringCount);}
    for(const end of [0,columns])for(let j=1;j<ringCount-1;j++)indices.push(end*ringCount,end*ringCount+j+(end===0?1:0),end*ringCount+j+(end===0?0:1));
    const body=new T.BufferGeometry();body.setAttribute('position',new T.Float32BufferAttribute(positions,3));body.setIndex(indices);body.computeVertexNormals();b.add(body,'load');
    // Curved laminated screens and a crowned roof, not a glass box.
    const screen=(front:boolean)=>{
      const vertices:number[]=[],ind:number[]=[],cols=24,rows=8;
      for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
        const v=j/rows,s=i/cols*2-1,u=front?-.215+v*.145:.325-v*.17;
        vertices.push(x+u*a+(1-s*s)*a*.006,y+h*(.505+v*.365+(1-s*s)*.018),z+s*w*(.417-v*.080));
      }
      for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const k=j*(cols+1)+i;ind.push(k,k+1,k+cols+1,k+1,k+cols+2,k+cols+1);}
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(front?ind:ind.reverse());g.computeVertexNormals();b.add(g,'glass');
    };screen(true);screen(false);
    const roofShape=new T.Shape();roofShape.moveTo(-a*.071,h*.858);roofShape.quadraticCurveTo(a*.03,h*.920,a*.155,h*.86);roofShape.lineTo(a*.155,h*.838);roofShape.quadraticCurveTo(a*.03,h*.895,-a*.071,h*.838);roofShape.closePath();extrude(roofShape,w*.67,'load');
    for(const side of [-1,1]){
      polygon([point(-.20,.51,side*.43),point(-.065,.855,side*.337),point(.15,.855,side*.337),point(.30,.51,side*.43)],'glass');
      for(const [u,v,uu,vv] of [[-.215,.505,-.07,.866],[.155,.866,.325,.505],[.06,.51,.06,.875]] as const)b.bar(point(u,v,side*.435),point(uu,vv,side*.34),h*.012,'load');
      b.bar(point(-.215,.495,side*.44),point(.325,.495,side*.44),h*.007,'frame');
      b.bar(point(.06,.225,side*.463),point(.06,.49,side*.449),.0025,'frame');
      b.bar(point(-.22,.235,side*.445),point(-.22,.49,side*.445),.0025,'frame');
      b.box([a*.042,.015,.018],point(.025,.46,side*.46),'metal',.004);
      b.box([a*.06,h*.06,w*.07],point(-.18,.52,side*.455),'load',.025);
      for(const axle of rollingSupports(kind,size)){
        const center=tire(axle.x/a,axle.tireRadius,side,w*.102,axle.centerY);
        for(let spoke=0;spoke<5;spoke++){const angle=spoke*Math.PI*2/5;b.bar([center[0]+Math.sin(angle)*h*.025,center[1]+Math.cos(angle)*h*.025,center[2]+side*w*.055],[center[0]+Math.sin(angle)*h*.105,center[1]+Math.cos(angle)*h*.105,center[2]+side*w*.055],.011,'metal');}
      }
      b.box([a*.20,h*.23,w*.22],point(-.02,.55,side*.22),'seat',.05);
      b.box([a*.05,h*.24,w*.22],point(.04,.66,side*.22),'seat',.04);
      b.box([a*.025,h*.07,w*.15],point(-.471,.365,side*.29),'lamp',.024,[0,side*.12,0]);
      b.box([a*.018,h*.055,w*.19],point(.471,.345,side*.29),'red',.015);
    }
    b.box([a*.018,h*.11,w*.42],point(-.486,.285),'frame',.025);
    for(const end of [-1,1])b.box([.012,h*.05,w*.18],point(end*.494,.30),'white',.004);
    b.ring(h*.075,.012,point(-.12,.60,.22),'frame',[0,Math.PI/2,0]);
    return;
  }

  if(kind==='excavator'){
    const {trackLength,trackRadius,straight,trackY}=trackProfile(size),trackW=w*.18;
    const capsule=(length:number,r:number)=>{
      const shape=new T.Shape(),d=length/2-r;shape.moveTo(-d,-r);shape.lineTo(d,-r);shape.absarc(d,0,r,-Math.PI/2,Math.PI/2,false);shape.lineTo(-d,r);shape.absarc(-d,0,r,Math.PI/2,Math.PI*1.5,false);shape.closePath();return shape;
    };
    for(const side of [-1,1]){
      const track=capsule(trackLength,trackRadius);const inner=capsule(trackLength-h*.045,trackRadius-h*.035);track.holes.push(new T.Path(inner.getPoints(48).reverse()));
      b.add(new T.ExtrudeGeometry(track,{depth:trackW,bevelEnabled:false,curveSegments:24}),'frame',[x,y+trackY,z+side*w*.38-trackW/2]);
      const perimeter=2*straight+Math.PI*2*trackRadius,pads=48;
      for(let n=0;n<pads;n++){
        const d=n*perimeter/pads;let px:number,py:number,angle:number;
        if(d<straight){px=-straight/2+d;py=trackRadius;angle=0;}
        else if(d<straight+Math.PI*trackRadius){const theta=Math.PI/2-(d-straight)/trackRadius;px=straight/2+Math.cos(theta)*trackRadius;py=Math.sin(theta)*trackRadius;angle=theta-Math.PI/2;}
        else if(d<2*straight+Math.PI*trackRadius){px=straight/2-(d-straight-Math.PI*trackRadius);py=-trackRadius;angle=Math.PI;}
        else{const theta=-Math.PI/2-(d-2*straight-Math.PI*trackRadius)/trackRadius;px=-straight/2+Math.cos(theta)*trackRadius;py=Math.sin(theta)*trackRadius;angle=theta-Math.PI/2;}
        b.box([perimeter/pads*.93,.018,w*.195],[x+px,y+trackY+py,z+side*w*.38],'metal',0,[0,0,angle]);
      }
      for(let i=0;i<6;i++){const u=(i/5-.5)*straight/a;b.cylinder(trackRadius*.66,trackW*.94,point(u,.105,side*.38),'metal',[Math.PI/2,0,0],24);}
      for(const end of [-1,1]){b.cylinder(trackRadius*.84,trackW*1.02,[x+end*straight/2,y+trackY,z+side*w*.38],'frame',[Math.PI/2,0,0],28);b.cylinder(trackRadius*.38,trackW*1.04,[x+end*straight/2,y+trackY,z+side*w*.38],'metal',[Math.PI/2,0,0],20);}
    }
    b.box([a*.46,h*.08,w*.61],point(0,.23),'frame',.045);b.cylinder(w*.24,h*.055,point(.035,.285),'metal',[0,0,0],48);
    // Rounded, asymmetric cast counterweight, seen in plan; upper deck has its own outline.
    const engine=new T.Shape();engine.moveTo(-a*.07,-w*.15);engine.lineTo(a*.23,-w*.15);engine.quadraticCurveTo(a*.33,-w*.12,a*.33,w*.18);engine.quadraticCurveTo(a*.32,w*.38,a*.24,w*.39);engine.lineTo(-a*.11,w*.39);engine.lineTo(-a*.14,w*.16);engine.closePath();
    b.add(new T.ExtrudeGeometry(engine,{depth:h*.27,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:3,curveSegments:24}),'load',point(0,.59),[Math.PI/2,0,0]);
    b.box([a*.25,.025,w*.32],point(.14,.61,.13),'load',.02);
    for(let vent=0;vent<10;vent++)b.box([a*.018,h*.11,.012],point(.04+vent*.022,.47,.397),'frame',.003);
    b.box([a*.39,h*.025,w*.79],point(.07,.325),'metal',.015);
    // Cab with raked front, a rounded roof corner and real window apertures.
    const cab=new T.Shape();cab.moveTo(-a*.27,h*.34);cab.lineTo(-a*.27,h*.61);cab.lineTo(-a*.205,h*.84);cab.quadraticCurveTo(-a*.19,h*.87,-a*.16,h*.87);cab.lineTo(-a*.015,h*.87);cab.lineTo(-a*.015,h*.34);cab.closePath();
    const window=new T.Path();window.moveTo(-a*.246,h*.43);window.lineTo(-a*.246,h*.61);window.lineTo(-a*.19,h*.82);window.lineTo(-a*.04,h*.82);window.lineTo(-a*.04,h*.43);window.closePath();cab.holes.push(window);
    b.add(new T.ExtrudeGeometry(cab,{depth:w*.31,bevelEnabled:false,curveSegments:20}),'load',point(0,0,-.37));
    const sideWindow=new T.Shape(window.getPoints(24));
    for(const sideZ of [-.372,-.058])b.add(new T.ShapeGeometry(sideWindow,24),'glass',point(0,0,sideZ));
    polygon([point(-.269,.43,-.36),point(-.269,.60,-.36),point(-.204,.835,-.36),point(-.204,.835,-.07),point(-.269,.60,-.07),point(-.269,.43,-.07)],'glass');
    b.box([a*.08,h*.18,w*.16],point(-.10,.53,-.215),'seat',.04);b.box([a*.035,h*.22,w*.16],point(-.06,.64,-.215),'seat',.035);
    b.bar(point(-.20,.42,-.215),point(-.22,.55,-.215),.013,'frame');b.ring(h*.05,.009,point(-.22,.55,-.215),'frame',[0,Math.PI/2,0]);
    b.box([a*.16,.03,w*.28],point(-.12,.872,-.215),'load',.02);b.box([a*.045,.014,w*.025],point(-.055,.58,-.378),'metal',.005);
    b.box([a*.10,.035,w*.30],point(-.18,.32,-.23),'frame');
    // Bent box-section boom and tapered dipper with transverse pins.
    const boom=new T.Shape();boom.moveTo(-a*.025,h*.43);boom.quadraticCurveTo(-a*.12,h*.72,-a*.245,h*.94);boom.quadraticCurveTo(-a*.28,h*.98,-a*.31,h*.91);boom.lineTo(-a*.397,h*.755);boom.lineTo(-a*.375,h*.715);boom.lineTo(-a*.274,h*.875);boom.quadraticCurveTo(-a*.14,h*.65,-a*.055,h*.42);boom.closePath();extrude(boom,w*.16,'load',w*.05,.008);
    const dipper=new T.Shape();dipper.moveTo(-a*.397,h*.76);dipper.lineTo(-a*.424,h*.735);dipper.lineTo(-a*.432,h*.30);dipper.lineTo(-a*.40,h*.285);dipper.lineTo(-a*.386,h*.65);dipper.closePath();extrude(dipper,w*.13,'load',w*.065,.006);
    pin(-.04,.445,.030,.13,.22);pin(-.391,.735,.024,.13,.22);pin(-.417,.30,.023,.13,.22);
    for(const side of [.015,.245]){
      piston(point(.015,.40,side),point(-.22,.84,side),h*.022);
      piston(point(-.267,.90,side),point(-.414,.43,side),h*.018);
    }
    hose([point(-.02,.46,.26),point(-.15,.75,.26),point(-.27,.95,.26),point(-.395,.75,.26),point(-.408,.39,.23)]);
    // Curved scoop shell, side cheeks and tapered teeth; open mouth faces forward.
    const bucket=new T.Shape();bucket.moveTo(-a*.386,h*.31);bucket.quadraticCurveTo(-a*.35,h*.125,-a*.43,h*.075);bucket.lineTo(-a*.49,h*.085);bucket.lineTo(-a*.49,h*.105);bucket.quadraticCurveTo(-a*.398,h*.10,-a*.410,h*.295);bucket.closePath();extrude(bucket,w*.40,'frame',-w*.07);
    const cheek=new T.Shape();cheek.moveTo(-a*.386,h*.31);cheek.quadraticCurveTo(-a*.35,h*.125,-a*.43,h*.075);cheek.lineTo(-a*.49,h*.085);cheek.lineTo(-a*.43,h*.22);cheek.closePath();
    for(const sideZ of [-w*.07,w*.315])extrude(cheek,w*.015,'frame',sideZ);
    for(let tooth=0;tooth<5;tooth++){
      const t=new T.Shape();t.moveTo(-a*.477,h*.103);t.lineTo(-a*.498,h*.09);t.lineTo(-a*.495,h*.075);t.lineTo(-a*.475,h*.078);t.closePath();extrude(t,w*.045,'metal',w*(-.045+tooth*.079));
    }
    piston(point(-.411,.49,.25),point(-.383,.275,.25),h*.012);
    b.cylinder(.027,h*.16,point(.18,.69,.10),'frame');b.box([.05,.04,.08],point(-.205,.855,-.365),'lamp',.01);
    return;
  }

  // Agricultural tractor: profiled bonnet, framed cab, rear fenders and deep chevron tires.
  const rearRadius=h*.245;
  for(const side of [-1,1]){
    for(const axle of rollingSupports(kind,size))tire(axle.x/a,axle.tireRadius,side,axle.x<0?w*.16:w*.24,axle.centerY-.017,true);
    b.add(new T.CylinderGeometry(rearRadius+.035,rearRadius+.035,w*.27,36,1,true,Math.PI/2,Math.PI),'load',[x+a*.23,y+rearRadius,z+side*w*.36],[Math.PI/2,0,0]);
    b.box([a*.13,.025,w*.15],point(.14,.50,side*.365),'load',.012);
    b.bar(point(-.04,.26,side*.25),point(-.04,.43,side*.25),.025,'frame');
    b.box([a*.09,.027,w*.20],point(-.04,.29,side*.30),'metal');b.box([a*.08,.027,w*.17],point(-.04,.36,side*.28),'metal');
  }
  b.box([a*.62,h*.10,w*.38],point(-.06,.245),'frame',.04);b.cylinder(.04,w*.80,point(-.325,.15),'frame',[Math.PI/2,0,0]);
  const bonnet=new T.Shape();bonnet.moveTo(-a*.465,h*.275);bonnet.lineTo(-a*.465,h*.43);bonnet.quadraticCurveTo(-a*.44,h*.49,-a*.35,h*.51);bonnet.lineTo(-a*.07,h*.56);bonnet.lineTo(-a*.025,h*.30);bonnet.closePath();extrude(bonnet,w*.43,'load',-w*.215,.025);
  b.box([.012,h*.115,w*.36],point(-.472,.375),'frame',.025);
  for(let slat=0;slat<8;slat++)b.box([.016,.009,w*.32],point(-.476,.325+slat*.012),'metal');
  for(const side of [-1,1])b.box([.022,.055,.075],point(-.48,.448,side*.13),'lamp',.02);
  const cabOutline:Vec[]=[point(-.07,.43,-.285),point(-.045,.86,-.265),point(.22,.86,-.265),point(.26,.43,-.285)];
  for(const side of [-1,1]){
    const points=cabOutline.map(p=>[p[0],p[1],z+side*Math.abs(p[2]-z)] as Vec);polygon(points,'glass');
    for(let j=0;j<points.length;j++)b.bar(points[j],points[(j+1)%points.length],.018,'frame');
    b.bar(point(.08,.44,side*.286),point(.08,.86,side*.266),.013,'frame');
    b.box([.06,.018,.018],point(.02,.58,side*.294),'metal',.004);
    b.bar(point(-.04,.80,side*.27),point(-.08,.80,side*.37),.012,'metal');b.box([.055,.09,.022],point(-.08,.78,side*.38),'frame',.01);
  }
  polygon([point(-.07,.43,-.285),point(-.045,.86,-.265),point(-.045,.86,.265),point(-.07,.43,.285)],'glass');
  polygon([point(.26,.43,-.285),point(.22,.86,-.265),point(.22,.86,.265),point(.26,.43,.285)],'glass');
  b.box([a*.32,.045,w*.61],point(.09,.88),'white',.03);
  b.box([a*.10,h*.13,w*.25],point(.10,.48),'seat',.04);b.box([a*.035,h*.22,w*.25],point(.16,.61),'seat',.035);
  b.bar(point(-.02,.43),point(-.04,.60),.018,'frame');b.ring(h*.06,.012,point(-.04,.60),'frame',[0,0,Math.PI/2]);
  b.cylinder(.028,h*.27,point(-.16,.67,.20),'frame');b.cylinder(.035,.025,point(-.16,.81,.20),'metal');
  for(const side of [-1,1]){b.bar(point(.32,.24,side*.17),point(.43,.14,side*.23),.025,'metal');b.box([.03,.08,.05],point(.435,.14,side*.23),'frame',.01);}
  b.box([a*.10,h*.10,w*.36],point(-.43,.21),'frame',.02);
}
