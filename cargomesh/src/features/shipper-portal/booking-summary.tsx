import { ArrowRight, Box, CalendarDays, Check, CircleAlert, X } from "lucide-react";
import { localeTag, translate, type Locale } from "@/features/i18n/config";
import { displayDemoText } from "@/shared/lib/demo-presentation";
import { displayReference } from "@/shared/lib/display-identity";
import { bookingStatusPresentation, formatDateTime, type WorkflowRecordV2 } from "./shipper-model";
import { OperationRequestLink } from "./operations-navigation";
import s from "./booking-list.module.css";

type Booking = Extract<WorkflowRecordV2, { kind: "bookings" }>;
type Offer = Extract<WorkflowRecordV2, { kind: "offers" }>;

/** A visual milestone follows persisted confirmation, never offer expiry or elapsed time. */
export function BookingSummary({ booking, offer, reference, carrier, locale, resourceState }: {
  booking: Booking; offer: Offer | null; reference: string; carrier: string; locale: Locale;
  resourceState: { complete: boolean; confirmedCapacity: number; executions: number };
}) {
  const t = (es: string, en: string) => translate(locale, es, en), tag = localeTag(locale);
  const status = booking.data.carrierConfirmationStatus, presentation = bookingStatusPresentation(status, locale);
  const revoked = booking.data.authorizationStatus === "REVOKED";
  const confirmed = status === "CONFIRMED" && !revoked;
  const closed = status === "REJECTED" || status === "CANCELLED" || revoked;
  const tone = revoked ? "danger" : presentation.tone;
  const compactTime = (value: string | null) => value ? new Intl.DateTimeFormat(tag, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Lima",
  }).format(new Date(value)) : t("Sin registro", "Not recorded");
  return <article className={s.card} data-tone={tone}>
      <header className={s.identity}>
        <div className={s.identityCopy}>
        <span className={s.status} data-tone={tone}>{revoked ? t("Autorización revocada", "Authorization revoked") : presentation.label}</span>
        <h2>{displayDemoText(carrier)}</h2>
        <p>{displayReference(reference, "BKG", booking.id)}<span> · {t("Versión", "Version")} {booking.version}</span></p>
        </div>
        <img className={s.truckArt} src="/carrier-kpis/fleet-truck.svg" width={170} height={130} alt="" aria-hidden="true"/>
      </header>
      <ol className={s.timeline} aria-label={t("Progreso de la reserva", "Booking progress")}>
        <li data-state="done"><span className={s.node}><Check size={13} aria-hidden="true"/></span><strong>{t("Autorizada", "Authorized")}</strong>
          <time dateTime={booking.data.authorizedAt} title={formatDateTime(booking.data.authorizedAt, tag)}>{compactTime(booking.data.authorizedAt)}</time></li>
        <li data-state={confirmed ? "done" : closed ? "closed" : "current"} aria-current={!closed && !confirmed ? "step" : undefined}>
          <span className={s.node}>{confirmed ? <Check size={13} aria-hidden="true"/> : closed ? <X size={12} aria-hidden="true"/> : <i/>}</span>
          <strong>{t("Respuesta del carrier", "Carrier response")}</strong>
          {status === "CONFIRMED" ? <time dateTime={booking.data.confirmedAt ?? undefined} title={formatDateTime(booking.data.confirmedAt, tag)}>{compactTime(booking.data.confirmedAt)}</time>
            : <small>{revoked ? t("Autorización revocada", "Authorization revoked") : closed ? presentation.label : t("Esperando respuesta", "Awaiting response")}</small>}
        </li>
        <li data-state={confirmed ? "done" : "upcoming"}><span className={s.node}>{confirmed && <Check size={13} aria-hidden="true"/>}</span>
          <strong>{t("Transporte confirmado", "Transport confirmed")}</strong><small>{confirmed ? t("Por el carrier", "By the carrier") : closed ? t("No confirmado", "Not confirmed") : t("Aún no", "Not yet")}</small></li>
      </ol>
      <div className={s.price}><span>{t("Oferta vinculada", "Linked offer")}</span>
        <strong>{offer ? `${offer.data.price.currency} ${offer.data.price.amount.toLocaleString(tag, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : t("Detalle no disponible", "Detail unavailable")}</strong>
        {offer && <small title={formatDateTime(offer.data.validity.endsAt, tag)}>{t("Vigencia original", "Original validity")}: <time dateTime={offer.data.validity.endsAt}>{compactTime(offer.data.validity.endsAt)}</time></small>}
      {booking.requestId && <OperationRequestLink requestId={booking.requestId} className={s.action}>
        {t("Revisar reserva", "Review booking")}<ArrowRight size={17} aria-hidden="true"/>
      </OperationRequestLink>}
      </div>
    {closed && <div className={s.resources}><p className={s.notice} data-tone={tone}><CircleAlert size={14} aria-hidden="true"/>{revoked ? t("La autorización fue revocada; no es transporte confirmado.", "Authorization revoked; not confirmed transport.") : presentation.consequence}</p></div>}
    <footer className={s.footer}>
      <span><Box size={17} aria-hidden="true"/>{!resourceState.complete ? t("Lectura de capacidad incompleta", "Capacity read incomplete") : resourceState.confirmedCapacity
        ? t(`${resourceState.confirmedCapacity} registros de capacidad confirmada`, `${resourceState.confirmedCapacity} confirmed capacity records`)
        : t("Sin capacidad confirmada aún", "No capacity confirmed yet")}</span>
      <span><CalendarDays size={17} aria-hidden="true"/>{!resourceState.complete ? t("Lectura de operaciones incompleta", "Operation read incomplete") : resourceState.executions
        ? t(`${resourceState.executions} operaciones vinculadas`, `${resourceState.executions} linked operations`)
        : t("Sin operación vinculada aún", "No linked execution yet")}</span>
    </footer>
  </article>;
}
