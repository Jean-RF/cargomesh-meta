import { displayDemoText } from "@/shared/lib/demo-presentation";
import type { FreightRequestV2Data } from "@/features/v2-intake/contracts";
import { localeTag, type Locale } from "@/features/i18n/config";
import { displayReference, locationDisplayLabel } from "@/shared/lib/display-identity";
import { formatMass, requestStatusLabel, requestStatusTone } from "./shipper-model";

export type DashboardActivityItem = {
  id: string; reference: string; fullReference: string; date: string; time: string; updatedAt: string; destination: string; route: string;
  facilities: string; cargo: string; description: string;
  status: FreightRequestV2Data["status"]; statusLabel: string; tone: string;
};

/** Presentation of authorized records only; never reuse their quote, capacity or dates. */
export function dashboardRequests(requests: FreightRequestV2Data[], locale: Locale) {
  const tag = localeTag(locale);
  const dateFormat = new Intl.DateTimeFormat(tag, { dateStyle: "medium", timeZone: "UTC" });
  const timeFormat = new Intl.DateTimeFormat(tag, { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "UTC" });
  const ordered = [...requests].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || a.id.localeCompare(b.id));
  const project = (request: FreightRequestV2Data): DashboardActivityItem => {
    const updated = new Date(request.updatedAt);
    const validDate = !Number.isNaN(updated.getTime());
    return {
    id: request.id, reference: displayReference(request.referenceCode, "PED", request.id), fullReference: request.referenceCode,
    date: validDate ? dateFormat.format(updated) : locale === "es" ? "Desconocida" : "Unknown",
    time: validDate ? timeFormat.format(updated) : "—", updatedAt: validDate ? updated.toISOString() : "",
    destination: locationDisplayLabel(request.destination.city), route: `${locationDisplayLabel(request.origin.city)} → ${locationDisplayLabel(request.destination.city)}`,
    facilities: `${locationDisplayLabel(request.origin.label)} → ${locationDisplayLabel(request.destination.label)}`,
    cargo: `${formatMass(request.cargoSpecification.totalWeightKg, tag)} · ${request.cargoSpecification.totalVolumeM3.toLocaleString(tag)} m³`,
    description: displayDemoText(request.cargoSpecification.description), status: request.status,
    statusLabel: requestStatusLabel(request.status, locale), tone: requestStatusTone(request.status),
    };
  };
  const draft = ordered.find(request => request.status === "DRAFT");
  return { recent: ordered.slice(0, 6).map(project), draft: draft ? project(draft) : null };
}
