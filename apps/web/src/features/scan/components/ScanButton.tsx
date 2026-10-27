import { useState } from "react";
import { Box, Button } from "@mui/material";
import { alpha, type Theme } from "@mui/material/styles";
import { ScanLine } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLazyGetPartQuery } from "@shared/api/catalogApi";
import { ScanDialog } from "./ScanDialog";

const scanStyles = {
  button: {
    height: 36,
    borderRadius: "8px",
    fontWeight: 600,
    textTransform: "none",
    whiteSpace: "nowrap",
    // contrastText is white on the light-mode bar and dark on the dark-mode one.
    borderColor: (t: Theme) => alpha(t.palette.primary.contrastText, 0.6),
    "&:hover": {
      borderColor: (t: Theme) => t.palette.primary.contrastText,
      bgcolor: (t: Theme) => alpha(t.palette.primary.contrastText, 0.12),
    },
    // Icon only on phones.
    minWidth: { xs: 40, sm: 64 },
    px: { xs: 1, sm: 2 },
    "& .MuiButton-startIcon": { mr: { xs: 0, sm: 1 }, ml: { xs: 0, sm: -0.5 } },
  },
  label: { display: { xs: "none", sm: "inline" } },
};

/** App-bar entry point. Owns the dialog's open state and the part lookup. */
export function ScanButton() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [getPart] = useLazyGetPartQuery();

  return (
    <>
      <Button
        variant="outlined"
        color="inherit"
        aria-label="Scan label"
        startIcon={<ScanLine size={18} />}
        onClick={() => setOpen(true)}
        sx={scanStyles.button}
      >
        <Box component="span" sx={scanStyles.label}>
          Scan
        </Box>
      </Button>
      <ScanDialog
        open={open}
        onClose={() => setOpen(false)}
        lookup={async (code) => (await getPart(code)).isSuccess}
        onFound={(code) => {
          setOpen(false);
          navigate(`/viewer/${code}`);
        }}
      />
    </>
  );
}
