import type { ReactNode } from "react";
import { ArrowRight, Building2, CalendarCheck2, ChevronRight, CircleDotDashed, ClipboardList, FilePenLine, History, LayoutGrid, MapPinned, Package, Plus } from "lucide-react";
import { WorkspaceLink as Link } from "@/features/workspace-mode/workspace-link";
import { ConversationEntry } from "@/features/v2-intake/conversation-entry";
import type { FreightRequestV2Data } from "@/features/v2-intake/contracts";
import { translate, type Locale } from "@/features/i18n/config";
import { locationDisplayLabel } from "@/shared/lib/display-identity";
import { dashboardRequests } from "./client-dashboard-model";
import { RoadRouteMap } from "@/features/v2-road-map/road-candidate-map-view";
import { getMapPresentation } from "@/features/v2-road-map/road-map-model";
import { DashboardActivity } from "./dashboard-activity";
import { OperationRequestLink } from "./operations-navigation";
import s from "./client-dashboard.module.css";

export function ClientDashboard({ requests, complete, unavailable, counts, locale, readNotice }: {
  requests: FreightRequestV2Data[]; complete: boolean; unavailable: boolean;
  counts: { requests: string; active: string; bookings: string; executions: string; facilities: string };
  locale: Locale; readNotice?: ReactNode;
}) {
  const t = (es: string, en: string) => translate(locale, es, en);
  const { recent, draft } = dashboardRequests(requests, locale);
  const recentRequest = requests.find(request => request.id === recent[0]?.id);
  const draftRequest = draft ? requests.find(request => request.id === draft.id) : undefined;
  const moreDrafts = Math.max(0, requests.filter(request => request.status === "DRAFT").length - 1);
  const stages = [
    { label: t("Solicitudes", "Requests"), value: counts.requests, Icon: ClipboardList, href: "/requests" },
    { label: t("Abiertas", "Open"), value: counts.active, Icon: CircleDotDashed, href: "/requests" },
    { label: t("Reservas", "Bookings"), value: counts.bookings, Icon: CalendarCheck2, href: "/bookings" },
    { label: t("Ejecuciones", "Executions"), value: counts.executions, Icon: MapPinned, href: "/tracking" },
  ];
  const quick = [
    { label: t("Sedes", "Facilities"), count: counts.facilities, Icon: Building2, href: "/facilities" },
    { label: t("Reservas", "Bookings"), count: null, Icon: CalendarCheck2, href: "/bookings" },
    { label: t("Seguimiento", "Tracking"), count: null, Icon: MapPinned, href: "/tracking" },
    { label: t("Historial", "History"), count: null, Icon: History, href: "/history" },
  ];
  return <div className={s.dashboard}>{readNotice}<div className={s.grid}>
    <div className={s.primaryColumn}>
      <ConversationEntry/>
      <section className={s.card} aria-labelledby="dashboard-pipeline-title">
        <header className={`${s.panelHeader} ${s.pipelineHeader}`}><div><h2 id="dashboard-pipeline-title">{t("Tus cargas, de la solicitud al seguimiento", "Your shipments, from request to tracking")}</h2></div><Link href="/requests" className={s.textLink}>{t("Ver todo", "View all")}<ArrowRight size={15} aria-hidden="true"/></Link></header>
        <div className={s.stages} data-client-motion-group>{stages.map(({ label, value, Icon, href }) => <Link key={label} href={href} className={s.stage}><span className={s.stageIcon}><Icon size={18} aria-hidden="true"/></span><span><strong>{value}</strong><small>{label}</small></span></Link>)}</div>
        <DashboardActivity items={recent} unavailable={unavailable}/>
      </section>
      {recentRequest ? <section className={`${s.card} ${s.routePreview}`} aria-labelledby="dashboard-route-title">
        <header className={s.panelHeader}><div><h2 id="dashboard-route-title">{t("Ruta de la última solicitud", "Latest request route")}</h2><p>{recent[0].route}</p></div>
          <OperationRequestLink requestId={recentRequest.id} className={s.textLink}>{t("Abrir solicitud", "Open request")}<ArrowRight size={15} aria-hidden="true"/></OperationRequestLink>
        </header>
        <RoadRouteMap presentation={getMapPresentation(recentRequest)} showBasemap />
      </section> : null}
    </div>
    <aside className={s.secondaryColumn} aria-label={t("Herramientas de envío", "Shipment tools")}>
      {draft && <section className={`${s.card} ${s.draftCard}`}><header className={`${s.panelHeader} ${s.sideHeader}`}><FilePenLine size={22} aria-hidden="true"/><div><h2>{t("Continúa tu borrador", "Continue your draft")}</h2><p>{complete ? t("Retoma donde lo dejaste", "Pick up where you left off") : t("Último borrador en los registros cargados", "Latest draft in loaded records")}</p></div><FilePenLine className={s.draftWatermark} size={78} aria-hidden="true"/></header>
        <div className={s.draftContent}>
          <div className={s.draftMeta}><span className={s.draftReference} title={draft.fullReference}>{draft.reference}</span><span className={s.status} data-tone={draft.tone}>{draft.statusLabel}</span></div>
          <strong className={s.draftRoute}>{draft.route}</strong>
          {draftRequest && <div className={s.draftLane}><span>{locationDisplayLabel(draftRequest.origin.city)}</span><span>{locationDisplayLabel(draftRequest.destination.city)}</span></div>}
          <div className={s.draftCargo}><Package size={23} aria-hidden="true"/><div><strong>{draft.cargo}</strong><small>{draft.description}</small></div></div>
          <OperationRequestLink requestId={draft.id} className={s.draftContinue}>{t("Continuar", "Continue")}<ArrowRight size={16} aria-hidden="true"/></OperationRequestLink>
        </div>
        {moreDrafts > 0 && <Link href="/requests?status=DRAFT" className={`${s.textLink} ${s.moreDrafts}`}><Plus size={15} aria-hidden="true"/><span>{moreDrafts} {complete ? t(moreDrafts === 1 ? "borrador más" : "borradores más", moreDrafts === 1 ? "more draft" : "more drafts") : t("borradores más cargados", "more loaded drafts")}</span><ArrowRight size={16} aria-hidden="true"/></Link>}
      </section>}
      <section className={s.card}><header className={`${s.panelHeader} ${s.sideHeader}`}><LayoutGrid size={22} aria-hidden="true"/><div><h2>{t("Accesos rápidos", "Quick access")}</h2><p>{t("Tus herramientas más utilizadas", "Go to the tools you use most")}</p></div></header>
        <div className={s.quickGrid} data-client-motion-group>{quick.map(({ label, count, Icon, href }) => <Link key={href} href={href} className={s.quickCard}><Icon size={22} aria-hidden="true"/><strong>{label}</strong>{count !== null && <span className={s.quickCount}>{count}</span>}<ChevronRight size={17} aria-hidden="true"/></Link>)}</div>
      </section>
    </aside>
  </div></div>;
}
