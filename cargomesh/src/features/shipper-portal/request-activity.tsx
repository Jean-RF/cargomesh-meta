"use client";
import { useLocale } from "@/features/i18n/locale-provider";
import { displayReference } from "@/shared/lib/display-identity";
import type { FreightRequestV2Data } from "@/features/v2-intake/contracts";
import { bookingStatusPresentation, formatDateTime, type WorkflowRecordV2 } from "./shipper-model";
import s from "./request-workspace-frame.module.css";

export function RequestActivity({ request, offers, bookings, decisions, carrierName }: {
  request: FreightRequestV2Data; offers: Extract<WorkflowRecordV2,{kind:"offers"}>[];
  decisions: Extract<WorkflowRecordV2,{kind:"decisions"}>[];
  bookings: Extract<WorkflowRecordV2,{kind:"bookings"}>[]; carrierName: (id: string|null) => string;
}) {
  const {t,locale,localeTag}=useLocale();
  const events=[
    {id:"created",at:request.createdAt,label:t("Solicitud creada","Request created")},
    ...(request.draftVersion>1?[{id:"revision",at:request.updatedAt,label:`${t("Última revisión","Last revision")} · v${request.draftVersion}`}]:[]),
    ...offers.map(offer=>({id:offer.id,at:offer.data.issuedAt,label:`${t("Oferta recibida","Offer received")} · ${carrierName(offer.carrierId)}`})),
    ...decisions.map(decision=>({id:decision.id,at:decision.createdAt,label:decision.data.status==="SELECTED"?t("Alternativa seleccionada","Alternative selected"):t("Decisión registrada","Decision recorded")})),
    ...bookings.flatMap(booking=>[{id:booking.id,at:booking.data.authorizedAt,label:`${t("Reserva autorizada","Booking authorized")} · ${displayReference(null,"BKG",booking.id)}`},
      ...(booking.data.confirmedAt?[{id:`${booking.id}-response`,at:booking.data.confirmedAt,label:`${bookingStatusPresentation(booking.data.carrierConfirmationStatus,locale).label} · ${carrierName(booking.carrierId)}`}]:[])]),
  ].sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)||a.id.localeCompare(b.id));
  return <section className={s.compactCard}><h2>{t("Historial","History")}</h2><ul className={s.events}>{events.map(event=><li key={event.id}><strong>{event.label}</strong><time dateTime={event.at}>{formatDateTime(event.at,localeTag)}</time></li>)}</ul></section>;
}
