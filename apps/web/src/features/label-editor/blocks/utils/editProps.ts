import type { LabelElement } from "@snowcat/shared";

/** Props Gutenberg passes a label block's `edit`; attributes are the element minus `type`. */
export type EditProps<T extends LabelElement> = {
  attributes: Omit<T, "type">;
  setAttributes: (attrs: Partial<Omit<T, "type">>) => void;
};
