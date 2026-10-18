import { sameData } from "./sameData";

describe("sameData", () => {
  it("ignores key order at any depth", () => {
    expect(
      sameData({ a: 1, b: [{ x: 1, y: 2 }] }, { b: [{ y: 2, x: 1 }], a: 1 }),
    ).toBe(true);
  });

  it("still sees different values and array order", () => {
    expect(sameData({ a: 1 }, { a: 2 })).toBe(false);
    expect(sameData([1, 2], [2, 1])).toBe(false);
  });
});
