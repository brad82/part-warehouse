import { describe, expect, it } from "vitest";
import { AVERY_5160, labelPageSheet } from "@parts-warehouse/labels";
import { type LabelLayout, type Part } from "@parts-warehouse/shared";
import { renderLabelsPdf } from "./renderLabelsPdf.js";

const part: Part = {
  code: "A01-001-001",
  groupId: "A01-001",
  part: "01",
  revision: 0,
  name: "Grouser",
  partTypeId: "printed",
  qtyPerBuild: 40,
  notes: null,
  onHand: 0,
  attributes: {},
  status: "planned",
  source: "csv",
  updatedAt: "",
  image: null,
};

const small: LabelLayout = {
  widthMm: 66.675,
  heightMm: 25.4,
  elements: [
    { type: "text", text: "{code}", x: 2, y: 6, width: 60, font: "sans", fontSizePt: 10, lineHeight: 4, maxLines: 1 },
  ],
};

const bag: LabelLayout = {
  widthMm: 58.76,
  heightMm: 101.6,
  elements: [
    { type: "image", source: "render", x: 3, y: 30, width: 50, height: 40 },
  ],
};

// 1×1 PNG.
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

const text = (pdf: Buffer) => pdf.toString("latin1");
const pageCount = (pdf: Buffer) => text(pdf).match(/\/Type \/Page\b/g)?.length;

describe("renderLabelsPdf", () => {
  it("fills sheet slots from `start`, overflowing onto a second sheet", async () => {
    const parts = [part, part, part];
    const one = await renderLabelsPdf(parts, { template: small, sheet: AVERY_5160 });
    expect(one.pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(one.pages).toBe(1);

    const two = await renderLabelsPdf(parts, { template: small, sheet: AVERY_5160, start: 29 });
    expect(two.pages).toBe(2);
    expect(pageCount(two.pdf)).toBe(2);
  });

  it("puts one label per label-sized page", async () => {
    const { pdf, pages } = await renderLabelsPdf([part, part], {
      template: bag,
      sheet: labelPageSheet(bag),
    });
    expect(pages).toBe(2);
    expect(pageCount(pdf)).toBe(2);
    // 58.76×101.6mm in points.
    expect(text(pdf)).toMatch(/\/MediaBox \[0 0 166\.56\d* 288\]/);
  });

  it("draws each part's render when given one", async () => {
    const sheet = labelPageSheet(bag);
    const without = await renderLabelsPdf([part], { template: bag, sheet });
    const withRender = await renderLabelsPdf([part], {
      template: bag,
      sheet,
      assets: () => ({ render: PNG }),
    });
    expect(text(without.pdf)).not.toContain("/Subtype /Image");
    expect(text(withRender.pdf)).toContain("/Subtype /Image");
  });
});
