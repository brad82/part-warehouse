import { createBlock, type Block } from "@wordpress/blocks";
import type { LabelElement, LabelTemplate } from "@parts-warehouse/shared";
import { renderPartPreview } from "@features/labels";
import { registerLabelBlocks } from "../blocks/registerLabelBlocks";
import { elementsToBlocks } from "../model/convert";
import { blankDraft, draftOf, duplicateDraft, toInput } from "../model/drafts";
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
const createLabelBlocks = (elements: LabelElement[]) =>
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
/** Back to a blank, not-ready store (entering the editor). */
export const reset = (): Action => ({ type: "RESET" });
/** The stored templates, from the API. */
export const setSaved = (saved: LabelTemplate[]): Action => ({
  type: "SET_SAVED",
  saved,
});
/** The API stored the open template (`template` is its stored copy). */
export const templateSaved = (template: LabelTemplate): Action => ({
  type: "SAVED",
  template,
});
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
  ({ elements, ...meta }: LabelTemplate): Thunk =>
  ({ dispatch }) => {
    dispatch({ type: "OPEN", meta, blocks: createLabelBlocks(elements) });
  };

/**
 * Starts a visit once the stored templates are known: opens the first
 * (built-ins come first) or, with none, a blank draft.
 */
export const initialize =
  (saved: LabelTemplate[]): Thunk =>
  ({ dispatch }) => {
    registerLabelBlocks();
    dispatch({ type: "SET_SAVED", saved });
    dispatch(openTemplate(saved[0] ?? blankDraft()));
    dispatch({ type: "READY" });
  };

export const openSaved =
  (id: string): Thunk =>
  ({ dispatch, select }) => {
    const template = select.getSavedTemplates().find((t) => t.id === id);
    if (template) dispatch(openTemplate(template));
  };

export const startBlank = () => openTemplate(blankDraft());

/** Opens an unsaved copy of the open template. */
export const duplicate =
  (): Thunk =>
  ({ dispatch, select }) =>
    dispatch(openTemplate(duplicateDraft(select.getTemplate())));

export const exportTemplate =
  (): Thunk =>
  ({ select }) =>
    downloadTemplate(toInput(select.getTemplate()));

/** Opens a template file as a draft; saving stores it. */
export const importTemplate =
  (): Thunk<Promise<void>> =>
  async ({ dispatch }) => {
    const file = await pickJsonFile();
    if (!file) return;
    try {
      dispatch(openTemplate(draftOf(await readTemplateFile(file))));
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
    const render = await renderPartPreview(partCode);
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
