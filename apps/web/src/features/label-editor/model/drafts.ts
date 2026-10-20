import type { LabelTemplate, LabelTemplateInput } from "@parts-warehouse/shared";

/**
 * A template not stored yet: no id until its first save creates it. Drafts
 * come from Blank, Duplicate and Import.
 */
export const draftOf = (input: LabelTemplateInput): LabelTemplate => ({
  ...input,
  id: "",
  builtin: false,
  updatedAt: "",
});

export const isDraft = (template: Pick<LabelTemplate, "id">) =>
  template.id === "";

export const blankDraft = () =>
  draftOf({
    name: "New label",
    description: null,
    widthMm: 62,
    heightMm: 29,
    elements: [],
  });

/** An unsaved copy of `template`, named so it can be saved beside it. */
export const duplicateDraft = (template: LabelTemplate) =>
  draftOf({ ...toInput(template), name: `${template.name} copy` });

/** The parts of a template a client sends (and exports). */
export const toInput = ({
  name,
  description,
  widthMm,
  heightMm,
  elements,
}: LabelTemplateInput): LabelTemplateInput => ({
  name,
  description,
  widthMm,
  heightMm,
  elements,
});
