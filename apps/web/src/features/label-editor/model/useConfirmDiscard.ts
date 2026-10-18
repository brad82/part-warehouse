import { useSelect } from "@wordpress/data";
import { store } from "../store";

/** Returns a check to run before leaving the open template. */
export function useConfirmDiscard() {
  const dirty = useSelect((select) => select(store).isDirty(), []);
  return () =>
    !dirty || window.confirm("Discard unsaved changes to this template?");
}
