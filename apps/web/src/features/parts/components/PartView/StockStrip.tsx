import {
  Alert,
  Box,
  Button,
  LinearProgress,
  Paper,
  Snackbar,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { Minus, Plus } from "lucide-react";
import type { PartStatus } from "@snowcat/shared";
import { usePartStockStrip } from "../../PartsProvider";

const stripStyles = {
  root: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: 4,
    rowGap: 2,
    p: 2,
    mb: 3,
  },
  caption: {
    display: "block",
    mb: 0.75,
    color: "text.secondary",
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    lineHeight: 1.2,
  },
  stepper: { display: "flex", alignItems: "center", gap: 1 },
  stepButton: { minWidth: 44, width: 44, height: 44, p: 0 },
  input: {
    width: 72,
    "& .MuiInputBase-root": { height: 44 },
    "& input": {
      textAlign: "center",
      fontSize: "1.375rem",
      fontWeight: 700,
      fontVariantNumeric: "tabular-nums",
      px: 0.5,
    },
  },
  coverage: { flex: "1 1 220px", minWidth: 0 },
  coverageText: { fontWeight: 700, mb: 1, fontVariantNumeric: "tabular-nums" },
  bar: { height: 8, borderRadius: 4 },
  toggle: { "& .MuiToggleButton-root": { px: 2, height: 44, textTransform: "none" } },
};

function Caption({ children }: { children: string }) {
  return (
    <Typography variant="caption" sx={stripStyles.caption}>
      {children}
    </Typography>
  );
}

/** Full-width strip under the header: on hand, build coverage and status, saved as you go. */
export function StockStrip() {
  const {
    part,
    onHandText,
    onHand,
    qtyPerBuild,
    coverage,
    status,
    error,
    setOnHandText,
    commitOnHand,
    increment,
    decrement,
    changeStatus,
    clearError,
  } = usePartStockStrip();
  if (!part) return null;

  return (
    <Paper variant="outlined" sx={stripStyles.root} aria-label="Stock" component="section">
      <Box>
        <Caption>On hand</Caption>
        <Box sx={stripStyles.stepper}>
          <Button
            variant="outlined"
            aria-label="Remove one"
            sx={stripStyles.stepButton}
            disabled={onHand <= 0}
            onClick={decrement}
          >
            <Minus size={18} />
          </Button>
          <TextField
            size="small"
            value={onHandText}
            onChange={(e) => setOnHandText(e.target.value)}
            onBlur={commitOnHand}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            sx={stripStyles.input}
            slotProps={{
              htmlInput: { "aria-label": "On hand", inputMode: "numeric", pattern: "[0-9]*" },
            }}
          />
          <Button
            variant="contained"
            color="primary"
            aria-label="Add one"
            sx={stripStyles.stepButton}
            onClick={increment}
          >
            <Plus size={18} />
          </Button>
        </Box>
      </Box>

      <Box sx={stripStyles.coverage}>
        <Typography sx={stripStyles.coverageText}>
          {onHand} of {qtyPerBuild} per build
        </Typography>
        <LinearProgress
          variant="determinate"
          color="success"
          value={coverage * 100}
          aria-label="Share of one build on hand"
          sx={stripStyles.bar}
        />
      </Box>

      <Box>
        <Caption>Status</Caption>
        <ToggleButtonGroup
          exclusive
          size="small"
          color="primary"
          value={status}
          aria-label="Status"
          onChange={(_e, next: PartStatus | null) => {
            if (next) changeStatus(next);
          }}
          sx={stripStyles.toggle}
        >
          <ToggleButton value="planned">Planned</ToggleButton>
          <ToggleButton value="completed">Completed</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Snackbar open={error != null} autoHideDuration={5000} onClose={clearError}>
        <Alert severity="error" onClose={clearError}>
          {error}
        </Alert>
      </Snackbar>
    </Paper>
  );
}
