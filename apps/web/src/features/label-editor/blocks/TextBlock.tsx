import { InspectorControls } from "@wordpress/block-editor";
import { PanelBody, SelectControl, TextControl } from "@wordpress/components";
import type { LabelFont, LabelTextElement } from "@parts-warehouse/shared";
import { Type } from "lucide-react";
import { LABEL_BLOCK } from "../model/convert";
import { FieldSelect } from "./controls/FieldSelect";
import { MmControl } from "./controls/MmControl";
import { PositionPanel } from "./controls/PositionPanel";
import { ElementFrame } from "./ElementFrame";
import { num, str } from "./utils/blockAttributes";
import type { EditProps } from "./utils/editProps";
import { registerLabelBlock } from "./utils/registerLabelBlock";

const FONTS: { value: LabelFont; label: string }[] = [
  { value: "sans", label: "Sans" },
  { value: "sans-bold", label: "Sans bold" },
  { value: "mono-bold", label: "Mono bold" },
];

function TextEdit({ attributes, setAttributes }: EditProps<LabelTextElement>) {
  return (
    <>
      <InspectorControls>
        <PanelBody title="Text">
          <TextControl
            __next40pxDefaultSize
            __nextHasNoMarginBottom
            label="Content"
            help="{field} prints the part's value, e.g. Qty {qtyPerBuild}"
            value={attributes.text}
            onChange={(text) => setAttributes({ text })}
          />
          <FieldSelect
            label="Insert field"
            value=""
            placeholder="Choose a field…"
            onChange={(field) =>
              field && setAttributes({ text: `${attributes.text}{${field}}` })
            }
          />
        </PanelBody>
        <PanelBody title="Type">
          <SelectControl
            __next40pxDefaultSize
            __nextHasNoMarginBottom
            label="Font"
            value={attributes.font}
            options={FONTS}
            onChange={(font) => setAttributes({ font: font as LabelFont })}
          />
          <div className="label-inspector__grid">
            <MmControl
              label="Size (pt)"
              step={0.5}
              min={1}
              value={attributes.fontSizePt}
              onChange={(fontSizePt) => setAttributes({ fontSizePt })}
            />
            <MmControl
              label="Line height (mm)"
              min={0.1}
              value={attributes.lineHeight}
              onChange={(lineHeight) => setAttributes({ lineHeight })}
            />
            <MmControl
              label="Max lines"
              step={1}
              min={1}
              value={attributes.maxLines}
              onChange={(n) =>
                setAttributes({ maxLines: Math.max(1, Math.round(n)) })
              }
            />
          </div>
        </PanelBody>
        <PositionPanel
          attributes={attributes}
          setAttributes={setAttributes}
          fields={[
            { key: "x", label: "X" },
            { key: "y", label: "Baseline Y" },
            { key: "width", label: "Width" },
          ]}
        />
      </InspectorControls>
      <ElementFrame
        el={{ type: "text", ...attributes }}
        placeholder="Text (empty)"
      />
    </>
  );
}

/** Text with `{field}` placeholders (`LabelTextElement`). */
export function registerTextBlock() {
  registerLabelBlock(LABEL_BLOCK.text, {
    title: "Text",
    description: "Text with {field} placeholders, wrapped to its width.",
    icon: <Type size={20} />,
    __experimentalLabel: (a: Record<string, unknown>) =>
      String(a.text || "Text"),
    attributes: {
      text: str("{name}"),
      x: num(3),
      y: num(6),
      width: num(40),
      font: str("sans"),
      fontSizePt: num(8),
      lineHeight: num(3.4),
      maxLines: num(1),
    },
    edit: TextEdit as never,
  });
}
