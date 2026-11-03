type Point={x:number;y:number};
export type LeaderTarget=Point&{side:'left'|'right'|'top'|'bottom'};
type ScreenBounds={left:number;top:number;right:number;bottom:number};
export function loadLeaderRoute(width:number,height:number,startY:number,target:LeaderTarget,truck:ScreenBounds):Point[]|null{
 if(width<40||height<40||![width,height,startY,target.x,target.y,...Object.values(truck)].every(Number.isFinite)
  ||target.x<20||target.x>width-20||target.y<20||target.y>height-20)return null;
 const clampX=(n:number)=>Math.max(8,Math.min(width-8,n)),clampY=(n:number)=>Math.max(8,Math.min(height-8,n));
 const left=clampX(Math.min(truck.left-18,target.x-20)),right=clampX(Math.max(truck.right+18,target.x+20));
 const top=clampY(Math.min(truck.top-20,target.y-20)),bottom=clampY(Math.max(truck.bottom+20,target.y+20));
 const start={x:0,y:clampY(startY)},gutter={x:left,y:start.y};
 if(target.side==='right')return [start,gutter,{x:left,y:top},{x:right,y:top},{x:right,y:target.y},target];
 if(target.side==='left')return [start,gutter,{x:left,y:target.y},target];
 if(target.side==='bottom')return [start,gutter,{x:left,y:bottom},{x:target.x,y:bottom},target];
 return [start,gutter,{x:left,y:top},{x:target.x,y:top},target];
}
