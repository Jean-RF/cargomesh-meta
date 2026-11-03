"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useIntakeController } from "./intake-controller";
import {EMPTY_PROTOTYPE_DRAFT} from './prototype-model';
import {useDeclarationMedia} from './use-declaration-media';
import {workspaceSwitchGuard,type WorkspaceSwitchDetail} from '@/features/workspace-demo/switch-guard';

type IntakeSession=ReturnType<typeof useIntakeController>&{roadTransportSelected:boolean;selectRoadTransport:()=>void;media:ReturnType<typeof useDeclarationMedia>};
const IntakeSessionContext = createContext<IntakeSession | null>(null);

export function IntakeSessionProvider({ children }: { children: ReactNode }) {
  const session = useIntakeController();
  const media=useDeclarationMedia(session.draft,session.request,session.updateFromChat);
  const [roadTransportSelected,setRoadTransportSelected]=useState(false);
  const selectRoadTransport=useCallback(()=>setRoadTransportSelected(true),[]);
  useEffect(()=>{
   const beforeSwitch=(event:Event)=>{
    const detail=(event as CustomEvent<WorkspaceSwitchDetail>).detail;
    if(!detail)return;
    const guard=workspaceSwitchGuard({phase:session.submitPhase,hasRequest:!!session.request,dirtyAfterCreate:session.dirtyAfterCreate,draft:session.draft,emptyDraft:EMPTY_PROTOTYPE_DRAFT});
    if(guard==='busy'||media.busy||media.recording||media.requestingMic){
     event.preventDefault();detail.blockedReason=session.t('Espera a que termine la operación.','Wait for the operation to finish.');
    }else if(guard==='unsaved')detail.confirmation=session.t('Tus cambios sin guardar se perderán al continuar.','Your unsaved changes will be lost if you continue.');
   };
   window.addEventListener('cargomesh:before-workspace-switch',beforeSwitch);
   return()=>window.removeEventListener('cargomesh:before-workspace-switch',beforeSwitch);
  },[session.submitPhase,session.request,session.dirtyAfterCreate,session.draft,session.t,media.busy,media.recording,media.requestingMic]);
  return <IntakeSessionContext.Provider value={{...session,media,roadTransportSelected,selectRoadTransport,createDraftAndEvaluate:()=>media.ensureIdle()?session.createDraftAndEvaluate():Promise.resolve(),retryAfterCreate:()=>media.ensureIdle()?session.retryAfterCreate():Promise.resolve(),reset:()=>{media.reset();session.reset();setRoadTransportSelected(false);}}}>{children}</IntakeSessionContext.Provider>;
}

export function useOptionalIntakeSession() { return useContext(IntakeSessionContext); }
export function useIntakeSession() {
  const session = useOptionalIntakeSession();
  if (!session) throw new Error("The client intake requires its shared workspace session.");
  return session;
}
