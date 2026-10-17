/**
 * Label templates as data: boxes in millimetres, rendered to SVG by
 * `renderLabelSvg`. Plain JSON so an editor (or another frontend) can
 * produce and read them.
 */

/** Fonts with known metrics; each maps to a standard PDF font. */
export type LabelFont = "sans" | "sans-bold" | "mono-bold";

/** QR of a part field (normally the code), `size` mm square at x, y. */
export type LabelQrElement = {
  type: "qr";
  field: string;
  x: number;
  y: number;
  size: number;
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

export type LabelElement = LabelQrElement | LabelTextElement;

export type LabelTemplate = {
  id: string;
  widthMm: number;
  heightMm: number;
  elements: LabelElement[];
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
