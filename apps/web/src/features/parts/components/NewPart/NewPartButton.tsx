import { useState } from "react";
import { IconButton, Tooltip } from "@mui/material";
import { Plus } from "lucide-react";
import { useMatch, useNavigate } from "react-router-dom";
import { errorMessage } from "@shared/api/errors";
import {
  useCreatePartMutation,
  useLazyNextPartNumberQuery,
  useListGroupingsQuery,
  useListPartTypesQuery,
  useListPartsQuery,
} from "../../api/partsApi";
import { NewPartDialog } from "./NewPartDialog";

const EMPTY: never[] = [];

/**
 * App-bar entry point. Owns the dialog's open state and its RTK Query calls.
 * Defaults the group to the part open in the viewer, if any.
 */
export function NewPartButton() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const viewing = useMatch("/viewer/:code")?.params.code;
  const groupings = useListGroupingsQuery();
  const partTypes = useListPartTypesQuery();
  const parts = useListPartsQuery();
  const [createPart, createState] = useCreatePartMutation();
  const [fetchNextPart] = useLazyNextPartNumberQuery();

  return (
    <>
      <Tooltip title="New part">
        <IconButton color="inherit" aria-label="New part" onClick={() => setOpen(true)}>
          <Plus size={20} />
        </IconButton>
      </Tooltip>
      {open ? (
        <NewPartDialog
          open={open}
          onClose={() => {
            setOpen(false);
            createState.reset();
          }}
          groupings={groupings.data ?? EMPTY}
          partTypes={partTypes.data ?? EMPTY}
          defaultGroupId={parts.data?.find((p) => p.code === viewing)?.groupId}
          nextPartNumber={async (groupId) => (await fetchNextPart(groupId).unwrap()).part}
          onCreate={async (input) => (await createPart(input).unwrap()).code}
          creating={createState.isLoading}
          createError={errorMessage(createState.error, "Couldn't create the part.")}
          onCreated={(code) => {
            setOpen(false);
            navigate(`/viewer/${code}`);
          }}
        />
      ) : null}
    </>
  );
}
