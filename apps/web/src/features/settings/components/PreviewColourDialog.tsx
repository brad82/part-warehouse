import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import type { PreviewColour, PreviewColourCreate } from "@snowcat/shared";

type Props = {
  colour: PreviewColour | null;
  onSave: (input: PreviewColourCreate) => Promise<void>;
  onClose: () => void;
};

const HEX = /^#[0-9a-f]{6}$/i;

const dialogStyles = {
  hexRow: { display: "flex", gap: 1.5, alignItems: "center", mt: 2 },
  picker: {
    width: 44,
    height: 40,
    p: 0,
    border: 0,
    bgcolor: "transparent",
    cursor: "pointer",
    flexShrink: 0,
  },
};

/** Add or edit a preview colour: a name parts match on, plus its hex. */
export function PreviewColourDialog({ colour, onSave, onClose }: Props) {
  const [name, setName] = useState(colour?.name ?? "");
  const [hex, setHex] = useState(colour?.hex ?? "#808080");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hexValid = HEX.test(hex);
  const valid = name.trim() !== "" && hexValid;

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{colour ? "Edit colour" : "New colour"}</DialogTitle>
      <Box
        component="form"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          if (!valid) return;
          setBusy(true);
          try {
            await onSave({ name: name.trim(), hex });
            onClose();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <DialogContent>
          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : null}
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Name"
            helperText="Parts whose Colour matches this name preview in it"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ mt: 1 }}
          />
          <Box sx={dialogStyles.hexRow}>
            <Box
              component="input"
              type="color"
              aria-label="Pick colour"
              value={hexValid ? hex.toLowerCase() : "#000000"}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHex(e.target.value)}
              sx={dialogStyles.picker}
            />
            <TextField
              fullWidth
              size="small"
              label="Hex"
              value={hex}
              error={!hexValid}
              helperText={hexValid ? " " : "Like #f1c40f"}
              onChange={(e) => setHex(e.target.value.trim())}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!valid} loading={busy}>
            Save
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
