import { createBlock, type Block } from "@wordpress/blocks";
import {
  deleteCustomTemplate,
  loadCustomTemplates,
  renderStlToPng,
  saveCustomTemplate,
  type CustomLabelTemplate,
} from "@features/labels";
import { registerLabelBlocks } from "../blocks/registerLabelBlocks";
import { elementsToBlocks } from "../model/convert";
import {
  copyOf,
  startingTemplate,
  type StartingPoint,
} from "../model/startingTemplates";
import {
  downloadTemplate,
  pickJsonFile,
  readTemplateFile,
} from "../model/templateFiles";
import { stepZoom } from "../model/zoom";
import type { Action, PanelName, TemplateMeta } from "./reducer";
import * as selectors from "./selectors";

/** Selectors as thunks see them: bound to the current state. */
type BoundSelectors = {
  [K in keyof typeof selectors]: (typeof selectors)[K] extends (
    state: never,
    ...args: infer A
  ) => infer R
    ? (...args: A) => R
    : never;
};

type Thunk<R = void> = (args: {
  dispatch: (action: Action | Thunk<unknown>) => unknown;
  select: BoundSelectors;
}) => R;

/** Gutenberg blocks for a template's elements (block types must be registered). */
const createLabelBlocks = (elements: CustomLabelTemplate["elements"]) =>
  elementsToBlocks(elements).map(({ name, attributes }) =>
    createBlock(name, attributes),
  );

/** How long a notice stays in the status bar. */
const NOTICE_MS = 4000;

// Plain actions

export const setMeta = (meta: Partial<TemplateMeta>): Action => ({
  type: "SET_META",
  meta,
});
/** An undoable change from the block editor (its onChange). */
export const commitBlocks = (blocks: Block[]): Action => ({
  type: "COMMIT_BLOCKS",
  blocks,
});
/** A change within the current step (its onInput, e.g. typing). */
export const inputBlocks = (blocks: Block[]): Action => ({
  type: "INPUT_BLOCKS",
  blocks,
});
export const undo = (): Action => ({ type: "UNDO" });
export const redo = (): Action => ({ type: "REDO" });
export const setShowFields = (showFields: boolean): Action => ({
  type: "SET_SHOW_FIELDS",
  showFields,
});
export const togglePanel = (panel: PanelName): Action => ({
  type: "TOGGLE_PANEL",
  panel,
});
export const zoomToFit = (): Action => ({ type: "SET_ZOOM", zoom: null });
export const setViewport = (width: number, height: number): Action => ({
  type: "SET_VIEWPORT",
  width,
  height,
});

// Thunks

export const showNotice =
  (notice: string): Thunk =>
  ({ dispatch, select }) => {
    dispatch({ type: "SET_NOTICE", notice });
    setTimeout(() => {
      if (select.getNotice() === notice)
        dispatch({ type: "SET_NOTICE", notice: "" });
    }, NOTICE_MS);
  };

export const openTemplate =
  ({ elements, ...meta }: CustomLabelTemplate): Thunk =>
  ({ dispatch }) => {
    dispatch({ type: "OPEN", meta, blocks: createLabelBlocks(elements) });
  };

/** Fresh state for a visit: saved templates reloaded, a Small label copy open. */
export const initialize =
  (): Thunk =>
  ({ dispatch }) => {
    registerLabelBlocks();
    dispatch({ type: "SET_SAVED", saved: loadCustomTemplates() });
    dispatch(openTemplate(startingTemplate("small")));
  };

export const startFrom = (from: StartingPoint) =>
  openTemplate(startingTemplate(from));

export const openSaved =
  (id: string): Thunk =>
  ({ dispatch, select }) => {
    const template = select.getSavedTemplates().find((t) => t.id === id);
    if (template) dispatch(openTemplate(template));
  };

export const save =
  (): Thunk =>
  ({ dispatch, select }) => {
    const ok = saveCustomTemplate(select.getTemplate());
    dispatch({ type: "SET_SAVED", saved: loadCustomTemplates() });
    dispatch(
      showNotice(
        ok
          ? "Saved in this browser"
          : "Couldn't save: browser storage is unavailable",
      ),
    );
  };

/** Deletes the open template from storage and keeps editing an unsaved copy. */
export const deleteTemplate =
  (): Thunk =>
  ({ dispatch, select }) => {
    const template = select.getTemplate();
    deleteCustomTemplate(template.id);
    dispatch({ type: "SET_SAVED", saved: loadCustomTemplates() });
    dispatch(openTemplate(copyOf(template)));
    dispatch(showNotice("Template deleted"));
  };

export const exportTemplate =
  (): Thunk =>
  ({ select }) =>
    downloadTemplate(select.getTemplate());

export const importTemplate =
  (): Thunk<Promise<void>> =>
  async ({ dispatch }) => {
    const file = await pickJsonFile();
    if (!file) return;
    try {
      dispatch(openTemplate(await readTemplateFile(file)));
      dispatch(showNotice(`Imported ${file.name}. Save to keep it.`));
    } catch (e) {
      dispatch(showNotice((e as Error).message));
    }
  };

/** Picks the sample part and fetches its render (dropped if superseded). */
export const selectSamplePart =
  (partCode: string): Thunk<Promise<void>> =>
  async ({ dispatch, select }) => {
    dispatch({ type: "SET_SAMPLE_PART", partCode });
    const render = await renderStlToPng(partCode);
    if (select.getSample().partCode === partCode) {
      dispatch({ type: "SET_SAMPLE_RENDER", render });
    }
  };

export const zoomIn =
  (): Thunk =>
  ({ dispatch, select }) =>
    dispatch({ type: "SET_ZOOM", zoom: stepZoom(select.getScale(), 1) });

export const zoomOut =
  (): Thunk =>
  ({ dispatch, select }) =>
    dispatch({ type: "SET_ZOOM", zoom: stepZoom(select.getScale(), -1) });
