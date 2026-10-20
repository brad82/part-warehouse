import type { AttributeDef } from "@parts-warehouse/shared";

/** Field label with its unit, e.g. "Print time (min)", "Price (CAD)". */
export function attributeLabel(def: Pick<AttributeDef, "label" | "unit">): string {
  return def.unit ? `${def.label} (${def.unit})` : def.label;
}

/** The definitions a part of this type shows, in display order. */
export function defsForType(defs: AttributeDef[], partTypeId: string): AttributeDef[] {
  return defs
    .filter((d) => d.partTypeIds.includes(partTypeId))
    .sort((a, b) => a.sort - b.sort);
}
