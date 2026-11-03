/** Geometric volume, only from explicit positive per-unit centimetres. */
export function cubicMetersFromCentimeters(
  length: number,
  width: number,
  height: number,
): number | null {
  if (
    ![length, width, height].every(
      (value) => Number.isFinite(value) && value > 0,
    )
  )
    return null;
  const volume = Number(((length * width * height) / 1_000_000).toFixed(6));
  return Number.isFinite(volume) && volume > 0 ? volume : null;
}
