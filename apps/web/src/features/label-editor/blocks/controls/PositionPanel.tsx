import { PanelBody } from "@wordpress/components";
import { MmControl } from "./MmControl";

/** x / y plus whichever size fields the element has, in mm. */
export function PositionPanel({
  attributes,
  setAttributes,
  fields,
}: {
  attributes: Record<string, unknown>;
  setAttributes: (attrs: Record<string, unknown>) => void;
  fields: { key: string; label: string }[];
}) {
  return (
    <PanelBody title="Position (mm)">
      <div className="label-inspector__grid">
        {fields.map((f) => (
          <MmControl
            key={f.key}
            label={f.label}
            value={attributes[f.key] as number}
            min={f.key === "x" || f.key === "y" ? undefined : 0.1}
            onChange={(n) => setAttributes({ [f.key]: n })}
          />
        ))}
      </div>
    </PanelBody>
  );
}
