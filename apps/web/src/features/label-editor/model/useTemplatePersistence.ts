import { useDispatch, useSelect } from "@wordpress/data";
import { useLabelEditorData } from "../LabelEditorDataProvider";
import { store } from "../store";
import { duplicateDraft, isDraft, toInput } from "./drafts";

/**
 * Saving and deleting the open template through the API. The store records
 * the result; failures show in the status bar.
 */
export function useTemplatePersistence() {
  const { persist } = useLabelEditorData();
  const template = useSelect((select) => select(store).getTemplate(), []);
  const { templateSaved, openTemplate, showNotice } = useDispatch(store);

  const report = (e: unknown) => showNotice((e as Error).message);

  return {
    /** Creates a draft, or replaces the stored template. */
    save: async () => {
      try {
        const input = toInput(template);
        const saved = isDraft(template)
          ? await persist.create(input)
          : await persist.update(template.id, input);
        templateSaved(saved);
        showNotice("Saved");
      } catch (e) {
        report(e);
      }
    },
    /** Deletes the stored template and keeps its content open as a draft. */
    remove: async () => {
      try {
        await persist.remove(template.id);
        openTemplate(duplicateDraft(template));
        showNotice("Template deleted");
      } catch (e) {
        report(e);
      }
    },
  };
}
