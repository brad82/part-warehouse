import { useState } from "react";
import {
  Alert,
  Box,
  Chip,
  IconButton,
  LinearProgress,
  ListItemText,
  MenuItem,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { RefreshCw } from "lucide-react";
import type { Printer } from "@parts-warehouse/shared";

type Props = {
  printers: Printer[];
  /** The saved label printer; null: the browser prints. */
  labelPrinter: string | null;
  loading: boolean;
  error: string | null;
  /** Rejects with a readable message. */
  onSelectLabelPrinter: (name: string | null) => Promise<void>;
  onRefresh: () => void;
};

const NONE = "";

const pageStyles = {
  card: { p: 2.5, maxWidth: 560 },
  cardHead: { display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 },
  status: { display: "flex", gap: 1, alignItems: "center", mt: 1.5 },
};

const isReady = (p: Printer) => p.enabled && (p.status === "idle" || p.status === "printing");

/** Which of the API machine's printers labels go to. */
export function PrintersPage({
  printers,
  labelPrinter,
  loading,
  error,
  onSelectLabelPrinter,
  onRefresh,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const current = printers.find((p) => p.name === labelPrinter) ?? null;

  const select = async (value: string) => {
    setSaving(true);
    setSaveError(null);
    try {
      await onSelectLabelPrinter(value === NONE ? null : value);
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}
      <Paper variant="outlined" sx={pageStyles.card}>
        <Box sx={pageStyles.cardHead}>
          <Typography variant="h3">Label printer</Typography>
          <Tooltip title="Refresh printers">
            <IconButton size="small" aria-label="Refresh printers" onClick={onRefresh}>
              <RefreshCw size={16} />
            </IconButton>
          </Tooltip>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Labels print straight to this printer on the machine running the server. With
          none, Print opens the label PDF in a new tab to print from the browser.
        </Typography>
        {loading ? <LinearProgress sx={{ mb: 2 }} /> : null}
        <TextField
          select
          fullWidth
          label="Print labels on"
          value={labelPrinter ?? NONE}
          disabled={loading || saving}
          onChange={(e) => select(e.target.value)}
        >
          <MenuItem value={NONE}>None (print from the browser)</MenuItem>
          {printers.map((p) => (
            <MenuItem key={p.name} value={p.name}>
              <ListItemText primary={p.name} secondary={p.status} />
            </MenuItem>
          ))}
          {labelPrinter && !current ? (
            // Saved, but the server can't see it now (unplugged, renamed).
            <MenuItem value={labelPrinter}>{labelPrinter}</MenuItem>
          ) : null}
        </TextField>
        {saveError ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {saveError}
          </Alert>
        ) : null}
        {labelPrinter && !loading ? (
          current ? (
            <Box sx={pageStyles.status}>
              <Typography variant="body2" color="text.secondary">
                Status
              </Typography>
              <Chip
                size="small"
                label={current.status}
                color={isReady(current) ? "success" : "warning"}
              />
            </Box>
          ) : (
            <Alert severity="warning" sx={{ mt: 2 }}>
              The server can't see {labelPrinter} right now. Check it's connected, or pick
              another printer.
            </Alert>
          )
        ) : null}
        {!loading && printers.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            The server has no printers. Add one in its system settings, then refresh.
          </Alert>
        ) : null}
      </Paper>
    </Box>
  );
}
