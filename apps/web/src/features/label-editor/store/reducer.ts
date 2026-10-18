import type { Block } from "@wordpress/blocks";
import type { CustomLabelTemplate } from "@features/labels";
import {
  commit,
  historyOf,
  redo,
  replacePresent,
  undo,
  type History,
} from "../model/history";

/** The template minus its elements, which live in `blocks`. */
export type TemplateMeta = Omit<CustomLabelTemplate, "elements">;

export type PanelName = "layers" | "settings";

export type State = {
  meta: TemplateMeta;
  /** Front to back; see blocksToElements. */
  blocks: History<Block[]>;
  /** Templates saved in this browser. */
  saved: CustomLabelTemplate[];
  sample: {
    /** Part the canvas renders; null until parts load. */
    partCode: string | null;
    /** That part's 3D render, once fetched. */
    render: string | null;
    /** Show `{field}` placeholders instead of the part's values. */
    showFields: boolean;
  };
  panels: Record<PanelName, boolean>;
  /** Canvas px per mm; null = fit to the viewport. */
  zoom: number | null;
  /** Canvas area size in px, for zoom-to-fit. */
  viewport: { width: number; height: number };
  /** Transient status bar message ("Saved…"); empty when none. */
  notice: string;
};

export type Action =
  | { type: "OPEN"; meta: TemplateMeta; blocks: Block[] }
  | { type: "SET_META"; meta: Partial<TemplateMeta> }
  | { type: "COMMIT_BLOCKS"; blocks: Block[] }
  | { type: "INPUT_BLOCKS"; blocks: Block[] }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "SET_SAVED"; saved: CustomLabelTemplate[] }
  | { type: "SET_SAMPLE_PART"; partCode: string }
  | { type: "SET_SAMPLE_RENDER"; render: string | null }
  | { type: "SET_SHOW_FIELDS"; showFields: boolean }
  | { type: "TOGGLE_PANEL"; panel: PanelName }
  | { type: "SET_ZOOM"; zoom: number | null }
  | { type: "SET_VIEWPORT"; width: number; height: number }
  | { type: "SET_NOTICE"; notice: string };

export const initialState: State = {
  meta: { id: "", name: "", widthMm: 62, heightMm: 29 },
  blocks: historyOf([]),
  saved: [],
  sample: { partCode: null, render: null, showFields: false },
  panels: { layers: true, settings: true },
  zoom: null,
  viewport: { width: 0, height: 0 },
  notice: "",
};

export function reducer(state: State = initialState, action: Action): State {
  switch (action.type) {
    case "OPEN":
      return {
        ...state,
        meta: action.meta,
        blocks: historyOf(action.blocks),
        zoom: null,
      };
    case "SET_META":
      return { ...state, meta: { ...state.meta, ...action.meta } };
    case "COMMIT_BLOCKS":
      return { ...state, blocks: commit(state.blocks, action.blocks) };
    case "INPUT_BLOCKS":
      return { ...state, blocks: replacePresent(state.blocks, action.blocks) };
    case "UNDO":
      return { ...state, blocks: undo(state.blocks) };
    case "REDO":
      return { ...state, blocks: redo(state.blocks) };
    case "SET_SAVED":
      return { ...state, saved: action.saved };
    case "SET_SAMPLE_PART":
      return {
        ...state,
        sample: { ...state.sample, partCode: action.partCode, render: null },
      };
    case "SET_SAMPLE_RENDER":
      return { ...state, sample: { ...state.sample, render: action.render } };
    case "SET_SHOW_FIELDS":
      return {
        ...state,
        sample: { ...state.sample, showFields: action.showFields },
      };
    case "TOGGLE_PANEL":
      return {
        ...state,
        panels: {
          ...state.panels,
          [action.panel]: !state.panels[action.panel],
        },
      };
    case "SET_ZOOM":
      return { ...state, zoom: action.zoom };
    case "SET_VIEWPORT":
      return {
        ...state,
        viewport: { width: action.width, height: action.height },
      };
    case "SET_NOTICE":
      return { ...state, notice: action.notice };
    default:
      return state;
  }
}
