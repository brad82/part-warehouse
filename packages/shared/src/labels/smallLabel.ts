import type { LabelTemplate } from "./types.js";

/**
 * 1×2⅝in mailer label (Avery 5160): QR left; code, name (2 lines) and
 * qty/rev right. 3mm padding; the text block is centred for a 2-line name.
 */
export const SMALL_LABEL: LabelTemplate = {
  id: "small",
  widthMm: 66.675,
  heightMm: 25.4,
  elements: [
    { type: "qr", field: "code", x: 3, y: 3.7, size: 18 },
    {
      type: "text",
      text: "{code}",
      x: 23,
      y: 8,
      width: 40.675,
      font: "mono-bold",
      fontSizePt: 10,
      lineHeight: 4.2,
      maxLines: 1,
    },
    {
      type: "text",
      text: "{name}",
      x: 23,
      y: 12.5,
      width: 40.675,
      font: "sans",
      fontSizePt: 8,
      lineHeight: 3.25,
      maxLines: 2,
    },
    {
      type: "text",
      text: "Qty {qtyPerBuild}",
      x: 23,
      y: 20,
      width: 13,
      font: "sans-bold",
      fontSizePt: 8,
      lineHeight: 3.4,
      maxLines: 1,
    },
    {
      type: "text",
      text: "Rev {revision}",
      x: 37,
      y: 20,
      width: 26.675,
      font: "sans-bold",
      fontSizePt: 8,
      lineHeight: 3.4,
      maxLines: 1,
    },
  ],
};
