import bwipjs from "bwip-js";
import type { LabelBarcodeElement, Symbology } from "./types.js";

export type SymbologyInfo = {
  label: string;
  /** 1D codes stretch to their box; 2D codes keep their shape. */
  kind: "1d" | "2d";
  /** Box a new element of this format starts with, in mm. */
  size: { width: number; height: number };
  /** What the format accepts, when that's narrower than any text. */
  accepts?: string;
};

export const SYMBOLOGIES: Record<Symbology, SymbologyInfo> = {
  code128: { label: "Code 128", kind: "1d", size: { width: 40, height: 10 } },
  code39: {
    label: "Code 39",
    kind: "1d",
    size: { width: 50, height: 10 },
    accepts: "Capitals, digits, space and - . $ / + %",
  },
  code93: { label: "Code 93", kind: "1d", size: { width: 40, height: 10 } },
  ean13: {
    label: "EAN-13",
    kind: "1d",
    size: { width: 30, height: 15 },
    accepts: "12 or 13 digits",
  },
  upca: {
    label: "UPC-A",
    kind: "1d",
    size: { width: 30, height: 15 },
    accepts: "11 or 12 digits",
  },
  qrcode: { label: "QR code", kind: "2d", size: { width: 18, height: 18 } },
  microqrcode: {
    label: "Micro QR",
    kind: "2d",
    size: { width: 10, height: 10 },
    accepts: "Short values (about 15 characters)",
  },
  datamatrix: {
    label: "Data Matrix",
    kind: "2d",
    size: { width: 15, height: 15 },
  },
  pdf417: { label: "PDF417", kind: "2d", size: { width: 40, height: 12 } },
  azteccode: { label: "Aztec", kind: "2d", size: { width: 18, height: 18 } },
};

/**
 * `value` as `el`'s barcode: a standalone SVG with only a viewBox, no text.
 * Throws when the format can't encode the value.
 */
export function barcodeSvg(el: LabelBarcodeElement, value: string): string {
  const bcid =
    el.symbology === "datamatrix" && el.rectangular
      ? "datamatrixrectangular"
      : el.symbology;
  return bwipjs.toSVG({
    bcid,
    text: value,
    ...(el.symbology === "qrcode" ? { eclevel: el.ecLevel ?? "M" } : {}),
    ...(el.symbology === "code39" && el.checkDigit
      ? { includecheck: true }
      : {}),
  });
}

/**
 * `el` with only the options its format uses, and only where they differ
 * from the default, so equal barcodes compare and save identically.
 */
export function tidyBarcode(el: LabelBarcodeElement): LabelBarcodeElement {
  const { showText, ecLevel, rectangular, checkDigit, ...base } = el;
  const s = el.symbology;
  return {
    ...base,
    ...(showText && SYMBOLOGIES[s].kind === "1d" ? { showText } : {}),
    ...(s === "qrcode" && ecLevel && ecLevel !== "M" ? { ecLevel } : {}),
    ...(s === "datamatrix" && rectangular ? { rectangular } : {}),
    ...(s === "code39" && checkDigit ? { checkDigit } : {}),
  };
}
