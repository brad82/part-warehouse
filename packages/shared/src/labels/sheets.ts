import type { LabelSheet } from "./types.js";

/** Avery 5160 (and 8160, 5260…): US Letter, 3×10 of 2⅝×1in. */
export const AVERY_5160: LabelSheet = {
  id: "avery-5160",
  pageWidthMm: 215.9,
  pageHeightMm: 279.4,
  columns: 3,
  rows: 10,
  leftMm: 4.7625,
  topMm: 12.7,
  columnPitchMm: 69.85,
  rowPitchMm: 25.4,
};

/** Slots per sheet. */
export function sheetCapacity(sheet: LabelSheet): number {
  return sheet.columns * sheet.rows;
}

/**
 * Where slot `n` (1-based, left→right then top→bottom, continuing onto
 * later pages) sits: 0-based page and the label's top-left corner in mm.
 */
export function slotPosition(sheet: LabelSheet, n: number) {
  const i = n - 1;
  const perPage = sheetCapacity(sheet);
  const onPage = i % perPage;
  return {
    page: Math.floor(i / perPage),
    xMm: sheet.leftMm + (onPage % sheet.columns) * sheet.columnPitchMm,
    yMm: sheet.topMm + Math.floor(onPage / sheet.columns) * sheet.rowPitchMm,
  };
}
