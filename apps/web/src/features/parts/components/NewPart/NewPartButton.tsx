import { useState } from "react";
import { IconButton, Tooltip } from "@mui/material";
import { Plus } from "lucide-react";
import { NewPartDialog } from "./NewPartDialog";

export function NewPartButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Tooltip title="New part">
        <IconButton aria-label="New part" onClick={() => setOpen(true)}>
          <Plus size={20} />
        </IconButton>
      </Tooltip>
      {open ? <NewPartDialog open={open} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
