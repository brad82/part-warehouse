import type { AttributeDef, Part } from "@parts-warehouse/shared";
import type { FieldOption } from "./CanvasContext";

/** Part fields a label can print, in menu order. */
const PART_FIELDS: FieldOption[] = [
  { value: "code", label: "Code" },
  { value: "name", label: "Name" },
  { value: "revision", label: "Revision" },
  { value: "qtyPerBuild", label: "Qty per build" },
  { value: "onHand", label: "On hand" },
  { value: "groupId", label: "Group" },
  { value: "part", label: "Part number" },
  { value: "partTypeId", label: "Part type" },
  { value: "status", label: "Status" },
  { value: "notes", label: "Notes" },
];

export function fieldOptions(defs: AttributeDef[]): FieldOption[] {
  const attributes = [...defs]
    .sort((a, b) => a.sort - b.sort)
    .map((d) => ({ value: d.key, label: d.label }));
  return [...PART_FIELDS, ...attributes];
}

const token = (key: string | symbol) =>
  typeof key === "string" ? `{${key}}` : undefined;

/**
 * A stand-in part whose every field reads as its own `{field}` token, so the
 * canvas can show a template's placeholders instead of one part's values.
 */
export const FIELD_NAMES_PART = new Proxy(
  { attributes: new Proxy({}, { get: (_t, key) => token(key) }) },
  {
    has: () => true,
    get: (target, key) =>
      key === "attributes" ? target.attributes : token(key),
  },
) as unknown as Part;
