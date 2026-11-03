import { z } from "zod";
import { FreightRequestV2ResponseSchema } from "@/shared/schemas/v2/freight-request";
import {
  DeclaredManifestCandidateSchema,
  ManifestGroupBindingsSchema,
  type DeclaredManifestCandidate,
} from "@/shared/schemas/meta/declared-manifest";

const PreparationContextSchema = z.object({
  actorOrganizationId: z.string().uuid(),
  expectedRequestDraftVersion: z.number().int().positive(),
  groupBindings: ManifestGroupBindingsSchema,
}).strict();

export class ManifestPreparationError extends Error {
  constructor(public readonly code: "FORBIDDEN_TENANT" | "STALE_DRAFT") {
    super(code === "FORBIDDEN_TENANT"
      ? "The request does not belong to the actor organization."
      : "Reload the request before preparing its declaration.");
    this.name = "ManifestPreparationError";
  }
}

/**
 * Pure mapping only. Caller must authenticate the actor and load an authorized
 * request; this comparison is a domain guard, not an authentication boundary.
 * Group IDs must be allocated/reconciled by the future manifest service.
 * No IDs, confirmation, evidence, database writes or commercial state are invented.
 */
export function prepareDeclaredManifestCandidate(
  rawRequest: unknown,
  trustedContext: z.input<typeof PreparationContextSchema>,
): DeclaredManifestCandidate {
  const context = PreparationContextSchema.parse(trustedContext);
  const request = FreightRequestV2ResponseSchema.shape.data.parse(rawRequest);
  if (request.organizationId !== context.actorOrganizationId) {
    throw new ManifestPreparationError("FORBIDDEN_TENANT");
  }
  if (request.draftVersion !== context.expectedRequestDraftVersion) {
    throw new ManifestPreparationError("STALE_DRAFT");
  }

  return DeclaredManifestCandidateSchema.parse({
    schemaVersion: "0.1",
    kind: "DECLARATION_CANDIDATE",
    source: {
      requestId: request.id,
      organizationId: request.organizationId,
      requestDraftVersion: request.draftVersion,
    },
    route: {
      origin: request.origin,
      destination: request.destination,
      pickupWindow: request.pickupWindow,
      deliveryWindow: request.deliveryWindow,
      ...(request.planningPreferences ? { planningPreferences: request.planningPreferences } : {}),
    },
    cargoSpecification: request.cargoSpecification,
    groupBindings: context.groupBindings,
  });
}
