import type { ModelProposal } from "@/shared/schemas/meta/model-proposal";
import type { ConversationField } from "./conversation-fields";
import type { V2IntakePrototypeDraft } from "./prototype-model";
import { cubicMetersFromCentimeters } from "@/shared/lib/cargo-measurements";
export const mediaFieldNames: Record<string, ConversationField> = {
  cargoDescription: "cargoDescription",
  unitType: "packaging",
  unitQuantity: "unitQuantity",
  unitWeightKg: "unitWeightPerUnitKg",
  unitLengthCm: "unitLengthCm",
  unitWidthCm: "unitWidthCm",
  unitHeightCm: "unitHeightCm",
};
/** Entire current draft, including all groups, gates review. Never treat unchanged render identity as freshness. */
export const mediaDraftFingerprint = (
  draft: V2IntakePrototypeDraft,
  requestId: string | null,
) => JSON.stringify([requestId, draft]);
export function selectedMediaFields(
  proposal: ModelProposal,
  selected: ReadonlySet<string>,
): Array<{ field: ConversationField; value: string }> {
  const fields: Array<{ field: ConversationField; value: string }> =
    proposal.fields.flatMap((item) =>
      mediaFieldNames[item.field] && selected.has(item.field)
        ? [{ field: mediaFieldNames[item.field], value: String(item.value) }]
        : [],
    );
  const dimensions = ["unitLengthCm", "unitWidthCm", "unitHeightCm"].map(
    (axis) => fields.find((field) => field.field === axis)?.value,
  );
  if (dimensions.every((value) => value !== undefined)) {
    const volume = cubicMetersFromCentimeters(
      ...(dimensions.map(Number) as [number, number, number]),
    );
    if (volume !== null)
      fields.push({ field: "unitVolumePerUnitM3", value: String(volume) });
  }
  return fields;
}
