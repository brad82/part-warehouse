import { useEffect, useLayoutEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, LinearProgress } from "@mui/material";
import { useDispatch, useSelect } from "@wordpress/data";
import type { LabelTemplateInput } from "@parts-warehouse/shared";
import {
  useCreateLabelTemplateMutation,
  useDeleteLabelTemplateMutation,
  useListLabelTemplatesQuery,
  useUpdateLabelTemplateMutation,
} from "@features/labels";
import { useListAttributeDefsQuery, useListPartsQuery } from "@shared/api/catalogApi";
import { errorMessage } from "@shared/api/errors";
import {
  LabelEditorDataProvider,
  type TemplatePersistence,
} from "../LabelEditorDataProvider";
import { fieldOptions } from "../model/fields";
import { store } from "../store";
import { LabelEditorPage } from "./LabelEditorPage";

const EMPTY: never[] = [];

/** Awaits an RTK mutation, rejecting with the API's message. */
async function unwrap<T>(
  result: { unwrap: () => Promise<T> },
  fallback: string,
) {
  try {
    return await result.unwrap();
  } catch (e) {
    throw new Error(errorMessage(e as never, fallback) ?? fallback);
  }
}

/**
 * Settings → Label templates. The only place the feature calls RTK Query or
 * the router; default export for React.lazy (Gutenberg is a large chunk).
 */
export default function LabelEditorContainer() {
  const navigate = useNavigate();
  const parts = useListPartsQuery();
  const defs = useListAttributeDefsQuery();
  const templates = useListLabelTemplatesQuery();
  const [create] = useCreateLabelTemplateMutation();
  const [update] = useUpdateLabelTemplateMutation();
  const [remove] = useDeleteLabelTemplateMutation();
  const fields = useMemo(() => fieldOptions(defs.data ?? EMPTY), [defs.data]);
  const ready = useSelect((select) => select(store).isReady(), []);
  const { reset, initialize, setSaved } = useDispatch(store);
  const error =
    errorMessage(templates.error, "Couldn't load label templates.") ??
    errorMessage(parts.error, "Couldn't load parts.");

  // The store outlives the page: start each visit from scratch, before paint
  // so the previous visit's template never flashes up.
  useLayoutEffect(() => {
    reset();
  }, [reset]);

  // Open the first template once they load; later loads refresh the list.
  useEffect(() => {
    if (!templates.data) return;
    if (ready) setSaved(templates.data);
    else void initialize(templates.data);
  }, [templates.data, ready, initialize, setSaved]);

  const persist: TemplatePersistence = useMemo(
    () => ({
      create: (template: LabelTemplateInput) =>
        unwrap(create(template), "Couldn't save the template."),
      update: (id: string, template: LabelTemplateInput) =>
        unwrap(update({ id, template }), "Couldn't save the template."),
      remove: (id: string) =>
        unwrap(remove(id), "Couldn't delete the template."),
    }),
    [create, update, remove],
  );

  return (
    <Box
      sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}
    >
      {error ? (
        <Alert severity="error" sx={{ borderRadius: 0 }}>
          {error}
        </Alert>
      ) : null}
      {ready ? (
        <LabelEditorDataProvider
          parts={parts.data ?? EMPTY}
          fields={fields}
          onExit={() => navigate("/settings")}
          persist={persist}
        >
          <LabelEditorPage />
        </LabelEditorDataProvider>
      ) : error ? null : (
        <LinearProgress />
      )}
    </Box>
  );
}
