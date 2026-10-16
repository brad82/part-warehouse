import { describe, expect, it } from "vitest";
import { colourMaterial, parseAttributeValue } from "./attributes.js";

const def = (dataType: Parameters<typeof parseAttributeValue>[0]["dataType"], options: string[] | null = null) => ({
  dataType,
  options,
});

describe("parseAttributeValue", () => {
  it("rejects empty input", () => {
    expect(parseAttributeValue(def("text"), "  ")).toMatchObject({ ok: false });
  });

  it("trims text", () => {
    expect(parseAttributeValue(def("text"), " M3x8 ")).toEqual({ ok: true, value: "M3x8" });
  });

  it("parses integers and rejects fractions and negatives", () => {
    expect(parseAttributeValue(def("integer"), "42")).toEqual({ ok: true, value: 42 });
    expect(parseAttributeValue(def("integer"), "4.5")).toMatchObject({ ok: false });
    expect(parseAttributeValue(def("integer"), -1)).toMatchObject({ ok: false });
  });

  it("rounds currency to cents", () => {
    expect(parseAttributeValue(def("currency"), "1.239")).toEqual({ ok: true, value: 1.24 });
  });

  it("accepts only http(s) links", () => {
    expect(parseAttributeValue(def("url"), "https://example.com/x")).toMatchObject({ ok: true });
    expect(parseAttributeValue(def("url"), "javascript:alert(1)")).toMatchObject({ ok: false });
    expect(parseAttributeValue(def("url"), "nope")).toMatchObject({ ok: false });
  });

  it("limits selects to their options", () => {
    expect(parseAttributeValue(def("select", ["PETG", "TPU"]), "TPU")).toEqual({ ok: true, value: "TPU" });
    expect(parseAttributeValue(def("select", ["PETG", "TPU"]), "PLA")).toMatchObject({ ok: false });
  });
});

describe("colourMaterial", () => {
  it("joins what is set", () => {
    expect(colourMaterial({ attributes: { colour: "Black", material: "PETG" } })).toBe("Black PETG");
    expect(colourMaterial({ attributes: { material: "TPU" } })).toBe("TPU");
  });
});
