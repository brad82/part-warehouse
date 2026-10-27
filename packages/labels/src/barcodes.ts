import bwipjs from "bwip-js";
import { SYMBOLOGIES, type LabelBarcodeElement } from "@parts-warehouse/shared";

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
