/** CSS pixels per millimetre at 100% (actual size). */
export const PX_PER_MM = 96 / 25.4;

const MIN_SCALE = 1;
const MAX_SCALE = 30;
const STEP = 1.25;
/** Room left around a fitted label (px, both sides together). */
const FIT_MARGIN = 120;

const clamp = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

/** Largest px/mm at which a `wMm`×`hMm` label fits an area of `w`×`h` px. */
export function fitScale(
  w: number,
  h: number,
  wMm: number,
  hMm: number,
): number {
  if (w <= 0 || h <= 0) return 6;
  return clamp(Math.min((w - FIT_MARGIN) / wMm, (h - FIT_MARGIN) / hMm));
}

/** One zoom step in (`direction` 1) or out (-1) from `scale`. */
export const stepZoom = (scale: number, direction: 1 | -1) =>
  clamp(direction > 0 ? scale * STEP : scale / STEP);
