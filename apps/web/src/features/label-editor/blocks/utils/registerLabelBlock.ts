import {
  getBlockType,
  registerBlockType,
  type BlockConfiguration,
} from "@wordpress/blocks";

type LabelBlockSettings = Omit<
  BlockConfiguration,
  "name" | "category" | "save" | "apiVersion"
>;

/**
 * Registers one label block, once (safe across HMR reloads). Shared by every
 * block: no HTML, reuse or locking, no custom classes, and nothing
 * serialised. Templates save as LabelTemplate JSON, so `save` is empty.
 */
export function registerLabelBlock(name: string, settings: LabelBlockSettings) {
  if (getBlockType(name)) return;
  registerBlockType(name, {
    apiVersion: 3,
    category: "design",
    supports: {
      html: false,
      reusable: false,
      lock: false,
      className: false,
      customClassName: false,
    },
    save: () => null,
    ...settings,
  });
}
