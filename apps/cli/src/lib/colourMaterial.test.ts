import { describe, expect, it } from "vitest";
import { splitColourMaterial } from "./colourMaterial.js";

describe("splitColourMaterial", () => {
  it.each([
    ["Black PETG", "Black", "PETG"],
    ["Light Grey PETG", "Light Grey", "PETG"],
    ["Yellow/Black TPU 85A-90A", "Yellow/Black", "TPU 85A-90A"],
    ["Red", "Red", "PETG"],
    ["TPU", "Black", "TPU"],
    ["", "Black", "PETG"],
  ])("%j → %s + %s", (text, colour, material) => {
    expect(splitColourMaterial(text)).toEqual({ colour, material });
  });
});
