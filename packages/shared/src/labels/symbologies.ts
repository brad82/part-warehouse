import type { Symbology } from "./types.js";

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
