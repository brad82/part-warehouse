import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { PreviewColour, PreviewColourCreate } from "@parts-warehouse/shared";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { PreviewColourDialog } from "../components/PreviewColourDialog";

type Props = {
  colours: PreviewColour[];
  loading: boolean;
  error: string | null;
  /** id null = create. Rejects with a readable message. */
  onSave: (id: number | null, input: PreviewColourCreate) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
};

type Dialog =
  | { kind: "edit"; colour: PreviewColour | null }
  | { kind: "delete"; colour: PreviewColour };

const pageStyles = {
  card: { p: 2.5, maxWidth: 560 },
  cardHead: { display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 },
  swatch: (hex: string) => ({
    width: 24,
    height: 24,
    borderRadius: "50%",
    bgcolor: hex,
    border: 1,
    borderColor: "divider",
  }),
  mono: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" },
};

/** The colours the STL viewer offers, matched to parts by name. */
export function PreviewColoursPage({ colours, loading, error, onSave, onDelete }: Props) {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const close = () => setDialog(null);

  return (
    <Box>
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}
      <Paper variant="outlined" sx={pageStyles.card}>
        <Box sx={pageStyles.cardHead}>
          <Typography variant="h3">Preview colours</Typography>
          <Button
            size="small"
            startIcon={<Plus size={16} />}
            onClick={() => setDialog({ kind: "edit", colour: null })}
          >
            Add
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          A part whose Colour matches a name here previews in that colour. Anything else
          previews in Black.
        </Typography>
        {!loading && colours.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 2 }}>
            No colours yet. Every part previews in Black.
          </Typography>
        ) : null}
        <List dense disablePadding>
          {colours.map((c) => (
            <ListItem
              key={c.id}
              disableGutters
              secondaryAction={
                <>
                  <IconButton
                    size="small"
                    aria-label={`Edit ${c.name}`}
                    onClick={() => setDialog({ kind: "edit", colour: c })}
                  >
                    <Pencil size={16} />
                  </IconButton>
                  <IconButton
                    size="small"
                    aria-label={`Delete ${c.name}`}
                    onClick={() => setDialog({ kind: "delete", colour: c })}
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </>
              }
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Box sx={pageStyles.swatch(c.hex)} />
              </ListItemIcon>
              <ListItemText
                primary={c.name}
                secondary={c.hex}
                slotProps={{ secondary: { sx: pageStyles.mono } }}
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      {dialog?.kind === "edit" ? (
        <PreviewColourDialog
          colour={dialog.colour}
          onSave={(input) => onSave(dialog.colour?.id ?? null, input)}
          onClose={close}
        />
      ) : null}
      {dialog?.kind === "delete" ? (
        <ConfirmDialog
          title={`Delete ${dialog.colour.name}?`}
          message={`Parts coloured ${dialog.colour.name} will preview in Black.`}
          confirmLabel="Delete"
          onConfirm={() => onDelete(dialog.colour.id)}
          onClose={close}
        />
      ) : null}
    </Box>
  );
}
