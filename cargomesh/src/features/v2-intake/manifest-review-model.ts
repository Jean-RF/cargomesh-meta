import type { FreightRequestV2Data } from './contracts';
import type { ConfirmedManifest, PrepareManifest, ManifestPreparation } from '@/shared/schemas/meta/manifest-commands';
import { ManifestGroupSelectionSchema } from '@/shared/schemas/meta/manifest-commands';

/** Positional bindings can be restored only for the exact same persisted snapshot. */
export function restoredManifestGroups(request: FreightRequestV2Data, manifest: ConfirmedManifest | null): Record<number, string> {
  if (!manifest || manifest.declaration.source.requestId !== request.id || manifest.declaration.source.organizationId !== request.organizationId
    || manifest.declaration.source.requestDraftVersion !== request.draftVersion) return {};
  return Object.fromEntries(manifest.declaration.groupBindings.map(binding => [binding.sourceUnitIndex, binding.groupId]));
}
export function manifestPreparationInput(request: FreightRequestV2Data, baseline: ConfirmedManifest | null,
  choices: Record<number, string>): PrepareManifest {
  if (!baseline) return {expectedDraftVersion: request.draftVersion, expectedManifestRevision: 0};
  if (baseline.declaration.source.requestId !== request.id || baseline.declaration.source.organizationId !== request.organizationId)
    throw Error('MANIFEST_SCOPE_MISMATCH');
  const retained = new Set(baseline.declaration.groupBindings.map(binding => binding.groupId));
  const groups = request.cargoSpecification.units.map((_, sourceUnitIndex) => {
    const choice = choices[sourceUnitIndex];
    if (!choice || (choice !== 'new' && !retained.has(choice))) throw Error('GROUP_MAPPING_REQUIRED');
    return {sourceUnitIndex, groupId: choice === 'new' ? null : choice};
  });
  return {expectedDraftVersion: request.draftVersion, expectedManifestRevision: baseline.revision,
    groups: ManifestGroupSelectionSchema.parse(groups)};
}
export function reviewStillCurrent(preparation: ManifestPreparation | null, request: FreightRequestV2Data,
  dirty: boolean, reviewedFingerprint: string | null, currentFingerprint: string, now = Date.now()) {
  return !!preparation && !dirty && reviewedFingerprint === currentFingerprint
    && preparation.candidate.source.requestId === request.id && preparation.candidate.source.organizationId === request.organizationId
    && preparation.candidate.source.requestDraftVersion === request.draftVersion && Date.parse(preparation.expiresAt) > now;
}
