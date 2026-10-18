import type { Block } from "@wordpress/blocks";
import { SMALL_LABEL } from "@snowcat/shared";
import { elementsToBlocks } from "../model/convert";
import { initialState, reducer, type Action, type State } from "./reducer";
import { canUndo, getScale, getTemplate, isDirty } from "./selectors";

const blocks = elementsToBlocks(SMALL_LABEL.elements) as unknown as Block[];
const meta = {
  id: "t1",
  name: "Test",
  widthMm: SMALL_LABEL.widthMm,
  heightMm: SMALL_LABEL.heightMm,
};
const run = (...actions: Action[]): State =>
  actions.reduce(reducer, initialState);
const opened = () => run({ type: "OPEN", meta, blocks });

describe("label creator store", () => {
  it("opens a template as an un-undoable starting point", () => {
    const state = opened();
    expect(getTemplate(state).elements).toEqual(SMALL_LABEL.elements);
    expect(canUndo(state)).toBe(false);
  });

  it("undoes block commits and leaves meta edits alone", () => {
    const state = [
      { type: "COMMIT_BLOCKS", blocks: blocks.slice(1) },
      { type: "SET_META", meta: { name: "Renamed" } },
      { type: "UNDO" },
    ].reduce((s, a) => reducer(s, a as Action), opened());
    expect(getTemplate(state).elements).toHaveLength(blocks.length);
    expect(state.meta.name).toBe("Renamed");
  });

  it("is dirty until the open template matches its saved copy", () => {
    const state = opened();
    expect(isDirty(state)).toBe(true);
    const saved = reducer(state, {
      type: "SET_SAVED",
      saved: [getTemplate(state)],
    });
    expect(isDirty(saved)).toBe(false);
    expect(
      isDirty(reducer(saved, { type: "SET_META", meta: { heightMm: 30 } })),
    ).toBe(true);
  });

  it("fits zoom to the viewport until a fixed zoom is set", () => {
    const fit = reducer(opened(), {
      type: "SET_VIEWPORT",
      width: 920,
      height: 520,
    });
    expect(getScale(fit)).toBeCloseTo(12, 1);
    expect(getScale(reducer(fit, { type: "SET_ZOOM", zoom: 4 }))).toBe(4);
  });

  it("clears the sample render when the sample part changes", () => {
    const state = run(
      { type: "SET_SAMPLE_RENDER", render: "data:old" },
      { type: "SET_SAMPLE_PART", partCode: "A01-001-002" },
    );
    expect(state.sample).toMatchObject({
      partCode: "A01-001-002",
      render: null,
    });
  });
});
