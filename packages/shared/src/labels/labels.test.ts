import { describe, expect, it } from "vitest";
import type { Part } from "../schemas.js";
import { measureText } from "./metrics.js";
import { renderLabelSvg } from "./renderLabelSvg.js";
import { AVERY_5160, slotPosition } from "./sheets.js";
import { SMALL_LABEL } from "./smallLabel.js";
import { wrapText } from "./wrap.js";

const part: Part = {
  code: "A01-001-004",
  groupId: "A01-001",
  part: "04",
  revision: 0,
  name: "Right Outer Grouser <2> & pin",
  partTypeId: "printed",
  qtyPerBuild: 12,
  notes: null,
  onHand: 0,
  attributes: { colour: "Black" },
  status: "planned",
  source: "csv",
  updatedAt: "",
};

describe("measureText", () => {
  it("uses Helvetica widths and fixed-width Courier", () => {
    // "H" is 722/1000 em; 10pt = 3.5278mm.
    expect(measureText("H", "sans", 10)).toBeCloseTo(2.547, 3);
    expect(measureText("iii", "mono-bold", 10)).toBeCloseTo(measureText("WWW", "mono-bold", 10));
  });
});

describe("wrapText", () => {
  const wrap = (text: string, width: number, maxLines = 2) =>
    wrapText(text, width, "sans", 8, maxLines);

  it("keeps short text on one line", () => {
    expect(wrap("Belt Clamp", 40)).toEqual(["Belt Clamp"]);
  });

  it("wraps at spaces", () => {
    expect(wrap("Small Coiled 20mm Inner Belt", 25)).toEqual(["Small Coiled 20mm", "Inner Belt"]);
  });

  it("ends overflowing text with an ellipsis that fits", () => {
    const lines = wrap("one two three four five six seven eight nine ten", 15);
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith("…")).toBe(true);
    for (const line of lines) expect(measureText(line, "sans", 8)).toBeLessThanOrEqual(15);
  });

  it("breaks a word longer than the line", () => {
    const lines = wrap("Supercalifragilistic", 10, 3);
    expect(lines.join("")).toBe("Supercalifragilistic");
    for (const line of lines) expect(measureText(line, "sans", 8)).toBeLessThanOrEqual(10);
  });

  it("returns nothing for empty text", () => {
    expect(wrap("  ", 40)).toEqual([]);
  });
});

describe("renderLabelSvg", () => {
  const svg = renderLabelSvg(SMALL_LABEL, part);

  it("is sized to the template in mm", () => {
    expect(svg).toContain('width="66.675mm" height="25.4mm" viewBox="0 0 66.675 25.4"');
  });

  it("fills fields and escapes text", () => {
    expect(svg).toContain(">A01-001-004<");
    expect(svg).toContain("Right Outer Grouser &#60;2&#62; &#38; pin");
    expect(svg).toContain(">Qty 12<");
    expect(svg).toContain(">Rev 0<");
  });

  it("nests the QR at its box", () => {
    expect(svg).toContain('<svg x="3" y="3.7" width="18" height="18" ');
  });
});

describe("slotPosition", () => {
  it("counts left to right, top to bottom, then onto the next page", () => {
    expect(slotPosition(AVERY_5160, 1)).toEqual({ page: 0, xMm: 4.7625, yMm: 12.7 });
    expect(slotPosition(AVERY_5160, 30)).toEqual({
      page: 0,
      xMm: 4.7625 + 2 * 69.85,
      yMm: 12.7 + 9 * 25.4,
    });
    expect(slotPosition(AVERY_5160, 31)).toEqual({ page: 1, xMm: 4.7625, yMm: 12.7 });
  });
});
