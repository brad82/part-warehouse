import type {
  LabelImageElement,
  LabelBarcodeElement,
  LabelTextElement,
} from "@parts-warehouse/shared";
import { applyGesture, resizeHandles, type Gesture } from "./geometry";

const qr: LabelBarcodeElement = {
  type: "barcode",
  symbology: "qrcode",
  field: "code",
  x: 10,
  y: 10,
  width: 20,
  height: 20,
};
const image: LabelImageElement = {
  type: "image",
  source: "render",
  x: 10,
  y: 10,
  width: 40,
  height: 20,
};
const text: LabelTextElement = {
  type: "text",
  text: "{name}",
  x: 10,
  y: 10,
  width: 30,
  font: "sans",
  fontSizePt: 8,
  lineHeight: 3.4,
  maxLines: 1,
};
const g = (
  mode: Gesture["mode"],
  dx: number,
  dy: number,
  shift = false,
): Gesture => ({
  mode,
  dx,
  dy,
  shift,
});

describe("move", () => {
  it("offsets x/y, rounded to 0.1mm", () => {
    expect(applyGesture(qr, g("move", 5.04, -2.26))).toEqual({ x: 15, y: 7.7 });
  });

  it("keeps to the larger axis with Shift", () => {
    expect(applyGesture(qr, g("move", 5, 2, true))).toEqual({ x: 15, y: 10 });
    expect(applyGesture(qr, g("move", 1, -4, true))).toEqual({ x: 10, y: 6 });
  });
});

describe("resize", () => {
  it("grows a box from its east/south edges", () => {
    expect(applyGesture(image, g("se", 5, 3))).toEqual({
      x: 10,
      y: 10,
      width: 45,
      height: 23,
    });
  });

  it("keeps the opposite edge fixed from north/west", () => {
    expect(applyGesture(image, g("nw", 4, -2))).toEqual({
      x: 14,
      y: 8,
      width: 36,
      height: 22,
    });
  });

  it("leaves the other axis alone on an edge handle", () => {
    expect(applyGesture(image, g("e", 5, 9))).toEqual({
      x: 10,
      y: 10,
      width: 45,
      height: 20,
    });
  });

  it("keeps the aspect ratio on a corner with Shift", () => {
    expect(applyGesture(image, g("se", 10, 0, true))).toEqual({
      x: 10,
      y: 10,
      width: 50,
      height: 25,
    });
  });

  it("never shrinks below 1mm", () => {
    expect(applyGesture(image, g("w", 100, 0))).toEqual({
      x: 49,
      y: 10,
      width: 1,
      height: 20,
    });
  });

  it("keeps square 2D codes square, anchored at the opposite corner", () => {
    expect(applyGesture(qr, g("se", 6, 2))).toEqual({
      x: 10,
      y: 10,
      width: 26,
      height: 26,
    });
    expect(applyGesture(qr, g("nw", 4, 4))).toEqual({
      x: 14,
      y: 14,
      width: 16,
      height: 16,
    });
  });

  it("offers corners for square codes, every handle for the rest", () => {
    expect(resizeHandles(qr)).toEqual(["nw", "ne", "se", "sw"]);
    expect(resizeHandles({ ...qr, symbology: "pdf417" })).toHaveLength(8);
    expect(
      resizeHandles({ ...qr, symbology: "datamatrix", rectangular: true }),
    ).toHaveLength(8);
    expect(resizeHandles(text)).toEqual(["w", "e"]);
  });

  it("only changes text width", () => {
    expect(applyGesture(text, g("w", -5, 7))).toEqual({ x: 5, width: 35 });
  });
});
