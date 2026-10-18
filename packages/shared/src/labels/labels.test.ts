import { describe, expect, it } from "vitest";
import type { Part } from "../schemas.js";
import { tidyBarcode } from "./barcodes.js";
import { measureText } from "./metrics.js";
import { labelTemplateInputSchema } from "./schema.js";
import {
  barcodeIssue,
  elementBox,
  renderElementSvg,
  renderLabelSvg,
} from "./renderLabelSvg.js";
import { AVERY_5160, slotPosition } from "./sheets.js";
import type { LabelBarcodeElement, LabelLayout } from "./types.js";
import { wrapText } from "./wrap.js";

/** The shipped Small label (apps/api/templates/small.json), as a fixture. */
const SMALL_LABEL: LabelLayout = {
  widthMm: 66.675,
  heightMm: 25.4,
  elements: [
    {
      type: "barcode",
      symbology: "qrcode",
      field: "code",
      x: 3,
      y: 3.7,
      width: 18,
      height: 18,
    },
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
    expect(measureText("iii", "mono-bold", 10)).toBeCloseTo(
      measureText("WWW", "mono-bold", 10),
    );
  });
});

describe("wrapText", () => {
  const wrap = (text: string, width: number, maxLines = 2) =>
    wrapText(text, width, "sans", 8, maxLines);

  it("keeps short text on one line", () => {
    expect(wrap("Belt Clamp", 40)).toEqual(["Belt Clamp"]);
  });

  it("wraps at spaces", () => {
    expect(wrap("Small Coiled 20mm Inner Belt", 25)).toEqual([
      "Small Coiled 20mm",
      "Inner Belt",
    ]);
  });

  it("ends overflowing text with an ellipsis that fits", () => {
    const lines = wrap("one two three four five six seven eight nine ten", 15);
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith("…")).toBe(true);
    for (const line of lines)
      expect(measureText(line, "sans", 8)).toBeLessThanOrEqual(15);
  });

  it("breaks a word longer than the line", () => {
    const lines = wrap("Supercalifragilistic", 10, 3);
    expect(lines.join("")).toBe("Supercalifragilistic");
    for (const line of lines)
      expect(measureText(line, "sans", 8)).toBeLessThanOrEqual(10);
  });

  it("returns nothing for empty text", () => {
    expect(wrap("  ", 40)).toEqual([]);
  });
});

describe("renderLabelSvg", () => {
  const svg = renderLabelSvg(SMALL_LABEL, part);

  it("is sized to the template in mm", () => {
    expect(svg).toContain(
      'width="66.675mm" height="25.4mm" viewBox="0 0 66.675 25.4"',
    );
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
    expect(slotPosition(AVERY_5160, 1)).toEqual({
      page: 0,
      xMm: 4.7625,
      yMm: 12.7,
    });
    expect(slotPosition(AVERY_5160, 30)).toEqual({
      page: 0,
      xMm: 4.7625 + 2 * 69.85,
      yMm: 12.7 + 9 * 25.4,
    });
    expect(slotPosition(AVERY_5160, 31)).toEqual({
      page: 1,
      xMm: 4.7625,
      yMm: 12.7,
    });
  });
});

describe("image elements", () => {
  const template = {
    ...SMALL_LABEL,
    elements: [
      {
        type: "image",
        source: "render",
        x: 1,
        y: 2,
        width: 20,
        height: 10,
      } as const,
    ],
  };

  it("places the render, fitted to its box", () => {
    const svg = renderLabelSvg(template, part, {
      render: "data:image/png;base64,AA==",
    });
    expect(svg).toContain(
      '<image x="1" y="2" width="20" height="10" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,AA=="/>',
    );
  });

  it("is skipped without a render", () => {
    expect(renderLabelSvg(template, part)).not.toContain("<image");
  });

  it("draws an outline inside its box, over the render", () => {
    const outlined = {
      ...template,
      elements: [{ ...template.elements[0], outlineWidth: 0.4 }],
    };
    const svg = renderLabelSvg(outlined, part, {
      render: "data:image/png;base64,AA==",
    });
    expect(svg).toContain(
      '<rect x="1.2" y="2.2" width="19.6" height="9.6" fill="none" stroke="#000" stroke-width="0.4"/>',
    );
    expect(svg.indexOf("<image")).toBeLessThan(svg.indexOf('stroke="#000"'));
  });

  it("draws the outline even without a render", () => {
    const outlined = {
      ...template,
      elements: [{ ...template.elements[0], outlineWidth: 0.4 }],
    };
    expect(renderLabelSvg(outlined, part)).toContain('stroke-width="0.4"');
  });
});

describe("renderElementSvg", () => {
  it("crops a QR to its square", () => {
    const qr = SMALL_LABEL.elements[0];
    expect(renderElementSvg(qr, part)).toContain('viewBox="3 3.7 18 18"');
  });

  it("boxes text from the ascender over every allowed line", () => {
    const name = SMALL_LABEL.elements[2];
    const box = elementBox(name);
    // 8pt = 2.822mm; ascender 0.8 of that above the 12.5mm baseline.
    expect(box.y).toBeCloseTo(12.5 - 2.258, 2);
    expect(box.height).toBeCloseTo(3.25 + 2.822, 2);
    expect(box.width).toBe(40.675);
  });
});

describe("barcode elements", () => {
  const barcode = {
    type: "barcode",
    symbology: "code128",
    field: "code",
    x: 2,
    y: 20,
    width: 40,
    height: 8,
  } as const;
  const render = (el: LabelBarcodeElement) =>
    renderLabelSvg({ ...SMALL_LABEL, elements: [el] }, part);

  it("stretches 1D bars to the box", () => {
    expect(render(barcode)).toContain(
      '<svg x="2" y="20" width="40" height="8" preserveAspectRatio="none" ',
    );
    expect(elementBox(barcode)).toEqual({ x: 2, y: 20, width: 40, height: 8 });
  });

  it("fits 2D codes inside the box without distortion", () => {
    expect(render({ ...barcode, symbology: "datamatrix" })).toContain(
      'height="8" preserveAspectRatio="xMidYMid meet" ',
    );
  });

  it("prints a 1D value beneath the bars with showText", () => {
    const svg = render({ ...barcode, showText: true });
    // 8mm box: a 2.4mm strip for the value, bars above it.
    expect(svg).toContain('width="40" height="5.6" preserveAspectRatio="none"');
    expect(svg).toMatch(
      /<text x="22" y="27\.64" text-anchor="middle"[^>]*>A01-001-004<\/text>/,
    );
  });

  it("shrinks the value to fit a narrow box", () => {
    const svg = render({ ...barcode, width: 10, showText: true });
    const sizeMm = Number(
      svg.match(/font-size="([\d.]+)"[^>]*>A01-001-004/)![1],
    );
    const sizePt = sizeMm / (25.4 / 72);
    expect(measureText("A01-001-004", "mono-bold", sizePt)).toBeLessThanOrEqual(
      10,
    );
  });

  it("never prints value text under 2D codes", () => {
    expect(
      render({ ...barcode, symbology: "qrcode", showText: true }),
    ).not.toContain("<text");
  });

  it("applies QR error correction", () => {
    const qr = { ...barcode, symbology: "qrcode" } as const;
    expect(render({ ...qr, ecLevel: "H" })).not.toEqual(
      render({ ...qr, ecLevel: "L" }),
    );
  });

  it("prints nothing, and explains why, when the format can't encode the value", () => {
    const ean = { ...barcode, symbology: "ean13" } as const;
    expect(render(ean)).not.toContain("preserveAspectRatio");
    expect(barcodeIssue(ean, part)).toBe(
      'EAN-13 can\'t encode "A01-001-004" (12 or 13 digits)',
    );
    expect(barcodeIssue(barcode, part)).toBeNull();
  });

  it("is skipped when the field is empty", () => {
    expect(render({ ...barcode, field: "notes" })).not.toContain(
      "preserveAspectRatio",
    );
    expect(barcodeIssue({ ...barcode, field: "notes" }, part)).toBe(
      "No notes value",
    );
  });
});

describe("tidyBarcode", () => {
  it("keeps only options the format uses, and only non-defaults", () => {
    const base = {
      type: "barcode",
      field: "code",
      x: 0,
      y: 0,
      width: 9,
      height: 9,
    } as const;
    const all = {
      showText: true,
      ecLevel: "M",
      rectangular: true,
      checkDigit: true,
    } as const;
    expect(tidyBarcode({ ...base, symbology: "qrcode", ...all })).toEqual({
      ...base,
      symbology: "qrcode",
    });
    expect(tidyBarcode({ ...base, symbology: "code39", ...all })).toEqual({
      ...base,
      symbology: "code39",
      showText: true,
      checkDigit: true,
    });
  });
});

describe("derived fields", () => {
  const layout = (text: string): LabelLayout => ({
    widthMm: 80,
    heightMm: 10,
    elements: [
      {
        type: "text",
        text,
        x: 0,
        y: 5,
        width: 80,
        font: "sans",
        fontSizePt: 8,
        lineHeight: 3,
        maxLines: 1,
      },
    ],
  });

  it("prints colour and material for printed parts", () => {
    expect(renderLabelSvg(layout("{detail}"), part)).toContain(">Black<");
  });

  it("prints only the SKU for bought parts", () => {
    const bought = {
      ...part,
      attributes: { supplier: "McMaster", sku: "91290A115" },
    };
    expect(renderLabelSvg(layout("{detail}"), bought)).toContain(">91290A115<");
  });
});

describe("labelTemplateInputSchema", () => {
  it("accepts the shipped templates and rejects bad elements", () => {
    expect(
      labelTemplateInputSchema.parse({ name: "Small", ...SMALL_LABEL }),
    ).toMatchObject({
      description: null,
    });
    const bad = {
      name: "Bad",
      ...SMALL_LABEL,
      elements: [{ type: "barcode", symbology: "nope" }],
    };
    expect(labelTemplateInputSchema.safeParse(bad).success).toBe(false);
  });
});
