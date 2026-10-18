import { useMemo } from "react";
import {
  ComboboxControl,
  PanelBody,
  TextControl,
  ToggleControl,
} from "@wordpress/components";
import { useDispatch, useSelect } from "@wordpress/data";
import { renderLabelSvg } from "@snowcat/shared";
import { Svg } from "@features/labels";
import { useLabelEditorData, useSamplePart } from "../LabelEditorDataProvider";
import { MmControl } from "../blocks/controls/MmControl";
import { FIELD_NAMES_PART } from "../model/fields";
import { store } from "../store";

/** Size and name of the label. */
function LabelSettings() {
  const meta = useSelect((select) => select(store).getMeta(), []);
  const { setMeta } = useDispatch(store);
  return (
    <PanelBody title="Label">
      <TextControl
        __next40pxDefaultSize
        __nextHasNoMarginBottom
        label="Name"
        value={meta.name}
        onChange={(name) => setMeta({ name })}
      />
      <div className="label-inspector__grid label-inspector__gap">
        <MmControl
          label="Width (mm)"
          min={1}
          value={meta.widthMm}
          onChange={(widthMm) => widthMm > 0 && setMeta({ widthMm })}
        />
        <MmControl
          label="Height (mm)"
          min={1}
          value={meta.heightMm}
          onChange={(heightMm) => heightMm > 0 && setMeta({ heightMm })}
        />
      </div>
    </PanelBody>
  );
}

/** Which part the canvas shows, or its field names. */
function PreviewData() {
  const { parts } = useLabelEditorData();
  const sample = useSelect((select) => select(store).getSample(), []);
  const { selectSamplePart, setShowFields } = useDispatch(store);
  const options = useMemo(
    () => parts.map((p) => ({ value: p.code, label: `${p.code} · ${p.name}` })),
    [parts],
  );
  return (
    <PanelBody title="Preview data">
      <ComboboxControl
        __next40pxDefaultSize
        __nextHasNoMarginBottom
        label="Sample part"
        value={sample.partCode}
        onChange={(code) => code && selectSamplePart(code)}
        options={options}
      />
      <div className="label-inspector__gap">
        <ToggleControl
          __nextHasNoMarginBottom
          label="Show field names"
          help="Display {field} placeholders instead of the sample part's values."
          checked={sample.showFields}
          onChange={setShowFields}
        />
      </div>
    </PanelBody>
  );
}

/** The whole label through renderLabelSvg: exactly what prints. */
function PrintPreview() {
  const { template, render } = useSelect(
    (select) => ({
      template: select(store).getTemplate(),
      render: select(store).getSample().render,
    }),
    [],
  );
  const part = useSamplePart();
  const svg = useMemo(
    () => renderLabelSvg(template, part ?? FIELD_NAMES_PART, { render }),
    [template, part, render],
  );
  return (
    <PanelBody title="Print preview">
      <div className="label-editor__print-preview">
        <Svg
          svg={svg}
          sx={{
            width: `${template.widthMm}mm`,
            height: `${template.heightMm}mm`,
            maxWidth: "100%",
          }}
        />
      </div>
      <p className="label-editor__sidebar-hint">
        Exactly what prints, at actual size where it fits.
      </p>
    </PanelBody>
  );
}

/** Template tab: label settings, preview data and the print preview. */
export function TemplatePanel() {
  return (
    <>
      <LabelSettings />
      <PreviewData />
      <PrintPreview />
    </>
  );
}
