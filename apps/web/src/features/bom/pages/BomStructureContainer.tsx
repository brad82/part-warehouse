import { useMemo } from "react";
import { useListGroupingsQuery, useListPartsQuery } from "@shared/api/catalogApi";
import { errorMessage } from "@shared/api/errors";
import {
  useCreateGroupingMutation,
  useDeleteGroupingMutation,
  useUpdateGroupingMutation,
} from "../api/bomStructureApi";
import { groupingRows } from "../model/groupingRows";
import { unwrap } from "@shared/api/unwrap";
import { BomStructurePage } from "./BomStructurePage";

const EMPTY: never[] = [];

/** Settings → BOM structure. Feeds BomStructurePage from RTK Query. */
export function BomStructureContainer() {
  const groupings = useListGroupingsQuery();
  const parts = useListPartsQuery();
  const [createGrouping] = useCreateGroupingMutation();
  const [updateGrouping] = useUpdateGroupingMutation();
  const [deleteGrouping] = useDeleteGroupingMutation();

  const rows = useMemo(
    () => groupingRows(groupings.data ?? EMPTY, parts.data ?? EMPTY),
    [groupings.data, parts.data],
  );

  return (
    <BomStructurePage
      groupings={groupings.data ?? EMPTY}
      rows={rows}
      loading={groupings.isLoading || parts.isLoading}
      error={errorMessage(
        groupings.error ?? parts.error,
        "Couldn't load the BOM structure.",
      )}
      onCreate={(input) =>
        unwrap(createGrouping(input), `Couldn't add ${input.id}.`)
      }
      onRename={(id, name) =>
        unwrap(
          updateGrouping({ id, update: { name } }),
          `Couldn't rename ${id}.`,
        )
      }
      onDelete={(id) => unwrap(deleteGrouping(id), `Couldn't delete ${id}.`)}
    />
  );
}
