import bwipjs from "bwip-js";
import type { Part } from "../schemas.js";
import type { LabelElement, LabelFont, LabelTemplate } from "./types.js";
import { wrapText } from "./wrap.js";

/** CSS families whose metrics match `metrics.ts` (Arial ≈ Helvetica). */
export const LABEL_FONT_FAMILY: Record<LabelFont, string> = {
  sans: "Helvetica, Arial, sans-serif",
  "sans-bold": "Helvetica, Arial, sans-serif",
  "mono-bold": "Courier, 'Courier New', monospace",
};

const PT_TO_MM = 25.4 / 72;

/** A part field (`code`, `name`, `qtyPerBuild`…) or attribute value, as text. */
function fieldValue(part: Part, field: string): string {
  const value =
    field in part ? (part as Record<string, unknown>)[field] : part.attributes[field];
  return value == null ? "" : String(value);
}

function fill(text: string, part: Part): string {
  return text.replace(/\{(\w+)\}/g, (_m, field: string) => fieldValue(part, field));
}

function escapeXml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function renderElement(el: LabelElement, part: Part): string {
  if (el.type === "qr") {
    const value = fieldValue(part, el.field);
    if (!value) return "";
    const qr = bwipjs.toSVG({ bcid: "qrcode", text: value });
    return qr.replace(
      "<svg ",
      `<svg x="${el.x}" y="${el.y}" width="${el.size}" height="${el.size}" `,
    );
  }
  const lines = wrapText(fill(el.text, part), el.width, el.font, el.fontSizePt, el.maxLines);
  if (!lines.length) return "";
  const tspans = lines
    .map((line, i) => `<tspan x="${el.x}" y="${+(el.y + i * el.lineHeight).toFixed(3)}">${escapeXml(line)}</tspan>`)
    .join("");
  const weight = el.font === "sans" ? "normal" : "bold";
  return (
    `<text font-family="${LABEL_FONT_FAMILY[el.font]}" font-weight="${weight}" ` +
    `font-size="${+(el.fontSizePt * PT_TO_MM).toFixed(4)}" fill="#000">${tspans}</text>`
  );
}

/**
 * The label for `part` as a standalone SVG, sized in mm (user units are
 * mm). Black on white, ready to inline in HTML or place on a PDF.
 */
export function renderLabelSvg(template: LabelTemplate, part: Part): string {
  const { widthMm: w, heightMm: h } = template;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">` +
    `<rect width="${w}" height="${h}" fill="#fff"/>` +
    template.elements.map((el) => renderElement(el, part)).join("") +
    `</svg>`
  );
}
