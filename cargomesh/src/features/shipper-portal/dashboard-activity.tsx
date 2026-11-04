"use client";
import { ArrowRight, ClipboardList } from "lucide-react";
import { useLocale } from "@/features/i18n/locale-provider";
import { WorkspaceLink as Link } from "@/features/workspace-mode/workspace-link";
import { OperationRequestLink } from "./operations-navigation";
import type { DashboardActivityItem } from "./client-dashboard-model";
import s from "./client-dashboard.module.css";

export function DashboardActivity({ items, unavailable }: { items: DashboardActivityItem[]; unavailable: boolean }) {
  const { t } = useLocale();
  return <div className={s.activity} role="region" aria-label={t("Resumen de solicitudes", "Shipment summary")} tabIndex={0}>
    {items.length > 0 ? <table className={s.activityTable}>
      <thead><tr><th scope="col">{t("Fecha", "Date")} <span>(UTC)</span></th><th scope="col">{t("Orden", "Order")}</th><th scope="col">{t("Destino", "Destination")}</th><th scope="col">{t("Estado", "Status")}</th><th scope="col">{t("Medidas", "Measurements")}</th></tr></thead>
      <tbody>{items.map(item => <tr key={item.id}>
        <td><time dateTime={item.updatedAt || undefined} title={t("Última actualización", "Last updated")}><span>{item.date}</span><small>{item.time}</small></time></td>
        <td><OperationRequestLink requestId={item.id} className={s.reference}>{item.reference}</OperationRequestLink></td>
        <td>{item.destination}</td>
        <td><span className={s.activityStatus}>{item.statusLabel}</span></td>
        <td className={s.measurements}>{item.cargo}</td>
      </tr>)}</tbody>
    </table> : <div className={s.empty}><ClipboardList size={25} aria-hidden="true"/><strong>{unavailable ? t("No se pudo consultar la actividad", "Activity could not be loaded") : t("Tu primera solicitud empieza aquí", "Your first shipment starts here")}</strong>
        <p>{unavailable ? t("Reintenta la lectura antes de continuar.", "Retry the read before continuing.") : t("Describe tu envío al asistente o utiliza el formulario.", "Describe your shipment to the assistant or use the form.")}</p>
        {!unavailable && <Link className={s.textLink} href="/freight-request/new">{t("Crear solicitud", "Create request")}<ArrowRight size={15} aria-hidden="true"/></Link>}
      </div>}
  </div>;
}
