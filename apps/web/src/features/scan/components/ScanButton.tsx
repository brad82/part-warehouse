import { useState } from "react";
import { IconButton, Tooltip } from "@mui/material";
import { ScanLine } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLazyGetPartQuery } from "@features/parts";
import { ScanDialog } from "./ScanDialog";

/** App-bar entry point. Owns the dialog's open state and the part lookup. */
export function ScanButton() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [getPart] = useLazyGetPartQuery();

  return (
    <>
      <Tooltip title="Scan label">
        <IconButton color="inherit" aria-label="Scan label" onClick={() => setOpen(true)}>
          <ScanLine size={20} />
        </IconButton>
      </Tooltip>
      <ScanDialog
        open={open}
        onClose={() => setOpen(false)}
        lookup={async (code) => (await getPart(code)).isSuccess}
        onFound={(code) => {
          setOpen(false);
          navigate(`/parts/${code}`);
        }}
      />
    </>
  );
}
