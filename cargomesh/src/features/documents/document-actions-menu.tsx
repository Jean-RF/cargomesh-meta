"use client";
import { useId, useRef } from "react";
import { MoreHorizontal } from "lucide-react";
import { useLocale } from "@/features/i18n/locale-provider";
import s from "./request-documents.module.css";
export function DocumentActionsMenu({ actions, label }: { label: string; actions: { label: string; disabled?: boolean; action: () => void }[] }) {
  const id = useId(), panel = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), {t}=useLocale();
  return <><button ref={trigger} type="button" className={s.more} aria-label={`${t("Acciones", "Actions")}: ${label}`} popoverTarget={id} onClick={() => {
    const box = trigger.current?.getBoundingClientRect(), menu = panel.current;
    if(box && menu){const room=window.innerHeight-box.bottom-20,above=room<190&&box.top>210;menu.style.left=`${Math.max(12,Math.min(box.right-210,window.innerWidth-222))}px`;menu.style.top=above?"auto":`${box.bottom+8}px`;menu.style.bottom=above?`${window.innerHeight-box.top+8}px`:"auto";menu.style.maxHeight=`${Math.max(100,above?box.top-20:room)}px`;}
  }}><MoreHorizontal size={18}/></button><div ref={panel} id={id} popover="auto" className={s.rowMenu}>
    {actions.map((item,index)=><button key={index} type="button" disabled={item.disabled} onClick={()=>{panel.current?.hidePopover();item.action();}}>{item.label}</button>)}
  </div></>;
}
