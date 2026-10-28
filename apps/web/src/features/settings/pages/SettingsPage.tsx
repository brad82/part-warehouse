import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material";
import { DataGrid, GridActionsCellItem, type GridColDef } from "@mui/x-data-grid";
import { Lock, Pencil, Plus, Trash2 } from "lucide-react";
import type { AttributeDef, AttributeDefCreate, PartType } from "@parts-warehouse/shared";
import { AttributeDialog } from "../components/AttributeDialog";
import { ConfirmDialog } from "@shared/components/ConfirmDialog";
import { PartTypeDialog } from "../components/PartTypeDialog";
import { DATA_TYPE_LABELS } from "../model/dataTypes";

type Props = {
  partTypes: PartType[];
  attributeDefs: AttributeDef[];
  loading: boolean;
  error: string | null;
  /** id null = create. Rejects with a readable message. */
  onSavePartType: (id: string | null, name: string) => Promise<void>;
  onDeletePartType: (id: string) => Promise<void>;
  onSaveAttribute: (id: number | null, input: AttributeDefCreate) => Promise<void>;
  onDeleteAttribute: (id: number) => Promise<void>;
};

type Dialog =
  | { kind: "partType"; partType: PartType | null }
  | { kind: "deletePartType"; partType: PartType }
  | { kind: "attribute"; def: AttributeDef | null }
  | { kind: "deleteAttribute"; def: AttributeDef };

const pageStyles = {
  sections: {
    display: "grid",
    gap: 3,
    gridTemplateColumns: { xs: "1fr", lg: "320px 1fr" },
    alignItems: "start",
  },
  card: { p: 2.5 },
  cardHead: { display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 },
  mono: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" },
};

/** Part types and the attributes each one shows. */
export function SettingsPage({
  partTypes,
  attributeDefs,
  loading,
  error,
  onSavePartType,
  onDeletePartType,
  onSaveAttribute,
  onDeleteAttribute,
}: Props) {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const close = () => setDialog(null);
  const typeNames = new Map(partTypes.map((t) => [t.id, t.name]));

  const columns: GridColDef<AttributeDef>[] = [
    {
      field: "label",
      headerName: "Label",
      flex: 1,
      minWidth: 160,
      renderCell: ({ row }) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {row.label}
          {row.system ? (
            <Tooltip title="Built in: key and type are fixed">
              <Lock size={14} />
            </Tooltip>
          ) : null}
        </Box>
      ),
    },
    {
      field: "key",
      headerName: "Key",
      width: 150,
      renderCell: ({ value }) => <Box sx={pageStyles.mono}>{value}</Box>,
    },
    {
      field: "dataType",
      headerName: "Type",
      width: 120,
      valueFormatter: (v: AttributeDef["dataType"]) => DATA_TYPE_LABELS[v],
    },
    { field: "unit", headerName: "Unit", width: 80 },
    {
      field: "options",
      headerName: "Options",
      width: 180,
      valueFormatter: (v: string[] | null) => v?.join(", ") ?? "",
    },
    {
      field: "partTypeIds",
      headerName: "Shown on",
      width: 200,
      sortable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", height: "100%" }}>
          {row.partTypeIds.map((id) => (
            <Chip key={id} size="small" label={typeNames.get(id) ?? id} />
          ))}
        </Box>
      ),
    },
    { field: "sort", headerName: "Order", type: "number", width: 80 },
    {
      field: "actions",
      type: "actions",
      width: 90,
      getActions: ({ row }) => [
        <GridActionsCellItem
          key="edit"
          icon={<Pencil size={16} />}
          label={`Edit ${row.label}`}
          onClick={() => setDialog({ kind: "attribute", def: row })}
        />,
        <GridActionsCellItem
          key="delete"
          icon={<Trash2 size={16} />}
          label={`Delete ${row.label}`}
          disabled={row.system}
          onClick={() => setDialog({ kind: "deleteAttribute", def: row })}
        />,
      ],
    },
  ];

  return (
    <Box>
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Box sx={pageStyles.sections}>
        <Paper variant="outlined" sx={pageStyles.card}>
          <Box sx={pageStyles.cardHead}>
            <Typography variant="h3">Part types</Typography>
            <Button
              size="small"
              startIcon={<Plus size={16} />}
              onClick={() => setDialog({ kind: "partType", partType: null })}
            >
              Add
            </Button>
          </Box>
          <List dense disablePadding>
            {partTypes.map((t) => (
              <ListItem
                key={t.id}
                disableGutters
                secondaryAction={
                  <>
                    <IconButton
                      size="small"
                      aria-label={`Rename ${t.name}`}
                      onClick={() => setDialog({ kind: "partType", partType: t })}
                    >
                      <Pencil size={16} />
                    </IconButton>
                    <IconButton
                      size="small"
                      aria-label={`Delete ${t.name}`}
                      onClick={() => setDialog({ kind: "deletePartType", partType: t })}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </>
                }
              >
                <ListItemText
                  primary={t.name}
                  secondary={`${attributeDefs.filter((d) => d.partTypeIds.includes(t.id)).length} attributes`}
                />
              </ListItem>
            ))}
          </List>
        </Paper>

        <Paper variant="outlined" sx={pageStyles.card}>
          <Box sx={pageStyles.cardHead}>
            <Typography variant="h3">Attributes</Typography>
            <Button
              size="small"
              startIcon={<Plus size={16} />}
              onClick={() => setDialog({ kind: "attribute", def: null })}
            >
              Add
            </Button>
          </Box>
          <DataGrid
            rows={attributeDefs}
            columns={columns}
            loading={loading}
            density="compact"
            autoHeight
            hideFooter
            disableRowSelectionOnClick
            initialState={{ sorting: { sortModel: [{ field: "sort", sort: "asc" }] } }}
          />
        </Paper>
      </Box>

      {dialog?.kind === "partType" ? (
        <PartTypeDialog
          partType={dialog.partType}
          onSave={(name) => onSavePartType(dialog.partType?.id ?? null, name)}
          onClose={close}
        />
      ) : null}
      {dialog?.kind === "deletePartType" ? (
        <ConfirmDialog
          title={`Delete ${dialog.partType.name}?`}
          message="Only a type no part uses can be deleted."
          confirmLabel="Delete"
          onConfirm={() => onDeletePartType(dialog.partType.id)}
          onClose={close}
        />
      ) : null}
      {dialog?.kind === "attribute" ? (
        <AttributeDialog
          def={dialog.def}
          partTypes={partTypes}
          onSave={(input) => onSaveAttribute(dialog.def?.id ?? null, input)}
          onClose={close}
        />
      ) : null}
      {dialog?.kind === "deleteAttribute" ? (
        <ConfirmDialog
          title={`Delete ${dialog.def.label}?`}
          message={`Every part's ${dialog.def.label} value is deleted too. This can't be undone.`}
          confirmLabel="Delete"
          onConfirm={() => onDeleteAttribute(dialog.def.id)}
          onClose={close}
        />
      ) : null}
    </Box>
  );
}
