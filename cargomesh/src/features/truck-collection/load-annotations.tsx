'use client';
import {useEffect,useMemo,type RefObject} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {Box3,Box3Helper,BufferGeometry,Float32BufferAttribute,Group,Line,LineBasicMaterial,Raycaster,Vector2,Vector3} from 'three';
import {loadLeaderRoute,type LeaderTarget} from './load-leader-route';

export type TruckLoadLabel={id:string;label:string;weightKg:number;sharePercent:number;bounds:{min:readonly[number,number,number];max:readonly[number,number,number]}};
export function LoadAnnotations({labels,selected,elements,active,frame,bridge,tip}:{labels:readonly TruckLoadLabel[];selected?:string;elements:RefObject<Map<string,HTMLButtonElement>>;active:boolean;frame:RefObject<HTMLDivElement|null>;bridge:RefObject<SVGPathElement|null>;tip:RefObject<SVGPathElement|null>}){
 const {scene,invalidate,gl}=useThree();
 const leader=useMemo(()=>{
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(new Float32Array(18),3));
  const line=new Line(geometry,new LineBasicMaterial({color:0xa46a0b,depthTest:true,depthWrite:false,fog:false}));line.frustumCulled=false;
  const group=new Group();group.add(line);group.visible=false;
  return {group,line,raycaster:new Raycaster()};
 },[]);
 useEffect(()=>{scene.add(leader.group);return()=>{scene.remove(leader.group);leader.line.geometry.dispose();leader.line.material.dispose();};},[scene,leader]);
 useEffect(()=>{invalidate();},[active,selected,labels,invalidate]);
 useEffect(()=>{
  const label=labels.find(l=>l.id===selected);if(!active||!label)return;
  const helper=new Box3Helper(new Box3(new Vector3(...label.bounds.min),new Vector3(...label.bounds.max)),0xa46a0b);scene.add(helper);invalidate();
  return()=>{scene.remove(helper);helper.geometry.dispose();if(Array.isArray(helper.material))helper.material.forEach(m=>m.dispose());else helper.material.dispose();invalidate();};
 },[active,labels,selected,scene,invalidate]);
 useFrame(({camera,size})=>{
  leader.group.visible=false;if(bridge.current)bridge.current.style.visibility='hidden';if(tip.current)tip.current.style.visibility='hidden';gl.domElement.dataset.leaderState='idle';
  const label=labels.find(l=>l.id===selected),element=selected?elements.current.get(selected):null;
  const model=scene.children.find(node=>node.userData.designId);
  if(!active||!label||!element||!model||!frame.current||!bridge.current||!tip.current)return;
  camera.updateMatrixWorld();
  const bounds=new Box3().setFromObject(model),corners:Vector3[]=[];
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])corners.push(new Vector3(x,y,z));
  const projected=corners.map(point=>point.clone().project(camera)).map(p=>({x:(p.x+1)*size.width/2,y:(1-p.y)*size.height/2}));
  const truck={left:Math.min(...projected.map(p=>p.x)),right:Math.max(...projected.map(p=>p.x)),top:Math.min(...projected.map(p=>p.y)),bottom:Math.max(...projected.map(p=>p.y))};
  const {min,max}=label.bounds,loadCorners:Vector3[]=[];
  for(const x of [min[0],max[0]])for(const y of [min[1],max[1]])for(const z of [min[2],max[2]])loadCorners.push(new Vector3(x,y,z));
  const loadPoints=loadCorners.map(p=>p.clone().project(camera));
  const loadNear=Math.min(...loadCorners.map(p=>-p.clone().applyMatrix4(camera.matrixWorldInverse).z));
  if(loadPoints.every(p=>p.z<=-1||p.z>=1)){gl.domElement.dataset.leaderState='offscreen';return;}
  const points2d=loadPoints.map(p=>({x:(p.x+1)*size.width/2,y:(1-p.y)*size.height/2,depth:p.z}));
  const edge=(axis:'x'|'y',sign:number)=>points2d.reduce((a,b)=>a[axis]*sign>b[axis]*sign?a:b);
  const right=edge('x',1),top=edge('y',-1),left=edge('x',-1),bottom=edge('y',1);
  const candidates:(LeaderTarget&{depth:number})[]=[{x:right.x+10,y:right.y,side:'right',depth:right.depth},{x:top.x,y:top.y-10,side:'top',depth:top.depth},{x:left.x-10,y:left.y,side:'left',depth:left.depth},{x:bottom.x,y:bottom.y+10,side:'bottom',depth:bottom.depth}];
  const canvasRect=gl.domElement.getBoundingClientRect(),frameRect=frame.current.getBoundingClientRect(),buttonRect=element.getBoundingClientRect();
  const startY=buttonRect.top+buttonRect.height/2-canvasRect.top;
  let route:ReturnType<typeof loadLeaderRoute>=null,tipDepth=0,tipDistance=0;
  for(const target of candidates){
   const candidate=loadLeaderRoute(size.width,size.height,startY,target,truck);if(!candidate||target.depth<=-1||target.depth>=1)continue;
   const end=candidate.at(-1)!,before=candidate.at(-2)!,length=Math.hypot(end.x-before.x,end.y-before.y);
   const dx=(end.x-before.x)/length,dy=(end.y-before.y)/length;
   const head=[end,{x:end.x-dx*10-dy*4,y:end.y-dy*10+dx*4},{x:end.x-dx*10+dy*4,y:end.y-dy*10-dx*4}];
   const clear=head.every(point=>{
    leader.raycaster.setFromCamera(new Vector2(point.x/size.width*2-1,1-point.y/size.height*2),camera);
    const endpoint=new Vector3(point.x/size.width*2-1,1-point.y/size.height*2,target.depth).unproject(camera);
    leader.raycaster.far=endpoint.distanceTo(camera.position)+.01;
    return !leader.raycaster.intersectObject(model,true).length;
   });
   if(clear){route=candidate;tipDepth=target.depth;tipDistance=-new Vector3(0,0,tipDepth).unproject(camera).applyMatrix4(camera.matrixWorldInverse).z;break;}
  }
  if(!route){gl.domElement.dataset.leaderState='occluded';return;}
  // Keep the perimeter behind the truck; approach the load at its depth, with normal occlusion.
  const truckFar=Math.max(...corners.map(p=>-p.clone().applyMatrix4(camera.matrixWorldInverse).z));
  const distance=truckFar+bounds.getSize(new Vector3()).length();
  const depth=Math.min(.9999,new Vector3(0,0,-distance).applyMatrix4(camera.matrixWorld).project(camera).z);
  const toWorld=(x:number,y:number,z=tipDepth)=>new Vector3(x/size.width*2-1,1-y/size.height*2,z).unproject(camera);
  const points=route.map((p,i)=>toWorld(p.x,p.y,i>=route.length-2?tipDepth:depth)),positions=leader.line.geometry.getAttribute('position');
  for(let i=0;i<points.length;i++)positions.setXYZ(i,points[i].x,points[i].y,points[i].z);positions.needsUpdate=true;leader.line.geometry.setDrawRange(0,points.length);
  leader.group.visible=true;
  const end=route.at(-1)!,origin=route.at(-2)!,length=Math.hypot(end.x-origin.x,end.y-origin.y),dx=(end.x-origin.x)/length,dy=(end.y-origin.y)/length;
  const x=canvasRect.left-frameRect.left+end.x,y=canvasRect.top-frameRect.top+end.y;
  tip.current.setAttribute('d',`M${x},${y} L${x-dx*10-dy*4},${y-dy*10+dx*4} L${x-dx*10+dy*4},${y-dy*10-dx*4} Z`);tip.current.style.visibility='visible';
  bridge.current.setAttribute('d',`M${buttonRect.right-frameRect.left+1},${buttonRect.top+buttonRect.height/2-frameRect.top} H${canvasRect.left-frameRect.left}`);bridge.current.style.visibility='visible';
  Object.assign(gl.domElement.dataset,{leaderState:'visible',leaderGroup:selected,leaderPlaneDistance:String(distance),leaderTruckFar:String(truckFar),leaderTipDistance:String(tipDistance),leaderLoadNear:String(loadNear)});
 });
 return null;
}
