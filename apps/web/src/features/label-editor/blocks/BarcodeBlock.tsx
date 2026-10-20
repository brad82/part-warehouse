import { InspectorControls } from "@wordpress/block-editor";
import {
  Notice,
  PanelBody,
  SelectControl,
  ToggleControl,
} from "@wordpress/components";
import {
  barcodeIssue,
  SYMBOLOGIES,
  type LabelBarcodeElement,
  type QrErrorCorrection,
  type Symbology,
} from "@parts-warehouse/shared";
import { ScanBarcode } from "lucide-react";
import { useCanvasEnv } from "../model/CanvasContext";
import { LABEL_BLOCK } from "../model/convert";
import { FieldSelect } from "./controls/FieldSelect";
import { PositionPanel } from "./controls/PositionPanel";
import { ElementFrame } from "./ElementFrame";
import { bool, num, str } from "./utils/blockAttributes";
import type { EditProps } from "./utils/editProps";
import { registerLabelBlock } from "./utils/registerLabelBlock";

const BY_KIND = (kind: "1d" | "2d") =>
  (Object.keys(SYMBOLOGIES) as Symbology[]).filter(
    (s) => SYMBOLOGIES[s].kind === kind,
  );

const EC_LEVELS: { value: QrErrorCorrection; label: string }[] = [
  { value: "L", label: "Low (7%)" },
  { value: "M", label: "Medium (15%)" },
  { value: "Q", label: "Quartile (25%)" },
  { value: "H", label: "High (30%)" },
];

const aspect = (s: Symbology) =>
  SYMBOLOGIES[s].size.width / SYMBOLOGIES[s].size.height;

function BarcodeEdit({
  attributes,
  setAttributes,
}: EditProps<LabelBarcodeElement>) {
  const { part } = useCanvasEnv();
  const el: LabelBarcodeElement = { type: "barcode", ...attributes };
  const { symbology } = attributes;
  const info = SYMBOLOGIES[symbology];
  const issue = barcodeIssue(el, part);

  // Keep the box when the new format has the same shape; otherwise start
  // from its default size (a QR in a 40×10 box would be tiny).
  const changeSymbology = (next: Symbology) =>
    setAttributes(
      aspect(next) === aspect(symbology)
        ? { symbology: next }
        : { symbology: next, ...SYMBOLOGIES[next].size },
    );

  return (
    <>
      <InspectorControls>
        <PanelBody title="Barcode">
          <SelectControl
            __next40pxDefaultSize
            __nextHasNoMarginBottom
            label="Format"
            value={symbology}
            onChange={(next) => changeSymbology(next as Symbology)}
            help={info.accepts}
          >
            <optgroup label="1D (linear)">
              {BY_KIND("1d").map((s) => (
                <option key={s} value={s}>
                  {SYMBOLOGIES[s].label}
                </option>
              ))}
            </optgroup>
            <optgroup label="2D">
              {BY_KIND("2d").map((s) => (
                <option key={s} value={s}>
                  {SYMBOLOGIES[s].label}
                </option>
              ))}
            </optgroup>
          </SelectControl>
          <div className="label-inspector__gap">
            <FieldSelect
              label="Encodes"
              value={attributes.field}
              onChange={(field) => setAttributes({ field })}
            />
          </div>
          {issue ? (
            <div className="label-inspector__gap">
              <Notice status="warning" isDismissible={false}>
                {issue}. Nothing prints for this part.
              </Notice>
            </div>
          ) : null}
        </PanelBody>
        <BarcodeOptions attributes={attributes} setAttributes={setAttributes} />
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
      <ElementFrame el={el} placeholder={issue ?? info.label} />
    </>
  );
}

/** Settings that only some formats have; nothing for the rest. */
function BarcodeOptions({
  attributes,
  setAttributes,
}: EditProps<LabelBarcodeElement>) {
  const { symbology } = attributes;
  const toggle = (
    key: "showText" | "rectangular" | "checkDigit",
    label: string,
    help: string,
  ) => (
    <ToggleControl
      __nextHasNoMarginBottom
      label={label}
      help={help}
      checked={!!attributes[key]}
      onChange={(on) => setAttributes({ [key]: on })}
    />
  );

  const options = [
    SYMBOLOGIES[symbology].kind === "1d" &&
      toggle(
        "showText",
        "Show value below",
        "Prints the value under the bars, inside the box.",
      ),
    symbology === "code39" &&
      toggle(
        "checkDigit",
        "Check digit",
        "Adds a mod-43 check character some scanners require.",
      ),
    symbology === "datamatrix" &&
      toggle(
        "rectangular",
        "Rectangular",
        "A wide, short variant for narrow strips.",
      ),
    symbology === "qrcode" && (
      <SelectControl
        __next40pxDefaultSize
        __nextHasNoMarginBottom
        label="Error correction"
        help="Higher survives more damage but needs a bigger code."
        value={attributes.ecLevel ?? "M"}
        options={EC_LEVELS}
        onChange={(ecLevel) =>
          setAttributes({ ecLevel: ecLevel as QrErrorCorrection })
        }
      />
    ),
  ].filter(Boolean);

  if (!options.length) return null;
  return (
    <PanelBody title="Options">
      {options.map((option, i) => (
        <div key={i} className={i ? "label-inspector__gap" : undefined}>
          {option}
        </div>
      ))}
    </PanelBody>
  );
}

/** A barcode of a part field in any supported format (`LabelBarcodeElement`). */
export function registerBarcodeBlock() {
  registerLabelBlock(LABEL_BLOCK.barcode, {
    title: "Barcode",
    description: "A 1D or 2D barcode of a part field, usually the code.",
    icon: <ScanBarcode size={20} />,
    __experimentalLabel: (a: Record<string, unknown>) =>
      `${SYMBOLOGIES[a.symbology as Symbology]?.label ?? "Barcode"} · {${a.field}}`,
    attributes: {
      symbology: str("qrcode"),
      field: str("code"),
      x: num(3),
      y: num(3),
      width: num(18),
      height: num(18),
      showText: bool(false),
      ecLevel: str("M"),
      rectangular: bool(false),
      checkDigit: bool(false),
    },
    edit: BarcodeEdit as never,
  });
}
