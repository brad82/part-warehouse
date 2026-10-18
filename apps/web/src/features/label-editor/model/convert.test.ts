import { SMALL_LABEL } from "@snowcat/shared";
import {
  blockToElement,
  blocksToElements,
  elementsToBlocks,
  elementToBlock,
  LABEL_BLOCK,
} from "./convert";

describe("block conversion", () => {
  it("round-trips the small label", () => {
    expect(blocksToElements(elementsToBlocks(SMALL_LABEL.elements))).toEqual(
      SMALL_LABEL.elements,
    );
  });

  it("puts the frontmost element (drawn last) first in block order", () => {
    const blocks = elementsToBlocks(SMALL_LABEL.elements);
    expect(blockToElement(blocks[0])).toEqual(SMALL_LABEL.elements.at(-1));
  });

  it("names blocks by element type and drops `type` from attributes", () => {
    const block = elementToBlock(SMALL_LABEL.elements[0]);
    expect(block.name).toBe(LABEL_BLOCK.barcode);
    expect(block.attributes).not.toHaveProperty("type");
  });

  it("ignores blocks that aren't label elements", () => {
    expect(
      blockToElement({ name: "core/paragraph", attributes: {} }),
    ).toBeNull();
  });
});
