/**
 * Label templates as data: boxes in millimetres, rendered to SVG by
 * `renderLabelSvg`. Plain JSON so an editor (or another frontend) can
 * produce and read them.
 */

/** Fonts with known metrics; each maps to a standard PDF font. */
export type LabelFont = "sans" | "sans-bold" | "mono-bold";

/** Barcode formats a label can print (bwip-js encoder ids). */
export type Symbology =
  | "code128"
  | "code39"
  | "code93"
  | "ean13"
  | "upca"
  | "qrcode"
  | "microqrcode"
  | "datamatrix"
  | "pdf417"
  | "azteccode";

/** QR error correction: share of the code that can be damaged (7/15/25/30%). */
export type QrErrorCorrection = "L" | "M" | "Q" | "H";

/**
 * A barcode of a part field (normally the code) in a `width`×`height` mm box.
 * 1D (linear) bars stretch to fill the box; 2D codes fit inside it without
 * distortion. A value the format can't encode prints nothing.
 */
export type LabelBarcodeElement = {
  type: "barcode";
  symbology: Symbology;
  field: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** 1D only: the value in monospace bold beneath the bars, inside the box. */
  showText?: boolean;
  /** QR only; default M. */
  ecLevel?: QrErrorCorrection;
  /** Data Matrix only: the rectangular variant, for wide, short spaces. */
  rectangular?: boolean;
  /** Code 39 only: append the optional mod-43 check digit. */
  checkDigit?: boolean;
};

/**
 * Text with `{field}` placeholders (part fields, then attribute keys).
 * `y` is the first line's baseline; lines are `lineHeight` mm apart. Text
 * wider than `width` wraps at spaces, up to `maxLines`, ending in "…".
 */
export type LabelTextElement = {
  type: "text";
  text: string;
  x: number;
  y: number;
  width: number;
  font: LabelFont;
  fontSizePt: number;
  lineHeight: number;
  maxLines: number;
};

/**
 * An image supplied at render time, fitted (contain) into its box. `render`
 * is the part's 3D render; it is skipped where none is available (the CLI).
 */
export type LabelImageElement = {
  type: "image";
  source: "render";
  x: number;
  y: number;
  width: number;
  height: number;
  /** Line width (mm) of a black frame inside the box; 0 or absent for none. */
  outlineWidth?: number;
};

export type LabelElement =
  LabelBarcodeElement | LabelTextElement | LabelImageElement;

/** Images the caller already has; elements whose asset is missing are skipped. */
export type LabelAssets = { render?: string | null };

/** What renderLabelSvg draws: a page size and its elements, back to front. */
export type LabelLayout = {
  widthMm: number;
  heightMm: number;
  elements: LabelElement[];
};

/** A template as clients create or replace it. */
export type LabelTemplateInput = LabelLayout & {
  name: string;
  /** Stock / printer notes shown when choosing a template. */
  description: string | null;
};

/** A stored template. Built-ins ship with the app; they can be edited, not deleted. */
export type LabelTemplate = LabelTemplateInput & {
  id: string;
  builtin: boolean;
  updatedAt: string;
};

/** A sheet of labels (Avery-style), in millimetres from the page's top left. */
export type LabelSheet = {
  id: string;
  pageWidthMm: number;
  pageHeightMm: number;
  columns: number;
  rows: number;
  leftMm: number;
  topMm: number;
  columnPitchMm: number;
  rowPitchMm: number;
};
