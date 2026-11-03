import { z } from "zod";
import { DispatchPreferencesSchema, validateDispatchEnvelope } from "@/shared/schemas/v2/dispatch";
import {
  CanonicalLocationV2Schema,
  CargoSpecificationV2Schema,
  TimeWindowV2Schema,
} from "@/shared/schemas/v2/freight-request";

/** Server-assigned group identity; sourceUnitIndex is local to this snapshot. */
export const ManifestGroupBindingSchema = z.object({
  groupId: z.string().uuid(),
  sourceUnitIndex: z.number().int().nonnegative(),
}).strict();

export const ManifestGroupBindingsSchema = z.array(ManifestGroupBindingSchema).min(1)
  .superRefine((groups, context) => {
    if (new Set(groups.map(group => group.groupId)).size !== groups.length) {
      context.addIssue({ code: "custom", message: "Manifest group identities must be unique." });
    }
    if (new Set(groups.map(group => group.sourceUnitIndex)).size !== groups.length) {
      context.addIssue({ code: "custom", message: "Each cargo unit must have exactly one group identity." });
    }
  });

/**
 * CR-00 review candidate, not a persisted or human-confirmed manifest.
 * Reuses request vocabulary; model proposals and inputRevision do not belong here.
 */
export const DeclaredManifestCandidateSchema = z.object({
  schemaVersion: z.literal("0.1"),
  kind: z.literal("DECLARATION_CANDIDATE"),
  source: z.object({
    requestId: z.string().uuid(),
    organizationId: z.string().uuid(),
    requestDraftVersion: z.number().int().positive(),
  }).strict(),
  route: z.object({
    origin: CanonicalLocationV2Schema,
    destination: CanonicalLocationV2Schema,
    pickupWindow: TimeWindowV2Schema,
    deliveryWindow: TimeWindowV2Schema,
    planningPreferences: DispatchPreferencesSchema.optional(),
  }).strict().superRefine(validateDispatchEnvelope),
  cargoSpecification: CargoSpecificationV2Schema,
  groupBindings: ManifestGroupBindingsSchema,
}).strict().superRefine((candidate, context) => {
  const cargo = candidate.cargoSpecification;
  const bound = new Set(candidate.groupBindings.map(group => group.sourceUnitIndex));
  if (bound.size !== cargo.units.length ||
      cargo.units.some((_, index) => !bound.has(index))) {
    context.addIssue({ code: "custom", path: ["groupBindings"],
      message: "Group bindings must cover all cargo units exactly once." });
  }

  const totals = [cargo.totalWeightKg, cargo.totalVolumeM3];
  const measurements = cargo.units.flatMap(unit => [
    unit.quantity, unit.weightPerUnitKg, unit.volumePerUnitM3,
    unit.dimensionsCm.length, unit.dimensionsCm.width, unit.dimensionsCm.height,
  ]);
  const range = cargo.temperatureRange;
  if (![...totals, ...measurements, ...(range ? [range.minCelsius, range.maxCelsius] : [])]
    .every(Number.isFinite)) {
    context.addIssue({ code: "custom", path: ["cargoSpecification"],
      message: "Manifest quantities and measurements must be finite." });
  }

  if (Date.parse(candidate.route.deliveryWindow.endsAt) <=
      Date.parse(candidate.route.pickupWindow.startsAt)) {
    context.addIssue({ code: "custom", path: ["route", "deliveryWindow"],
      message: "Delivery must end after pickup starts." });
  }
});

export type ManifestGroupBinding = z.infer<typeof ManifestGroupBindingSchema>;
export type DeclaredManifestCandidate = z.infer<typeof DeclaredManifestCandidateSchema>;
