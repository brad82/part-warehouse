import { registerBarcodeBlock } from "./BarcodeBlock";
import { registerPartRenderingBlock } from "./PartRenderingBlock";
import { registerTextBlock } from "./TextBlock";

/** Registers every label block; each is safe to register again. */
export function registerLabelBlocks() {
  registerBarcodeBlock();
  registerTextBlock();
  registerPartRenderingBlock();
}
