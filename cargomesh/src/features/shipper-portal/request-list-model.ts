import type { OperationsQuery, OperationRequestStatus } from "./operations-query";

/** Presentation groups contain only persisted request states, never inferred progress. */
export const requestGroups: ReadonlyArray<{ key: string; es: string; en: string; statuses: readonly OperationRequestStatus[] }> = [
  { key: "ALL", es: "Todas", en: "All", statuses: [] },
  { key: "ACTION", es: "Requieren acción", en: "Needs action", statuses: ["DRAFT", "AWAITING_SELECTION", "FAILED"] },
  { key: "PROGRESS", es: "En proceso", en: "In progress", statuses: ["PENDING", "ORCHESTRATING", "BOOKING"] },
  { key: "BOOKED", es: "Reservadas", en: "Booked", statuses: ["BOOKED"] },
];

export function selectedRequestStatuses(query: OperationsQuery): readonly OperationRequestStatus[] {
  return query.statuses?.length ? query.statuses : query.status === "ALL" ? [] : [query.status];
}

export function selectedRequestGroup(query: OperationsQuery) {
  const selected = selectedRequestStatuses(query);
  return requestGroups.find(group => group.statuses.length === selected.length && group.statuses.every(status => selected.includes(status)))?.key ?? null;
}

function validDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function requestUtcDate(value: string, locale: string) {
  const date = validDate(value);
  return date ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(date) : "—";
}

export function requestUtcTime(value: string, locale: string) {
  const date = validDate(value);
  return date ? new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "UTC" }).format(date) : "—";
}

export function requestSearchDate(value: string, locale: string) {
  return `${requestUtcDate(value, locale)} ${requestUtcTime(value, locale)} UTC`;
}

export function requestUtcWindow(window: { startsAt: string; endsAt: string }, locale: string) {
  const start = validDate(window.startsAt), end = validDate(window.endsAt);
  if (!start || !end) return { date: "—", time: "—" };
  const sameDay = start.toISOString().slice(0, 10) === end.toISOString().slice(0, 10);
  return {
    date: requestUtcDate(window.startsAt, locale),
    time: `${requestUtcTime(window.startsAt, locale)} – ${sameDay ? "" : requestUtcDate(window.endsAt, locale) + " · "}${requestUtcTime(window.endsAt, locale)}`,
  };
}
