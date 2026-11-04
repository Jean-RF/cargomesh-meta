"use client";
import {displayReference} from '@/shared/lib/display-identity';
import { ArrowRight, Building2, MessageSquareText, Send } from "lucide-react";
import { Button } from "@/components/ui";
import { formatDateTime } from "./shipper-model";
import { opportunityTargets, type CommercialContext } from "./commercial-context";
import { commonResponseChannels, carrierLabel, type CommercialCatalog } from "./commercial-catalog";
export { carrierLabel } from "./commercial-catalog";
import styles from "./shipper-portal.module.css";
import comparison from "./commercial-comparison.module.css";
import compactStyles from "./commercial-workspace.module.css";

export function opportunityLabel(status: string, t: (es: string, en: string) => string) {
  const labels: Record<string, [string, string]> = { SENT: ["Esperando respuesta", "Awaiting response"], ACCEPTED: ["Preparando oferta", "Preparing an offer"],
    OFFERED: ["Oferta emitida", "Offer issued"], DECLINED: ["Oportunidad declinada", "Opportunity declined"],
    CANCELLED: ["Oportunidad cancelada", "Opportunity cancelled"], EXPIRED: ["Plazo de respuesta vencido", "Response window expired"] };
  return labels[status] ? t(...labels[status]) : t("Estado no reconocido", "Unrecognized status");
}
export function OpportunityPanel({ context, catalog, busy, onRequest, t, localeTag, compact=false }: {
  context: CommercialContext; catalog: CommercialCatalog; busy: boolean;
  onRequest: (key: string) => void; t: (es: string, en: string) => string; localeTag: string; compact?: boolean;
}) {
  const targets = opportunityTargets(context);
  if(compact){
    if(!targets.length)return null;
    return <details className={compactStyles.conversation}><summary><span><MessageSquareText size={16}/>{t("Solicitudes a transportistas","Carrier conversations")}</span><span>{new Set(targets.map(target=>target.carrierId)).size} {t("transportistas","carriers")}</span></summary>
      <div className={compactStyles.conversationBody}>{targets.map(target=>{
        const channels=commonResponseChannels(target.serviceIds,target.carrierId,catalog);
        return <article key={target.key} className={compactStyles.conversationCard}>
          <header className={compactStyles.conversationHead}><strong>{carrierLabel(target.carrierId,catalog,t)}</strong><span className={compactStyles.status} data-review={!target.current}>{target.plan.data.requestVersion!==context.request.draftVersion?t("Requiere actualizar","Update needed"):target.current?t("Disponible para solicitar oferta","Ready to request quote"):t("Requiere revisión","Needs review")}</span></header>
          <p>{target.serviceIds.map(id=>{const service=catalog.services[id];return service?.state==="AVAILABLE"?`${service.mode} · ${service.serviceClass}`:t("Servicio sin verificar","Unverified service");}).join(" / ")}</p>
          {target.existing.map(row=><div className={compactStyles.conversationState} key={row.id}><strong>{opportunityLabel(row.status,t)}</strong><span>{t("Responder antes de","Respond by")}: {formatDateTime(row.data.responseDeadline,localeTag)}</span>
            <span>{context.offers.filter(offer=>offer.data.opportunityId===row.id&&offer.carrierId===row.carrierId&&offer.requestId===row.requestId&&offer.organizationId===row.organizationId).length} {t("ofertas","offers")}</span></div>)}
          {!target.existing.length&&<><Button variant="secondary" size="compact" disabled={busy||!target.current||!channels.length} onClick={()=>onRequest(target.key)}><Send size={14}/>{t("Solicitar oferta","Request offer")}</Button>
            {!target.current?<p>{t("Actualiza la evaluación de este plan antes de solicitar.","Update this plan's evaluation before requesting.")}</p>:!channels.length?<p>{t("No hay un canal de respuesta verificado.","No verified response channel is available.")}</p>:null}</>}
          <details><summary>{t("Detalles del plan","Plan details")}</summary><p>{displayReference(target.plan.id,"PLAN")} · v{target.plan.version} · {t("Solicitud","Request")} v{target.plan.data.requestVersion}</p>
            {(target.plan.data.exclusionReasons.length>0||target.plan.data.pendingRequirements.length>0)&&<ul>{[...target.plan.data.exclusionReasons,...target.plan.data.pendingRequirements].map((reason,index)=><li key={index}>{reason}</li>)}</ul>}
          </details>
        </article>;
      })}</div>
    </details>;
  }
  return <section className={styles.panel} aria-labelledby="opportunities-title">
    <header className={styles.panelHeader}><h2 id="opportunities-title">{t("Conversaciones con transportistas", "Carrier conversations")}</h2><MessageSquareText size={18}/></header>
    <div className={styles.section}>
      {!targets.length ? <div className={styles.empty}><Building2 size={24}/><strong>{t("No hay un plan comercial publicado", "No published commercial plan")}</strong>
        <p>{t("La evaluación de cobertura no crea una oportunidad ni una cotización. Los planes persistidos aparecerán aquí para solicitar una oferta.", "A coverage check does not create an opportunity or a quote. Persisted plans appear here so you can request an offer.")}</p></div> : null}
      {targets.map(target => { const channels = commonResponseChannels(target.serviceIds, target.carrierId, catalog);
        return <article className={comparison.opportunity} key={target.key}>
          <header><div><strong>{carrierLabel(target.carrierId, catalog, t)}</strong><small>{t("Plan", "Plan")} {displayReference(target.plan.id,'PLAN')} · v{target.plan.version} · {t("Solicitud", "Request")} v{target.plan.data.requestVersion}</small></div>
            <span className={styles.status} data-tone={target.current ? "positive" : "pending"}>{target.plan.data.requestVersion !== context.request.draftVersion ? t("Versión anterior", "Previous request version") : target.plan.data.eligibility === "eligible" ? t("Plan elegible", "Eligible plan") : target.plan.data.eligibility === "unknown" ? t("Elegibilidad desconocida", "Eligibility unknown") : t("Plan no elegible", "Ineligible plan")}</span></header>
          <p>{target.serviceIds.map(id => { const service = catalog.services[id]; return service?.state === "AVAILABLE" ? `${service.mode} · ${service.serviceClass}` : t("Servicio sin datos actuales", "Current service data unavailable"); }).join(" / ")}</p>
          {target.existing.map(row => <div className={comparison.opportunityState} key={row.id}>
            <strong>{opportunityLabel(row.status, t)}</strong><span>{t("Oportunidad", "Opportunity")} {row.id.slice(0, 8)} · v{row.version}</span>
            <span>{t("Responder antes de", "Respond by")}: {formatDateTime(row.data.responseDeadline, localeTag)}</span>
            <span>{context.offers.filter(offer => offer.data.opportunityId === row.id && offer.carrierId === row.carrierId && offer.requestId === row.requestId && offer.organizationId === row.organizationId).length} {t("ofertas registradas", "recorded offers")}</span>
          </div>)}
          {!target.existing.length ? <><p>{!target.current ? t("El plan no es elegible para la versión actual. No se enviará una invitación desde esta vista.", "This plan is not eligible for the current request version. No invitation will be sent from this view.")
            : !channels.length ? t("No se pudo verificar un canal de respuesta común en los servicios. Actualiza los datos antes de invitar.", "A common response channel could not be verified from the services. Refresh before inviting.")
            : t("Solicita una cotización al transportista. Esta acción no crea un precio ni reserva capacidad.", "Request a quote from the Carrier. This action neither creates a price nor reserves capacity.")}</p>
            <Button variant="secondary" disabled={busy || !target.current || !channels.length} onClick={() => onRequest(target.key)}><Send size={15}/>{t("Solicitar oferta", "Request offer")}<ArrowRight size={15}/></Button></> : null}
          {(target.plan.data.exclusionReasons.length > 0 || target.plan.data.pendingRequirements.length > 0) ? <details><summary>{t("Razones y requisitos del plan", "Plan reasons and requirements")}</summary><ul>{[...target.plan.data.exclusionReasons, ...target.plan.data.pendingRequirements].map((reason, index) => <li key={`${reason}-${index}`}>{reason}</li>)}</ul></details> : null}
        </article>;
      })}
    </div>
  </section>;
}
