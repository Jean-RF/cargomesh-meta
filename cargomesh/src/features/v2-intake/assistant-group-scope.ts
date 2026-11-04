/** Proposals have no targetGroupId yet. Never infer a target from row order. */
const groupFields = new Set(['packaging', 'unitPackageType', 'unitQuantity', 'unitWeightPerUnitKg',
  'unitVolumePerUnitM3', 'unitLengthCm', 'unitWidthCm', 'unitHeightCm', 'unitIndivisible', 'unitStackable']);
export function needsExplicitCargoGroup(draft: { additionalUnits?: readonly unknown[] }, fields: readonly { field: string }[]) {
  return Boolean(draft.additionalUnits?.length) && fields.some(item => groupFields.has(item.field));
}
export function cargoGroupHelp(es: boolean) {
  return es ? 'Este pedido tiene varios grupos. Cambia cantidades, embalaje y medidas en el grupo correspondiente del formulario; no elegí ni modifiqué uno por ti.' :
    'This request has several cargo groups. Edit quantity, packaging and measurements in the matching form group; I did not choose or change a group for you.';
}
