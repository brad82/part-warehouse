import type { AttributeDef, AttributeValue, Part } from "./schemas.js";

/** Keys the app reads directly. Seeded as system attributes. */
export const ATTR = {
  colour: "colour",
  material: "material",
  printTimeMin: "print_time_min",
  filamentG: "filament_g",
  fileVersion: "file_version",
  filePath: "file_path",
  sku: "sku",
  supplier: "supplier",
} as const;

export type AttributeParse =
  | { ok: true; value: AttributeValue }
  | { ok: false; error: string };

const NUMERIC = new Set<AttributeDef["dataType"]>(["integer", "number", "currency"]);

export function isNumericAttribute(def: Pick<AttributeDef, "dataType">) {
  return NUMERIC.has(def.dataType);
}

/**
 * Validates and normalises one attribute value against its definition, from
 * a form string or a JSON value. Empty input is the caller's "unset" and is
 * rejected here.
 */
export function parseAttributeValue(
  def: Pick<AttributeDef, "dataType" | "options">,
  raw: AttributeValue,
): AttributeParse {
  const text = String(raw).trim();
  if (text === "") return { ok: false, error: "Required" };

  if (isNumericAttribute(def)) {
    const n = typeof raw === "number" ? raw : Number(text);
    if (!Number.isFinite(n) || n < 0) return { ok: false, error: "Enter a number ≥ 0" };
    if (def.dataType === "integer" && !Number.isInteger(n)) {
      return { ok: false, error: "Enter a whole number" };
    }
    return { ok: true, value: def.dataType === "currency" ? Math.round(n * 100) / 100 : n };
  }

  if (def.dataType === "url") {
    try {
      const url = new URL(text);
      if (url.protocol === "http:" || url.protocol === "https:") return { ok: true, value: text };
    } catch {
      // fall through
    }
    return { ok: false, error: "Enter an http(s) link" };
  }

  if (def.dataType === "select" && !(def.options ?? []).includes(text)) {
    return { ok: false, error: "Pick one of the options" };
  }
  return { ok: true, value: text };
}

export function attrNumber(part: Pick<Part, "attributes">, key: string): number | null {
  const v = part.attributes[key];
  return typeof v === "number" ? v : null;
}

export function attrText(part: Pick<Part, "attributes">, key: string): string | null {
  const v = part.attributes[key];
  return v == null ? null : String(v);
}

/** "Black PETG" style summary for labels and lists. */
export function colourMaterial(part: Pick<Part, "attributes">): string {
  return [attrText(part, ATTR.colour), attrText(part, ATTR.material)]
    .filter(Boolean)
    .join(" ");
}
