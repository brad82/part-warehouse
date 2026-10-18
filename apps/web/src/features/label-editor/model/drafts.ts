import { SMALL_LABEL } from "@snowcat/shared";
import type { CustomLabelTemplate } from "@features/labels";

export type StartingPoint = "blank" | "small";

const newId = () => `custom-${Date.now().toString(36)}`;

/** A fresh, unsaved template to start editing from. */
export function startingTemplate(from: StartingPoint): CustomLabelTemplate {
  if (from === "small")
    return { ...SMALL_LABEL, id: newId(), name: "Small label copy" };
  return {
    id: newId(),
    name: "New label",
    widthMm: 62,
    heightMm: 29,
    elements: [],
  };
}

/** An unsaved copy of `template` under a new id. */
export const copyOf = (template: CustomLabelTemplate): CustomLabelTemplate => ({
  ...template,
  id: newId(),
  name: `${template.name} copy`,
});
