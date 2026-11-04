"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, MoreHorizontal, RefreshCw } from "lucide-react";
import { WorkspaceLink as Link } from "@/features/workspace-mode/workspace-link";
import { useLocale } from "@/features/i18n/locale-provider";
import { displayReference, locationDisplayLabel } from "@/shared/lib/display-identity";
import type { FreightRequestV2Data } from "@/features/v2-intake/contracts";
import { formatDateTime, formatMass } from "./shipper-model";
import { operationsHistoryState, operationsSearch, parseOperationsQuery } from "./operations-query";
import s from "./request-workspace-frame.module.css";

const tabs = ["overview", "contract", "documents", "activity"] as const;
type Tab = typeof tabs[number];
export function RequestWorkspaceFrame({ request, status, progress, incomplete, busy, primary, onRefresh, onEvaluate, onEdit, overview, commercial, documents, activity, children }: {
  request: FreightRequestV2Data; status: string; progress: readonly boolean[]; incomplete: boolean; busy: boolean;
  primary: ReactNode; onRefresh?: () => void; onEvaluate: () => void; onEdit?: () => void;
  overview: ReactNode; commercial: ReactNode; documents: ReactNode; activity: ReactNode; children?: ReactNode;
}) {
  const { t, localeTag } = useLocale(), params = useSearchParams(), pathname = usePathname();
  const query = parseOperationsQuery(params), selected = params.get("requestTab");
  const current: Tab = tabs.find(tab => tab === selected) ?? "overview";
  const [visited, setVisited] = useState<Set<Tab>>(() => new Set([current]));
  const menu = useRef<HTMLDetailsElement>(null), buttons = useRef(new Map<Tab, HTMLButtonElement>());
  useEffect(()=>{const close=(event:PointerEvent)=>{if(menu.current?.open&&!menu.current.contains(event.target as Node))menu.current.open=false;};document.addEventListener("pointerdown",close);return()=>document.removeEventListener("pointerdown",close);},[]);
  function select(tab: Tab) {
    setVisited(old => new Set([...old, tab]));
    const next = new URLSearchParams(window.location.search);
    if (tab === "overview") next.delete("requestTab"); else next.set("requestTab", tab);
    window.history.replaceState(operationsHistoryState(window.history.state), "", `${pathname}${next.size ? `?${next}` : ""}`);
  }
  const labels = { overview: t("Resumen", "Overview"), contract: t("Oferta y contrato", "Offer & contract"), documents: t("Documentos", "Documents"), activity: t("Actividad", "Activity") };
  const steps = [t("Solicitud creada", "Request created"), t("Ofertas recibidas", "Offers received"), t("Decisión", "Decision"), t("Reserva", "Booking"), t("Transporte confirmado", "Transport confirmed")];
  const nextStep = progress.findIndex(value => !value);
  return <div className={s.workspace}>
    <Link className={s.back} href={`/${query.view}${operationsSearch(query)}`}><ArrowLeft size={16}/>{query.view === "bookings" ? t("Reservas", "Bookings") : query.view === "history" ? t("Historial", "History") : t("Mis envíos", "My shipments")}</Link>
    <header className={s.header}>
      <div className={s.identity}><div><h1>{displayReference(request.referenceCode, "PED", request.id)}</h1><span className={s.status}>{status}</span></div>
        <p>{locationDisplayLabel(request.origin.city)} <span>→</span> {locationDisplayLabel(request.destination.city)}</p>
        <ul className={s.facts}><li>{formatMass(request.cargoSpecification.totalWeightKg, localeTag)} · {request.cargoSpecification.totalVolumeM3.toLocaleString(localeTag)} m³</li>
          <li><span>{t("Recojo", "Pickup")}</span> {formatDateTime(request.pickupWindow.startsAt, localeTag)}</li>{request.serviceType && <li>{request.serviceType}</li>}</ul>
      </div>
      <div className={s.actions}>{primary}<details className={s.menu} ref={menu} onKeyDown={event=>{if(event.key==="Escape"&&menu.current?.open){event.preventDefault();menu.current.open=false;menu.current.querySelector("summary")?.focus();}}}><summary aria-label={t("Más acciones", "More actions")}><MoreHorizontal size={20}/></summary>
        <div>{onRefresh && <button type="button" disabled={busy} onClick={() => { if(menu.current)menu.current.open=false; onRefresh(); }}><RefreshCw size={15}/>{t("Actualizar ofertas y reservas", "Refresh offers & bookings")}</button>}
          <button type="button" disabled={busy} onClick={() => { if(menu.current)menu.current.open=false; onEvaluate(); }}>{t("Reevaluar", "Reevaluate")}</button>
          {onEdit && <button type="button" disabled={busy} onClick={() => { if(menu.current)menu.current.open=false; onEdit(); }}>{t("Editar borrador", "Edit draft")}</button>}
        </div></details></div>
    </header>
    {children}
    <ol className={s.progress} aria-label={t("Progreso del envío", "Shipment progress")}>{steps.map((label, index) => <li key={label} data-done={progress[index] && (!incomplete || index === 0)} aria-current={!incomplete && index === nextStep ? "step" : undefined}>
      <span>{progress[index] && (!incomplete || index === 0) ? <Check size={14}/> : index + 1}</span><strong>{label}</strong></li>)}</ol>
    <nav className={s.tabs} role="tablist" aria-label={t("Detalle del envío", "Shipment detail")}>{tabs.map((tab, index) => <button type="button" role="tab" id={`request-tab-${tab}`} aria-controls={`request-panel-${tab}`} aria-selected={current === tab} tabIndex={current === tab ? 0 : -1} key={tab}
      ref={node => { if(node)buttons.current.set(tab,node); else buttons.current.delete(tab); }} onClick={() => select(tab)} onKeyDown={event => {
        const target = event.key === "ArrowRight" ? tabs[(index + 1) % tabs.length] : event.key === "ArrowLeft" ? tabs[(index + tabs.length - 1) % tabs.length] : event.key === "Home" ? tabs[0] : event.key === "End" ? tabs[tabs.length - 1] : null;
        if(target){event.preventDefault();select(target);buttons.current.get(target)?.focus();}
      }}>{labels[tab]}</button>)}</nav>
    {tabs.map(tab => <section key={tab} role="tabpanel" id={`request-panel-${tab}`} aria-labelledby={`request-tab-${tab}`} hidden={current !== tab} tabIndex={0} className={s.tabPanel}>
      {(visited.has(tab) || current === tab) ? { overview, contract: commercial, documents, activity }[tab] : null}
    </section>)}
  </div>;
}
