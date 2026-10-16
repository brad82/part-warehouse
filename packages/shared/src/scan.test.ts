import { describe, expect, it } from "vitest";
import { parseScan } from "./scan.js";

describe("parseScan", () => {
  it("accepts a bare code", () => {
    expect(parseScan("A01-001-001")).toBe("A01-001-001");
  });

  it("trims scanner whitespace and normalizes case", () => {
    expect(parseScan("  a06-050-004\r\n")).toBe("A06-050-004");
  });

  it("extracts a code from a URL", () => {
    expect(parseScan("http://localhost:3000/parts/A03-002-001")).toBe(
      "A03-002-001",
    );
  });

  it("rejects junk", () => {
    expect(parseScan("hello")).toBeNull();
    expect(parseScan("A01-001")).toBeNull();
  });
});
