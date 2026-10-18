import type { Block } from "@wordpress/blocks";
import { elementsToBlocks } from "../model/convert";
import { SMALL_LABEL } from "../testing/smallLabel";
import {
  initialState,
  metaOf,
  reducer,
  type Action,
  type State,
} from "./reducer";
import {
  canUndo,
  getSavedVersion,
  getScale,
  getTemplate,
  isDirty,
} from "./selectors";

const blocks = elementsToBlocks(SMALL_LABEL.elements) as unknown as Block[];
const meta = metaOf(SMALL_LABEL);
const run = (...actions: Action[]): State =>
  actions.reduce(reducer, initialState);
const opened = () => run({ type: "OPEN", meta, blocks });

describe("label editor store", () => {
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

  it("gives a draft its stored identity once saved", () => {
    const draft = run({
      type: "OPEN",
      meta: { ...meta, id: "", builtin: false },
      blocks,
    });
    expect(getSavedVersion(draft)).toBeNull();
    expect(isDirty(draft)).toBe(true);
    const stored = {
      ...getTemplate(draft),
      id: "small-copy",
      updatedAt: "2026-02-02T00:00:00.000Z",
    };
    const saved = reducer(draft, { type: "SAVED", template: stored });
    expect(saved.meta.id).toBe("small-copy");
    expect(isDirty(saved)).toBe(false);
  });

  it("resets to a blank, not-ready store", () => {
    expect(reducer({ ...opened(), ready: true }, { type: "RESET" })).toEqual(
      initialState,
    );
  });
});
