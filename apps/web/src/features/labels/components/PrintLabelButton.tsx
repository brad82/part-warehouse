import { useState } from "react";
import { Button } from "@mui/material";
import { Printer } from "lucide-react";
import type { Part } from "@parts-warehouse/shared";
import { LabelDialog } from "./LabelDialog";

export function PrintLabelButton({ part }: { part: Part }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outlined" startIcon={<Printer size={16} />} onClick={() => setOpen(true)}>
        Print label
      </Button>
      {open ? <LabelDialog part={part} open={open} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
