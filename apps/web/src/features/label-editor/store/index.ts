import { createReduxStore, register } from "@wordpress/data";
import * as actions from "./actions";
import { initialState, reducer } from "./reducer";
import * as selectors from "./selectors";

/**
 * The label editor's editor state, as a @wordpress/data store beside
 * Gutenberg's own `core/block-editor` (which keeps selection). Components
 * read it with `useSelect(store)` and change it with `useDispatch(store)`.
 * Call `initialize()` on entering the editor: the store outlives the page.
 */
export const store = createReduxStore("parts-warehouse/label-editor", {
  reducer: (state = initialState, action) => reducer(state, action),
  actions,
  selectors,
});

register(store);

export type { PanelName, TemplateMeta } from "./reducer";
