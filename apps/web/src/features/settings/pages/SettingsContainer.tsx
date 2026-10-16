import { useListAttributeDefsQuery, useListPartTypesQuery } from "@features/parts";
import { errorMessage } from "@shared/api/errors";
import {
  useCreateAttributeDefMutation,
  useCreatePartTypeMutation,
  useDeleteAttributeDefMutation,
  useDeletePartTypeMutation,
  useUpdateAttributeDefMutation,
  useUpdatePartTypeMutation,
} from "../api/settingsApi";
import { slug } from "../model/slug";
import { unwrap } from "../model/unwrap";
import { SettingsPage } from "./SettingsPage";

const EMPTY: never[] = [];

/** Settings → Part types & attributes. Feeds SettingsPage from RTK Query. */
export function SettingsContainer() {
  const partTypes = useListPartTypesQuery();
  const attributeDefs = useListAttributeDefsQuery();
  const [createPartType] = useCreatePartTypeMutation();
  const [updatePartType] = useUpdatePartTypeMutation();
  const [deletePartType] = useDeletePartTypeMutation();
  const [createAttributeDef] = useCreateAttributeDefMutation();
  const [updateAttributeDef] = useUpdateAttributeDefMutation();
  const [deleteAttributeDef] = useDeleteAttributeDefMutation();

  return (
    <SettingsPage
      partTypes={partTypes.data ?? EMPTY}
      attributeDefs={attributeDefs.data ?? EMPTY}
      loading={partTypes.isLoading || attributeDefs.isLoading}
      error={errorMessage(partTypes.error ?? attributeDefs.error, "Couldn't load settings.")}
      onSavePartType={(id, name) =>
        unwrap(
          id
            ? updatePartType({ id, update: { name } })
            : createPartType({ id: slug(name, "-"), name }),
          "Couldn't save the part type.",
        )
      }
      onDeletePartType={(id) => unwrap(deletePartType(id), "Couldn't delete the part type.")}
      onSaveAttribute={(id, input) =>
        unwrap(
          id ? updateAttributeDef({ id, update: input }) : createAttributeDef(input),
          "Couldn't save the attribute.",
        )
      }
      onDeleteAttribute={(id) => unwrap(deleteAttributeDef(id), "Couldn't delete the attribute.")}
    />
  );
}
