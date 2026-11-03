import assert from 'node:assert/strict';
import {test} from 'node:test';
import {PerspectiveCamera,Vector3} from 'three';
import {cameraKeyDirection,moveFactoryCamera} from './camera-navigation';

test('camera movement follows the view on the ground and preserves height, orbit and scale',()=>{
  const camera=new PerspectiveCamera();camera.position.set(6,4,8);const target=new Vector3(0,1,0),offset=camera.position.clone().sub(target);
  const start=camera.position.clone();assert(moveFactoryCamera(camera,target,['forward'],2));
  assert(camera.position.distanceTo(new Vector3(4.8,4,6.4))<1e-10);assert(camera.position.clone().sub(target).distanceTo(offset)<1e-10);
  moveFactoryCamera(camera,target,['back'],2);assert(camera.position.distanceTo(start)<1e-10);
  moveFactoryCamera(camera,target,['right'],1);assert(camera.position.clone().sub(start).distanceTo(new Vector3(.8,0,-.6))<1e-10);
  moveFactoryCamera(camera,target,['left'],1);assert(camera.position.distanceTo(start)<1e-10);
});
test('diagonal movement has constant speed, opposing directions cancel and top views stay finite',()=>{
  const camera=new PerspectiveCamera();camera.position.set(0,5,0);const target=new Vector3(),start=camera.position.clone();
  assert(moveFactoryCamera(camera,target,['forward','right','forward'],3));assert(Math.abs(camera.position.distanceTo(start)-3)<1e-10);assert.equal(camera.position.y,5);
  const position=camera.position.clone();assert.equal(moveFactoryCamera(camera,target,['left','right'],3),false);assert(camera.position.equals(position));
  for(const distance of [0,-1,NaN,Infinity])assert.equal(moveFactoryCamera(camera,target,['forward'],distance),false);
});
test('WASD and arrows map to the same directions without consuming unrelated keys',()=>{
  for(const [letter,arrow,direction] of [['KeyW','ArrowUp','forward'],['KeyS','ArrowDown','back'],['KeyA','ArrowLeft','left'],['KeyD','ArrowRight','right']]){assert.equal(cameraKeyDirection(letter),direction);assert.equal(cameraKeyDirection(arrow),direction);}
  for(const code of ['Space','Tab','Enter','Escape','KeyF','constructor','toString'])assert.equal(cameraKeyDirection(code),undefined);
});
