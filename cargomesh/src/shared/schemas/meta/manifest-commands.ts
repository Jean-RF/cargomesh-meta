import { z } from "zod";
import { DeclaredManifestCandidateSchema } from "./declared-manifest";

const Id = z.string().uuid();
const Revision = z.number().int().positive().max(2147483647);
const Hash = z.string().regex(/^[0-9a-f]{64}$/);
const Instant = z.string().datetime({ offset: true });

/** null means a NEW group; existing UUIDs must come from the latest manifest. */
export const ManifestGroupSelectionSchema = z.array(z.object({
  sourceUnitIndex: z.number().int().nonnegative().max(2147483647),
  groupId: Id.nullable(),
}).strict()).min(1).max(100).superRefine((groups, context) => {
  const retained = groups.flatMap(group => group.groupId ? [group.groupId] : []);
  if (new Set(retained).size !== retained.length ||
      new Set(groups.map(group => group.sourceUnitIndex)).size !== groups.length) {
    context.addIssue({ code: "custom", message: "Duplicate group or source unit index." });
  }
});

export const PrepareManifestSchema = z.object({
  expectedDraftVersion: Revision,
  expectedManifestRevision: z.number().int().nonnegative().max(2147483646),
  // First manifest may omit this. Later preparations require explicit selection.
  groups: ManifestGroupSelectionSchema.optional(),
}).strict();

export const ConfirmManifestSchema = z.object({
  preparationId: Id,
  expectedDraftVersion: Revision,
  expectedManifestRevision: z.number().int().nonnegative().max(2147483646),
  contentHash: Hash,
  confirmed: z.literal(true),
}).strict();

export const ManifestPreparationSchema = z.object({
  id: Id,
  preparedByMemberId: Id,
  expectedManifestRevision: z.number().int().nonnegative(),
  preparedAt: Instant,
  expiresAt: Instant,
  contentHash: Hash,
  candidate: DeclaredManifestCandidateSchema,
}).strict().refine(value => Date.parse(value.expiresAt) > Date.parse(value.preparedAt),
  "Preparation expiration must follow its creation.");

export const ConfirmedManifestSchema = z.object({
  id: Id,
  revision: Revision,
  status: z.literal("CONFIRMED"),
  preparationId: Id,
  confirmedByMemberId: Id,
  confirmedAt: Instant,
  contentHash: Hash,
  // Content is retained exactly as reviewed, with its candidate vocabulary.
  declaration: DeclaredManifestCandidateSchema,
}).strict();

export const ManifestPageSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).max(1000000).default(0),
}).strict();

export type PrepareManifest = z.infer<typeof PrepareManifestSchema>;
export type ConfirmManifest = z.infer<typeof ConfirmManifestSchema>;
export type ManifestPreparation = z.infer<typeof ManifestPreparationSchema>;
export type ConfirmedManifest = z.infer<typeof ConfirmedManifestSchema>;
export type ManifestPage = z.infer<typeof ManifestPageSchema>;
