import { useListPreviewColoursQuery } from "@shared/api/catalogApi";
import { errorMessage } from "@shared/api/errors";
import {
  useCreatePreviewColourMutation,
  useDeletePreviewColourMutation,
  useUpdatePreviewColourMutation,
} from "../api/settingsApi";
import { unwrap } from "@shared/api/unwrap";
import { PreviewColoursPage } from "./PreviewColoursPage";

const EMPTY: never[] = [];

/** Settings → STL Preview. Feeds PreviewColoursPage from RTK Query. */
export function PreviewColoursContainer() {
  const colours = useListPreviewColoursQuery();
  const [createColour] = useCreatePreviewColourMutation();
  const [updateColour] = useUpdatePreviewColourMutation();
  const [deleteColour] = useDeletePreviewColourMutation();

  return (
    <PreviewColoursPage
      colours={colours.data ?? EMPTY}
      loading={colours.isLoading}
      error={errorMessage(colours.error, "Couldn't load colours.")}
      onSave={(id, input) =>
        unwrap(
          id ? updateColour({ id, update: input }) : createColour(input),
          "Couldn't save the colour.",
        )
      }
      onDelete={(id) => unwrap(deleteColour(id), "Couldn't delete the colour.")}
    />
  );
}
