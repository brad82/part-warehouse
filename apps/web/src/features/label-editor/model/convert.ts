import { tidyBarcode, type LabelElement } from "@snowcat/shared";

/** Block names, one per label element type. */
export const LABEL_BLOCK = {
  barcode: "snowcat/label-barcode",
  text: "snowcat/label-text",
  image: "snowcat/label-render",
} as const;

export type LabelBlockName = (typeof LABEL_BLOCK)[LabelElement["type"]];

/** The part of a Gutenberg block the converters read. */
export type BlockLike = { name: string; attributes: Record<string, unknown> };

const TYPE_BY_NAME = Object.fromEntries(
  Object.entries(LABEL_BLOCK).map(([type, name]) => [name, type]),
) as Record<string, LabelElement["type"]>;

/**
 * Block attributes are the element's fields minus `type` (implied by the
 * block name), so a template round-trips through the editor unchanged.
 */
export function elementToBlock(el: LabelElement): {
  name: LabelBlockName;
  attributes: Record<string, unknown>;
} {
  const { type, ...attributes } = el;
  return { name: LABEL_BLOCK[type], attributes };
}

/**
 * Null for blocks that aren't label elements. Barcodes drop the options
 * their format doesn't use (blocks carry every option's default).
 */
export function blockToElement(block: BlockLike): LabelElement | null {
  const type = TYPE_BY_NAME[block.name];
  if (!type) return null;
  const el = { type, ...block.attributes } as LabelElement;
  return el.type === "barcode" ? tidyBarcode(el) : el;
}

/**
 * Blocks run front to back, like a layers panel: the first block is on top.
 * Templates run the other way (later elements draw over earlier ones), so
 * the order flips at each conversion.
 */
export function blocksToElements(blocks: BlockLike[]): LabelElement[] {
  return blocks
    .map(blockToElement)
    .filter((el): el is LabelElement => el !== null)
    .reverse();
}

/** Template elements in block order (front to back). */
export function elementsToBlocks(elements: LabelElement[]) {
  return elements.map(elementToBlock).reverse();
}
