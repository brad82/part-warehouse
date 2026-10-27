import {
  ATTR,
  attrText,
  colourMaterial,
  SYMBOLOGIES,
  type LabelAssets,
  type LabelBarcodeElement,
  type LabelElement,
  type LabelFont,
  type LabelImageElement,
  type LabelLayout,
  type Part,
} from "@parts-warehouse/shared";
import { barcodeSvg } from "./barcodes.js";
import { measureText } from "./metrics.js";
import { wrapText } from "./wrap.js";

/** CSS families whose metrics match `metrics.ts` (Arial ≈ Helvetica). */
export const LABEL_FONT_FAMILY: Record<LabelFont, string> = {
  sans: "Helvetica, Arial, sans-serif",
  "sans-bold": "Helvetica, Arial, sans-serif",
  "mono-bold": "Courier, 'Courier New', monospace",
};

const PT_TO_MM = 25.4 / 72;

/** A part field (`code`, `name`, `qtyPerBuild`…) or attribute value, as text. */
/**
 * Fields worked out from others, usable like any `{field}`. `detail`:
 * bought parts (with a SKU) show the SKU, printed ones colour and material.
 */
export const DERIVED_FIELDS: Record<string, (part: Part) => string> = {
  detail: (part) => attrText(part, ATTR.sku) || colourMaterial(part),
};

/** A part field (`code`, `name`…), derived field or attribute value, as text. */
function fieldValue(part: Part, field: string): string {
  const value =
    field in part
      ? (part as Record<string, unknown>)[field]
      : field in DERIVED_FIELDS
        ? DERIVED_FIELDS[field](part)
        : part.attributes[field];
  return value == null ? "" : String(value);
}

function fill(text: string, part: Part): string {
  return text.replace(/\{(\w+)\}/g, (_m, field: string) =>
    fieldValue(part, field),
  );
}

function escapeXml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Share of a 1D barcode's box given to the value beneath the bars, and its limits (mm). */
const VALUE_STRIP = { share: 0.3, min: 2, max: 4 };

/**
 * Splits a 1D barcode's box into bars and, with `showText`, a strip beneath
 * for the value: centred, and shrunk if needed to fit the box's width.
 */
function linearLayout(el: LabelBarcodeElement, value: string) {
  if (!el.showText) return { barsHeight: el.height, text: null };
  const band = Math.min(
    VALUE_STRIP.max,
    Math.max(VALUE_STRIP.min, el.height * VALUE_STRIP.share),
  );
  const fitPt = (el.width / measureText(value, "mono-bold", 1)) * 0.95;
  const sizePt = Math.min((band * 0.8) / PT_TO_MM, fitPt);
  return {
    barsHeight: +(el.height - band).toFixed(3),
    text: {
      x: +(el.x + el.width / 2).toFixed(3),
      // Baseline a little above the box's bottom edge, leaving descender room.
      y: +(el.y + el.height - band * 0.15).toFixed(3),
      sizeMm: +(sizePt * PT_TO_MM).toFixed(4),
    },
  };
}

function renderBarcode(el: LabelBarcodeElement, part: Part): string {
  const value = fieldValue(part, el.field);
  if (!value) return "";
  let svg: string;
  try {
    svg = barcodeSvg(el, value);
  } catch {
    return "";
  }
  // 1D bars stretch to their box (scaling keeps module widths uniform, which
  // is all a scanner needs); 2D modules must stay square, so those fit.
  const linear = SYMBOLOGIES[el.symbology].kind === "1d";
  const { barsHeight, text } = linear
    ? linearLayout(el, value)
    : { barsHeight: el.height, text: null };
  const placed = svg.replace(
    "<svg ",
    `<svg x="${el.x}" y="${el.y}" width="${el.width}" height="${barsHeight}" ` +
      `preserveAspectRatio="${linear ? "none" : "xMidYMid meet"}" `,
  );
  if (!text) return placed;
  return (
    placed +
    `<text x="${text.x}" y="${text.y}" text-anchor="middle" ` +
    `font-family="${LABEL_FONT_FAMILY["mono-bold"]}" font-weight="bold" ` +
    `font-size="${text.sizeMm}" fill="#000">${escapeXml(value)}</text>`
  );
}

/**
 * Why `el` prints nothing for `part`, for an editor to show; null when it
 * prints.
 */
export function barcodeIssue(
  el: LabelBarcodeElement,
  part: Part,
): string | null {
  const value = fieldValue(part, el.field);
  if (!value) return `No ${el.field} value`;
  try {
    barcodeSvg(el, value);
    return null;
  } catch {
    const { label, accepts } = SYMBOLOGIES[el.symbology];
    return `${label} can't encode "${value}"${accepts ? ` (${accepts.toLowerCase()})` : ""}`;
  }
}

/**
 * A frame drawn over an image, inset by half its line width so it stays
 * inside the box (a line wider than the box is capped to fill it).
 */
function outlineRect(el: LabelImageElement): string {
  const w = Math.min(el.outlineWidth ?? 0, el.width / 2, el.height / 2);
  if (!(w > 0)) return "";
  const r = (n: number) => +n.toFixed(3);
  return (
    `<rect x="${r(el.x + w / 2)}" y="${r(el.y + w / 2)}" ` +
    `width="${r(el.width - w)}" height="${r(el.height - w)}" ` +
    `fill="none" stroke="#000" stroke-width="${r(w)}"/>`
  );
}

function renderElement(
  el: LabelElement,
  part: Part,
  assets: LabelAssets,
): string {
  if (el.type === "image") {
    const href = assets[el.source];
    const image = href
      ? `<image x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" ` +
        `preserveAspectRatio="xMidYMid meet" href="${escapeXml(href)}"/>`
      : "";
    return image + outlineRect(el);
  }
  if (el.type === "barcode") return renderBarcode(el, part);
  const lines = wrapText(
    fill(el.text, part),
    el.width,
    el.font,
    el.fontSizePt,
    el.maxLines,
  );
  if (!lines.length) return "";
  const tspans = lines
    .map(
      (line, i) =>
        `<tspan x="${el.x}" y="${+(el.y + i * el.lineHeight).toFixed(3)}">${escapeXml(line)}</tspan>`,
    )
    .join("");
  const weight = el.font === "sans" ? "normal" : "bold";
  return (
    `<text font-family="${LABEL_FONT_FAMILY[el.font]}" font-weight="${weight}" ` +
    `font-size="${+(el.fontSizePt * PT_TO_MM).toFixed(4)}" fill="#000">${tspans}</text>`
  );
}

/** Share of the font size above the baseline (Helvetica ascender ≈ 0.72). */
const ASCENT = 0.8;

/**
 * The area an element draws into, in mm. For text that is the full width
 * and every allowed line, from the first line's ascender to the last
 * line's descender.
 */
export function elementBox(el: LabelElement): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (el.type === "image" || el.type === "barcode")
    return { x: el.x, y: el.y, width: el.width, height: el.height };
  const sizeMm = el.fontSizePt * PT_TO_MM;
  return {
    x: el.x,
    y: +(el.y - sizeMm * ASCENT).toFixed(3),
    width: el.width,
    height: +((el.maxLines - 1) * el.lineHeight + sizeMm).toFixed(3),
  };
}

/**
 * One element on its own, cropped to `elementBox` (same coordinates as on
 * the label), for an editor that positions elements itself.
 */
export function renderElementSvg(
  el: LabelElement,
  part: Part,
  assets: LabelAssets = {},
): string {
  const { x, y, width, height } = elementBox(el);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${width} ${height}" overflow="visible">` +
    renderElement(el, part, assets) +
    `</svg>`
  );
}

/**
 * The label for `part` as a standalone SVG, sized in mm (user units are
 * mm). Black on white, ready to inline in HTML or place on a PDF.
 */
export function renderLabelSvg(
  template: LabelLayout,
  part: Part,
  assets: LabelAssets = {},
): string {
  const { widthMm: w, heightMm: h } = template;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">` +
    `<rect width="${w}" height="${h}" fill="#fff"/>` +
    template.elements.map((el) => renderElement(el, part, assets)).join("") +
    `</svg>`
  );
}
