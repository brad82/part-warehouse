import { describe, expect, it } from "vitest";
import { slug } from "./slug";

describe("slug", () => {
  it("makes a key from a label", () => {
    expect(slug("Lead time (days)")).toBe("lead_time_days");
    expect(slug("  SKU  ")).toBe("sku");
  });

  it("supports another separator", () => {
    expect(slug("Off the shelf", "-")).toBe("off-the-shelf");
  });

  it("never starts with a digit", () => {
    expect(slug("3D model")).toBe("a3d_model");
  });
});
