import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { errorMessage } from "@shared/api/errors";
import {
  useListAttributeDefsQuery,
  useListGroupingsQuery,
  useListPartTypesQuery,
  useListPartsQuery,
  useUpdatePartMutation,
} from "@features/parts";
import { buildRows, rowsInGrouping } from "../model/buildRows";
import { CatalogPage } from "./CatalogPage";

const EMPTY: never[] = [];

/** The only place the catalog feature calls RTK Query. */
export function CatalogContainer() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const groupingId = searchParams.get("group");
  const groupings = useListGroupingsQuery();
  const parts = useListPartsQuery();
  const partTypes = useListPartTypesQuery();
  const attributeDefs = useListAttributeDefsQuery();
  const [updatePart] = useUpdatePartMutation();

  const rows = useMemo(() => {
    const all = buildRows(groupings.data ?? EMPTY, parts.data ?? EMPTY, partTypes.data ?? EMPTY);
    return groupingId ? rowsInGrouping(all, groupingId) : all;
  }, [groupings.data, parts.data, partTypes.data, groupingId]);

  const grouping = groupingId ? groupings.data?.find((g) => g.id === groupingId) : undefined;

  return (
    <CatalogPage
      rows={rows}
      groupingFilter={groupingId && (grouping ? `${grouping.id} ${grouping.name}` : groupingId)}
      onClearGroupingFilter={() => setSearchParams({})}
      attributeDefs={attributeDefs.data ?? EMPTY}
      loading={parts.isLoading || groupings.isLoading || attributeDefs.isLoading}
      error={errorMessage(parts.error ?? groupings.error, "Couldn't load the catalog.")}
      onSelect={(code) => navigate(`/parts/${code}`)}
      onUpdate={async (code, update) => {
        try {
          await updatePart({ code, update }).unwrap();
        } catch (e) {
          throw new Error(
            errorMessage(e as Parameters<typeof errorMessage>[0], "Couldn't save. Try again.") ??
              "Couldn't save. Try again.",
          );
        }
      }}
    />
  );
}
