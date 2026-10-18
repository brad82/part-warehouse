import { InspectorControls } from "@wordpress/block-editor";
import type { LabelImageElement } from "@snowcat/shared";
import { Box } from "lucide-react";
import { LABEL_BLOCK } from "../model/convert";
import { PositionPanel } from "./controls/PositionPanel";
import { ElementFrame } from "./ElementFrame";
import { num, str } from "./utils/blockAttributes";
import type { EditProps } from "./utils/editProps";
import { registerLabelBlock } from "./utils/registerLabelBlock";

function PartRenderingEdit({
  attributes,
  setAttributes,
}: EditProps<LabelImageElement>) {
  return (
    <>
      <InspectorControls>
        <PositionPanel
          attributes={attributes}
          setAttributes={setAttributes}
          fields={[
            { key: "x", label: "X" },
            { key: "y", label: "Y" },
            { key: "width", label: "Width" },
            { key: "height", label: "Height" },
          ]}
        />
      </InspectorControls>
      <ElementFrame
        el={{ type: "image", ...attributes }}
        placeholder="3D render"
      />
    </>
  );
}

/** The part's 3D render, fitted into its box (`LabelImageElement`). */
export function registerPartRenderingBlock() {
  registerLabelBlock(LABEL_BLOCK.image, {
    title: "Part render",
    description: "The part's 3D render, fitted into its box.",
    icon: <Box size={20} />,
    attributes: {
      source: str("render"),
      x: num(3),
      y: num(3),
      width: num(30),
      height: num(30),
    },
    edit: PartRenderingEdit as never,
  });
}
