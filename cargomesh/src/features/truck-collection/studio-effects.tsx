'use client';
import {useEffect,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {HalfFloatType,WebGLRenderTarget} from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

/** Contact shading separates tyres, grille recesses and stacked goods at rest. */
export function StudioEffects(){
  const {gl,scene,camera,size,invalidate}=useThree(),composer=useRef<EffectComposer|null>(null);
  useEffect(()=>{
    const target=new WebGLRenderTarget(1,1,{type:HalfFloatType,samples:4});
    const effects=new EffectComposer(gl,target),render=new RenderPass(scene,camera),ao=new GTAOPass(scene,camera),output=new OutputPass();
    ao.blendIntensity=.55;ao.updateGtaoMaterial({radius:.32,thickness:.18,samples:8});ao.updatePdMaterial({samples:8,radius:5});
    const renderScene=render.render.bind(render);
    render.render=(...args)=>{
      renderScene(...args);
      // Capture the actual scene pass, not the later full-screen output pass.
      const triangles=String(gl.info.render.triangles),calls=String(gl.info.render.calls);
      if(gl.domElement.dataset.triangles!==triangles)gl.domElement.dataset.triangles=triangles;
      if(gl.domElement.dataset.drawCalls!==calls)gl.domElement.dataset.drawCalls=calls;
    };
    effects.addPass(render);effects.addPass(ao);effects.addPass(output);effects.setPixelRatio(Math.min(gl.getPixelRatio(),1.5));effects.setSize(size.width,size.height);
    ao.setSize(Math.max(1,Math.round(size.width*.75)),Math.max(1,Math.round(size.height*.75)));
    composer.current=effects;gl.domElement.dataset.graphics='gtao-msaa';invalidate();
    return()=>{composer.current=null;render.dispose();ao.dispose();output.dispose();effects.dispose();};
  },[gl,scene,camera,size.width,size.height,invalidate]);
  useFrame(()=>composer.current?.render(),1);
  return null;
}
