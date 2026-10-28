import { useState } from "react";
import { Box, Button } from "@mui/material";
import { Plus } from "lucide-react";
import { useMatch, useNavigate } from "react-router-dom";
import { errorMessage } from "@shared/api/errors";
import {
  useListGroupingsQuery,
  useListPartTypesQuery,
  useListPartsQuery,
} from "@shared/api/catalogApi";
import { useCreatePartMutation, useLazyNextPartNumberQuery } from "../../api/partsApi";
import { NewPartDialog } from "./NewPartDialog";

const EMPTY: never[] = [];

const newPartStyles = {
  button: {
    height: 36,
    borderRadius: "8px",
    fontWeight: 600,
    textTransform: "none",
    whiteSpace: "nowrap",
    bgcolor: "background.paper",
    color: "primary.main",
    boxShadow: "none",
    "&:hover": { bgcolor: "background.paper", opacity: 0.9, boxShadow: "none" },
    // Icon only on phones.
    minWidth: { xs: 40, sm: 64 },
    px: { xs: 1, sm: 2 },
    "& .MuiButton-startIcon": { mr: { xs: 0, sm: 1 }, ml: { xs: 0, sm: -0.5 } },
  },
  label: { display: { xs: "none", sm: "inline" } },
};

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
      <Button
        variant="contained"
        disableElevation
        aria-label="New part"
        startIcon={<Plus size={18} />}
        onClick={() => setOpen(true)}
        sx={newPartStyles.button}
      >
        <Box component="span" sx={newPartStyles.label}>
          New part
        </Box>
      </Button>
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
