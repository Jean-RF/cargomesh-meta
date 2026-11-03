import test from 'node:test';
import assert from 'node:assert/strict';
import {loadLeaderRoute} from './load-leader-route';

test('selected leader uses reserved gutters and approaches the selected boundary from its chosen side',()=>{
 for(const width of [220,480,820])for(const side of ['left','right','top','bottom'] as const){
  const target={x:width*.65,y:210,side},truck={left:45,top:70,right:width-45,bottom:310};
  const route=loadLeaderRoute(width,390,170,target,truck)!;
  assert.equal(route[0].x,0);assert.deepEqual(route.at(-1),target);
  assert(route.every(p=>p.x>=0&&p.x<=width&&p.y>=0&&p.y<=390));
  const before=route.at(-2)!;
  assert(side==='left'?before.x<target.x:side==='right'?before.x>target.x:side==='top'?before.y<target.y:before.y>target.y);
  if(side==='right'||side==='top')assert(route[2].y<truck.top);
 }
});
test('offscreen and invalid targets never get a misleading clamped leader',()=>{
 const truck={left:40,top:20,right:250,bottom:250};
 for(const target of [{x:-1,y:100},{x:301,y:100},{x:100,y:-1},{x:100,y:301},{x:NaN,y:100}])assert.equal(loadLeaderRoute(300,300,80,{...target,side:'top'},truck),null);
 assert.equal(loadLeaderRoute(0,300,80,{x:100,y:100,side:'top'},truck),null);
});
