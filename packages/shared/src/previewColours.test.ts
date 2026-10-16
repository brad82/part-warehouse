import { describe, expect, it } from "vitest";
import { resolvePreviewColour } from "./previewColours.js";

const colours = [
  { name: "Black", hex: "#111111" },
  { name: "Yellow", hex: "#f1c40f" },
];

describe("resolvePreviewColour", () => {
  it("matches the part's colour ignoring case and spaces", () => {
    expect(resolvePreviewColour(colours, " yellow ")).toEqual({
      name: "Yellow",
      hex: "#f1c40f",
      matched: true,
    });
  });

  it("falls back to Black when nothing matches", () => {
    expect(resolvePreviewColour(colours, "Purple")).toEqual({
      name: "Black",
      hex: "#111111",
      matched: false,
    });
  });

  it("treats a blank colour as Black without a mismatch", () => {
    expect(resolvePreviewColour(colours, "")).toMatchObject({ name: "Black", matched: true });
  });

  it("uses the built-in Black when the list has none", () => {
    expect(resolvePreviewColour([], "Red")).toEqual({
      name: "Black",
      hex: "#2b2d30",
      matched: false,
    });
  });
});
