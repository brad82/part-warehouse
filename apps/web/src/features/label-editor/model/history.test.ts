import { commit, historyOf, redo, replacePresent, undo } from "./history";

describe("history", () => {
  it("undoes commits, not replacements, and redoes", () => {
    let h = commit(historyOf("a"), "b");
    h = replacePresent(h, "bc");
    h = undo(h);
    expect(h.present).toBe("a");
    expect(redo(h).present).toBe("bc");
  });

  it("clears redo on a new commit", () => {
    const h = commit(undo(commit(historyOf(1), 2)), 3);
    expect(h.future).toEqual([]);
    expect(h.past).toEqual([1]);
  });

  it("ignores undo and redo at the ends", () => {
    const h = historyOf("only");
    expect(undo(h)).toBe(h);
    expect(redo(h)).toBe(h);
  });
});
