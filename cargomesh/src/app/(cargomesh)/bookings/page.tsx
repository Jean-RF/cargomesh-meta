import { getRequestLocale } from "@/server/i18n/server";
import { translate } from "@/features/i18n/config";
import { operationsReader, readOperationsBookingResources } from "@/server/services/v2-workspace/operations-server";
import { carrierLabel } from "@/features/shipper-portal/commercial-catalog";
import { operationsReadIssues } from "@/server/services/v2-workspace/operations-collection";
import { OperationsNavigation, OperationsReadNotice } from "@/features/shipper-portal/operations-navigation";
import { BookingList, type BookingListItem } from "@/features/shipper-portal/booking-list";
import { BookingSummary } from "@/features/shipper-portal/booking-summary";
import { bookingResources } from "@/features/shipper-portal/booking-resources-model";
import { resolveBookingOffer } from "@/features/shipper-portal/commercial-view";
import { displayReference } from "@/shared/lib/display-identity";
import { displayDemoText } from "@/shared/lib/demo-presentation";
import styles from "@/features/shipper-portal/request-list.module.css";

export const dynamic = "force-dynamic";
export default async function BookingsPage() {
  const reader = await operationsReader();
  const [records, requests, offerRecords, decisionRecords, locale] = await Promise.all([reader.workflow("bookings"), reader.requests(), reader.workflow("offers"), reader.workflow("decisions"), getRequestLocale()]);
  const bookings = records.data.filter((item) => item.kind === "bookings");
  const offers = offerRecords.data.filter((item) => item.kind === "offers");
  const decisions = decisionRecords.data.filter((item) => item.kind === "decisions");
  const [resources, catalog] = await Promise.all([readOperationsBookingResources(bookings, reader), reader.commercialCatalog({ offers })]);
  const requestById = new Map(requests.data.map((request) => [request.id, request]));
  const t = (es: string, en: string) => translate(locale, es, en);
  const items = bookings.map<BookingListItem>(booking => {
    const request = booking.requestId ? requestById.get(booking.requestId) : undefined;
    const offer = offerRecords.complete && decisionRecords.complete ? resolveBookingOffer(booking, decisions, offers) : null;
    const carrier = carrierLabel(booking.carrierId, catalog, t), reference = displayReference(null, "BKG", booking.id);
    const status = booking.data.carrierConfirmationStatus;
    const linked = bookingResources(booking, resources.data, records.complete && resources.complete);
    return {
      id: booking.id,
      group: booking.data.authorizationStatus === "REVOKED" || status === "REJECTED" || status === "CANCELLED" ? "CLOSED" : status,
      searchText: [reference, booking.id, carrier, displayDemoText(carrier), booking.data.carrierReference,
        request?.referenceCode, request ? displayReference(request.referenceCode, "PED", request.id) : null,
        request?.origin.city, request?.destination.city].filter(Boolean).join(" "),
      card: <BookingSummary booking={booking} offer={offer} reference={reference} carrier={carrier} locale={locale}
        resourceState={{ complete: linked.complete, confirmedCapacity: linked.holds.filter(hold => hold.status === "CONFIRMED" && hold.data.active).length, executions: linked.executions.length }}/>,
    };
  });
  return <div className={styles.page}>
    <header className={styles.topbar}><OperationsNavigation compact loadedRequestsCount={requests.data.length} loadedBookingsCount={bookings.length}/></header>
    <OperationsReadNotice issues={operationsReadIssues({ bookings: records, requests, offers: offerRecords, decisions: decisionRecords })}/>
    <BookingList items={items} failed={Boolean(records.error)}/>
  </div>;
}
