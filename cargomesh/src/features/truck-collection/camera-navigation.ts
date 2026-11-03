import {Camera,Vector3} from 'three';

export type CameraMove='forward'|'back'|'left'|'right';
export type FactoryCameraCommand={direction:CameraMove|'reset';revision:number};
const keyDirections:Record<string,CameraMove>={KeyW:'forward',ArrowUp:'forward',KeyS:'back',ArrowDown:'back',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'};
export function cameraKeyDirection(code:string):CameraMove|undefined{
  return Object.hasOwn(keyDirections,code)?keyDirections[code]:undefined;
}
/** Translate the camera and orbit target together on the factory's ground plane. */
export function moveFactoryCamera(camera:Camera,target:Vector3,directions:Iterable<CameraMove>,distance:number){
  if(!Number.isFinite(distance)||distance<=0)return false;
  const forward=target.clone().sub(camera.position);forward.y=0;
  if(forward.lengthSq()<1e-10)forward.set(0,0,-1);else forward.normalize();
  const right=new Vector3().crossVectors(forward,new Vector3(0,1,0)),delta=new Vector3();
  for(const direction of new Set(directions))delta.addScaledVector(direction==='left'||direction==='right'?right:forward,direction==='back'||direction==='left'?-1:1);
  if(delta.lengthSq()<1e-10)return false;
  delta.normalize().multiplyScalar(distance);camera.position.add(delta);target.add(delta);return true;
}
