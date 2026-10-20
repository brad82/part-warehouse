import { ATTR, attrNumber, type Part } from "@parts-warehouse/shared";

/** Per-build totals derived from one-print values. Pure; no formatting. */
export function partTotals(part: Pick<Part, "qtyPerBuild" | "onHand" | "attributes">) {
  const printTimeMin = attrNumber(part, ATTR.printTimeMin);
  const filamentG = attrNumber(part, ATTR.filamentG);
  return {
    remaining: Math.max(part.qtyPerBuild - part.onHand, 0),
    printTimeMin: printTimeMin == null ? null : printTimeMin * part.qtyPerBuild,
    filamentG: filamentG == null ? null : filamentG * part.qtyPerBuild,
  };
}

export function formatMinutes(min: number | null): string {
  if (min == null) return "–";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}
