import { measureText } from "./metrics.js";
import type { LabelFont } from "@parts-warehouse/shared";

/**
 * Breaks `text` into at most `maxLines` lines no wider than `widthMm`, at
 * spaces where possible. Text that doesn't fit ends in "…".
 */
export function wrapText(
  text: string,
  widthMm: number,
  font: LabelFont,
  sizePt: number,
  maxLines: number,
): string[] {
  const fits = (s: string) => measureText(s, font, sizePt) <= widthMm;
  const lines: string[] = [];
  let line = "";
  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (fits(candidate)) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = "";
    // A word wider than a whole line is broken by character.
    for (const ch of word) {
      if (line && !fits(line + ch)) {
        lines.push(line);
        line = "";
      }
      line += ch;
    }
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;

  let last = lines[maxLines - 1];
  while (last && !fits(`${last}…`)) last = last.slice(0, -1);
  return [...lines.slice(0, maxLines - 1), `${last.trimEnd()}…`];
}
