import { fitScale, stepZoom } from "./zoom";

describe("fitScale", () => {
  it("fits the tighter dimension, leaving a margin", () => {
    // 66.675×25.4mm in 920×520px: width allows 12px/mm, height 15.7.
    expect(fitScale(920, 520, 66.675, 25.4)).toBeCloseTo(12, 1);
  });

  it("clamps to the zoom range and handles an unmeasured area", () => {
    expect(fitScale(100_000, 100_000, 10, 10)).toBe(30);
    expect(fitScale(0, 0, 66, 25)).toBe(6);
  });
});

describe("stepZoom", () => {
  it("steps by 25% within the range", () => {
    expect(stepZoom(8, 1)).toBe(10);
    expect(stepZoom(10, -1)).toBe(8);
    expect(stepZoom(30, 1)).toBe(30);
  });
});
