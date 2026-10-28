import type { LabelFont } from "@parts-warehouse/shared";

// Advance widths (1/1000 em) of ASCII 32–126, from the standard Helvetica
// AFM files. PDFs use these fonts exactly; Arial shares the metrics.
const HELVETICA = [
  278, 278, 355, 556, 556, 889, 667, 222, 333, 333, 389, 584, 278, 333, 278,
  278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584,
  584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556,
  833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278,
  278, 278, 469, 556, 222, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222,
  500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500,
  500, 334, 260, 334, 584,
];
const HELVETICA_BOLD = [
  278, 333, 474, 556, 556, 889, 722, 278, 333, 333, 389, 584, 278, 333, 278,
  278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584,
  584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611,
  833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333,
  278, 333, 584, 556, 278, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278,
  556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556,
  500, 389, 280, 389, 584,
];
const ELLIPSIS = 1000;
// Unknown characters (accents, symbols) are measured as a wide-ish letter.
const FALLBACK = 600;

const PT_TO_MM = 25.4 / 72;

function charWidth(font: LabelFont, ch: string): number {
  if (font === "mono-bold") return 600;
  if (ch === "…") return ELLIPSIS;
  const table = font === "sans-bold" ? HELVETICA_BOLD : HELVETICA;
  const code = ch.charCodeAt(0);
  return code >= 32 && code <= 126 ? table[code - 32] : FALLBACK;
}

/** Width of `text` in mm at `sizePt`. */
export function measureText(
  text: string,
  font: LabelFont,
  sizePt: number,
): number {
  let em = 0;
  for (const ch of text) em += charWidth(font, ch);
  return (em / 1000) * sizePt * PT_TO_MM;
}
