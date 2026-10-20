import type { AttributeDataType } from "@parts-warehouse/shared";

export const DATA_TYPE_LABELS: Record<AttributeDataType, string> = {
  text: "Text",
  integer: "Whole number",
  number: "Number",
  currency: "Money",
  url: "Link",
  select: "List",
};
