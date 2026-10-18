import { useLayoutEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box } from "@mui/material";
import { useDispatch } from "@wordpress/data";
import { useListAttributeDefsQuery, useListPartsQuery } from "@features/parts";
import { errorMessage } from "@shared/api/errors";
import { LabelCreatorDataProvider } from "../LabelCreatorDataProvider";
import { fieldOptions } from "../model/fields";
import { store } from "../store";
import { LabelCreatorPage } from "./LabelCreatorPage";

const EMPTY: never[] = [];

/**
 * Settings → Label templates. The only place the feature calls RTK Query or
 * the router; default export for React.lazy (Gutenberg is a large chunk).
 */
export default function LabelCreatorContainer() {
  const navigate = useNavigate();
  const parts = useListPartsQuery();
  const defs = useListAttributeDefsQuery();
  const fields = useMemo(() => fieldOptions(defs.data ?? EMPTY), [defs.data]);
  const error = errorMessage(parts.error, "Couldn't load parts.");
  const { initialize } = useDispatch(store);

  // Before paint, so the previous visit's template never flashes up.
  useLayoutEffect(() => {
    void initialize();
  }, [initialize]);

  return (
    <Box
      sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}
    >
      {error ? (
        <Alert severity="error" sx={{ borderRadius: 0 }}>
          {error}
        </Alert>
      ) : null}
      <LabelCreatorDataProvider
        parts={parts.data ?? EMPTY}
        fields={fields}
        onExit={() => navigate("/settings")}
      >
        <LabelCreatorPage />
      </LabelCreatorDataProvider>
    </Box>
  );
}
