'use client';
import {Canvas} from '@react-three/fiber';
import {useState,useMemo,useEffect} from 'react';
import {BoxGeometry,EdgesGeometry} from 'three';
import type {PackingPlan} from '@/shared/meta/cargo-packing';
const colors=['#19bca8','#f0b86b','#6b9fee','#d680b9','#85b870'];
function WireBox({size,color,opacity=1}:{size:[number,number,number];color:string;opacity?:number}){
 const [l,h,w]=size;
 const edges=useMemo(()=>{const box=new BoxGeometry(l,h,w);const result=new EdgesGeometry(box);box.dispose();return result;},[l,h,w]);
 useEffect(()=>()=>edges.dispose(),[edges]);
 return <lineSegments geometry={edges}><lineBasicMaterial color={color} transparent opacity={opacity}/></lineSegments>;
}
export default function PackingScene({plan}:{plan:PackingPlan}){
 const [angle,setAngle]=useState(-.4),[drag,setDrag]=useState<number|null>(null);
 const l=plan.vehicle.lengthCm/100,w=plan.vehicle.widthCm/100,h=plan.vehicle.heightCm/100;
 const max=Math.max(l,w,h),groups=[...new Set(plan.placements.map(p=>p.groupId))];
 return <div style={{height:360,background:'#102e32',borderRadius:16,touchAction:'pan-y'}} tabIndex={0}
  role="region" aria-label="Acomodo 3D. Flechas izquierda y derecha para girar."
  onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();setAngle(a=>a+(e.key==='ArrowLeft'?-.1:.1));}}}
  onPointerDown={e=>{setDrag(e.clientX);e.currentTarget.setPointerCapture(e.pointerId);}}
  onPointerUp={()=>setDrag(null)} onPointerCancel={()=>setDrag(null)}
  onPointerMove={e=>{if(drag!==null){setAngle(a=>a+(e.clientX-drag)*.008);setDrag(e.clientX);}}}>
  <Canvas camera={{position:[max*1.2,max*.95,max*1.3],fov:45}} dpr={[1,1.5]} fallback={<p>Consulta el plano 2D y la tabla: WebGL no está disponible.</p>}>
   <ambientLight intensity={1.5}/><directionalLight position={[4,8,5]} intensity={2}/>
   <group rotation={[0,angle,0]} position={[0,-h/3,0]}>
    <mesh position={[0,-.06,0]}><boxGeometry args={[l+.08,.12,w+.08]}/><meshStandardMaterial color="#64828a"/></mesh>
    <group position={[0,h/2,0]}><WireBox size={[l,h,w]} color="#a4d1d0" opacity={.5}/></group>
    {plan.placements.map(p=><group key={p.id} position={[(p.x+p.lengthCm/2)/100-l/2,p.heightCm/200,(p.y+p.widthCm/2)/100-w/2]}>
     <mesh><boxGeometry args={[Math.max(.001,p.lengthCm/100-.005),Math.max(.001,p.heightCm/100-.005),Math.max(.001,p.widthCm/100-.005)]}/><meshStandardMaterial color={colors[groups.indexOf(p.groupId)%colors.length]} roughness={.8}/></mesh>
     <WireBox size={[p.lengthCm/100,p.heightCm/100,p.widthCm/100]} color="#153b3b" opacity={.6}/>
    </group>)}
   </group>
  </Canvas>
 </div>;
}
