import { InspectorControls } from "@wordpress/block-editor";
import { PanelBody, ToggleControl } from "@wordpress/components";
import type { LabelImageElement } from "@parts-warehouse/shared";
import { Box } from "lucide-react";
import { LABEL_BLOCK } from "../model/convert";
import { MmControl } from "./controls/MmControl";
import { PositionPanel } from "./controls/PositionPanel";
import { ElementFrame } from "./ElementFrame";
import { num, str } from "./utils/blockAttributes";
import type { EditProps } from "./utils/editProps";
import { registerLabelBlock } from "./utils/registerLabelBlock";

/** Line width (mm) an outline starts at when switched on. */
const DEFAULT_OUTLINE = 0.3;

function PartRenderingEdit({
  attributes,
  setAttributes,
}: EditProps<LabelImageElement>) {
  const outline = attributes.outlineWidth ?? 0;
  return (
    <>
      <InspectorControls>
        <PanelBody title="Outline">
          <ToggleControl
            __nextHasNoMarginBottom
            label="Outline"
            help="Draws a black frame just inside the box."
            checked={outline > 0}
            onChange={(on) =>
              setAttributes({ outlineWidth: on ? DEFAULT_OUTLINE : 0 })
            }
          />
          {outline > 0 ? (
            <div className="label-inspector__gap">
              <MmControl
                label="Line width (mm)"
                step={0.1}
                min={0.1}
                value={outline}
                onChange={(n) =>
                  setAttributes({ outlineWidth: Math.max(0.1, n) })
                }
              />
            </div>
          ) : null}
        </PanelBody>
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
        placeholder="Part render"
      />
    </>
  );
}

/** The part's 3D render (or image, without an STL), fitted into its box (`LabelImageElement`). */
export function registerPartRenderingBlock() {
  registerLabelBlock(LABEL_BLOCK.image, {
    title: "Part render",
    description: "The part's 3D render, or its image if it has no STL, fitted into its box.",
    icon: <Box size={20} />,
    attributes: {
      source: str("render"),
      x: num(3),
      y: num(3),
      width: num(30),
      height: num(30),
      outlineWidth: num(0),
    },
    edit: PartRenderingEdit as never,
  });
}
