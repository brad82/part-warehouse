import { createSelector } from "@wordpress/data";
import type { LabelTemplate } from "@parts-warehouse/shared";
import { blocksToElements } from "../model/convert";
import { sameData } from "../model/sameData";
import { fitScale } from "../model/zoom";
import type { PanelName, State } from "./reducer";

export const getMeta = (state: State) => state.meta;

export const getBlocks = (state: State) => state.blocks.present;

/** The template being edited, as it would save and print. */
export const getTemplate = createSelector(
  (state: State): LabelTemplate => ({
    ...state.meta,
    elements: blocksToElements(state.blocks.present),
  }),
  (state: State) => [state.meta, state.blocks.present],
);

export const getSavedTemplates = (state: State) => state.saved;

export const isReady = (state: State) => state.ready;

/** The stored copy of the open template; null for a draft. */
export const getSavedVersion = (state: State) =>
  (state.meta.id && state.saved.find((t) => t.id === state.meta.id)) || null;

/** Differs from its saved copy (or has never been saved). */
export const isDirty = createSelector(
  (state: State) => {
    const saved = getSavedVersion(state);
    return !saved || !sameData(saved, getTemplate(state));
  },
  (state: State) => [state.meta, state.blocks.present, state.saved],
);

export const canUndo = (state: State) => state.blocks.past.length > 0;

export const canRedo = (state: State) => state.blocks.future.length > 0;

export const getSample = (state: State) => state.sample;

export const isPanelOpen = (state: State, panel: PanelName) =>
  state.panels[panel];

/** Canvas px per mm: the fixed zoom, or whatever fits the viewport. */
export const getScale = (state: State) =>
  state.zoom ??
  fitScale(
    state.viewport.width,
    state.viewport.height,
    state.meta.widthMm,
    state.meta.heightMm,
  );

export const isZoomFit = (state: State) => state.zoom === null;

export const getNotice = (state: State) => state.notice;
