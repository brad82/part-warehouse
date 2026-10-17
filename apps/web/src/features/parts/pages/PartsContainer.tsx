import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { errorMessage } from "@shared/api/errors";
import {
  useGetPartQuery,
  useListAttributeDefsQuery,
  useListGroupingsQuery,
  useListPartTypesQuery,
  useListPartsQuery,
  useListPreviewColoursQuery,
  useUpdatePartMutation,
} from "../api/partsApi";
import { useDebouncedValue } from "../model/useDebouncedValue";
import { PartsProvider } from "../PartsProvider";
import { PartsPage } from "./PartsPage";

const EMPTY: never[] = [];

/** The only place the parts feature calls RTK Query. */
export function PartsContainer() {
  const { code } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search.trim());

  const groupings = useListGroupingsQuery();
  const parts = useListPartsQuery(q || undefined);
  const selected = useGetPartQuery(code ?? "", { skip: !code });
  const partTypes = useListPartTypesQuery();
  const attributeDefs = useListAttributeDefsQuery();
  const previewColours = useListPreviewColoursQuery();
  const [updatePart, updateState] = useUpdatePartMutation();

  const selectedError =
    selected.error && "status" in selected.error && selected.error.status === 404
      ? "Part not found"
      : errorMessage(selected.error, "Couldn't load this part.");

  return (
    <PartsProvider
      groupings={groupings.data ?? EMPTY}
      parts={parts.data ?? EMPTY}
      partTypes={partTypes.data ?? EMPTY}
      attributeDefs={attributeDefs.data ?? EMPTY}
      previewColours={previewColours.data ?? EMPTY}
      partsLoading={parts.isLoading || groupings.isLoading}
      search={search}
      onSearchChange={setSearch}
      selected={code ? selected.currentData : undefined}
      selectedCode={code}
      selectedLoading={selected.isFetching && !selected.currentData}
      selectedError={selectedError}
      onSelect={(next) => navigate(`/viewer/${next}`)}
      saving={updateState.isLoading}
      saveError={errorMessage(updateState.error, "Couldn't save. Try again.")}
      onSave={async (update) => {
        if (code) await updatePart({ code, update }).unwrap();
      }}
    >
      <PartsPage />
    </PartsProvider>
  );
}
