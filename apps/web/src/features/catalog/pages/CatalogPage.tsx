import { useMemo, useState } from "react";
import { Alert, Box, Chip, Snackbar } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { ATTR, isNumericAttribute, type AttributeDef, type PartUpdate } from "@snowcat/shared";
import { attributeLabel, formatMinutes } from "@features/parts";
import type { CatalogRow } from "../model/buildRows";
import { rowUpdate } from "../model/rowUpdate";

type Props = {
  rows: CatalogRow[];
  attributeDefs: AttributeDef[];
  loading: boolean;
  error: string | null;
  onSelect: (code: string) => void;
  onUpdate: (code: string, update: PartUpdate) => Promise<void>;
};

const mono = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };

const formatGrams = (g: number | null) => (g == null ? "–" : `${Math.round(g)} g`);
const cad = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

/** Attribute columns shown until the user changes the column picker. */
const VISIBLE_ATTRIBUTES: string[] = [ATTR.colour, ATTR.material, ATTR.printTimeMin];

const attributeField = (key: string) => `attr:${key}`;

function attributeFormatter(def: AttributeDef) {
  if (def.key === ATTR.printTimeMin) return (v: number | null) => formatMinutes(v);
  if (def.key === ATTR.filamentG) return formatGrams;
  if (def.dataType === "currency") {
    return (v: number | null) => (v == null ? "" : cad.format(v));
  }
  return undefined;
}

/** One column per attribute definition, read from `row.attributes`. */
function attributeColumns(defs: AttributeDef[]): GridColDef<CatalogRow>[] {
  return defs.map((def) => ({
    field: attributeField(def.key),
    headerName: def.dataType === "currency" ? def.label : attributeLabel(def),
    type: isNumericAttribute(def) ? "number" : "string",
    width: def.key === ATTR.filePath ? 240 : 120,
    valueGetter: (_value, row) => row.attributes[def.key] ?? null,
    valueFormatter: attributeFormatter(def),
  }));
}

const leadingColumns: GridColDef<CatalogRow>[] = [
  {
    field: "code",
    headerName: "Code",
    width: 130,
    renderCell: ({ value }) => <Box sx={mono}>{value}</Box>,
  },
  { field: "name", headerName: "Name", flex: 1, minWidth: 220 },
  { field: "subassembly", headerName: "Sub-assembly", width: 160 },
  { field: "group", headerName: "Group", width: 200 },
  { field: "partType", headerName: "Type", width: 100 },
];

const trailingColumns: GridColDef<CatalogRow>[] = [
  { field: "qtyPerBuild", headerName: "Qty/build", type: "number", width: 95 },
  {
    field: "onHand",
    headerName: "On hand",
    type: "number",
    width: 90,
    editable: true,
    cellClassName: "editable",
  },
  { field: "remaining", headerName: "Still needed", type: "number", width: 105 },
  {
    field: "totalPrintTimeMin",
    headerName: "Build time",
    type: "number",
    width: 105,
    valueFormatter: (v: number | null) => formatMinutes(v),
  },
  {
    field: "totalFilamentG",
    headerName: "Build filament",
    type: "number",
    width: 120,
    valueFormatter: formatGrams,
  },
  {
    field: "status",
    headerName: "Status",
    type: "singleSelect",
    valueOptions: [
      { value: "planned", label: "Planned" },
      { value: "completed", label: "Completed" },
    ],
    width: 115,
    editable: true,
    cellClassName: "editable",
    renderCell: ({ value }) => (
      <Chip
        size="small"
        label={value === "completed" ? "Completed" : "Planned"}
        color={value === "completed" ? "success" : "default"}
      />
    ),
  },
  { field: "revision", headerName: "Rev", type: "number", width: 70 },
  { field: "notes", headerName: "Notes", width: 240 },
  { field: "updatedAt", headerName: "Updated", width: 180 },
];

function hiddenByDefault(defs: AttributeDef[]) {
  return {
    revision: false,
    notes: false,
    updatedAt: false,
    totalFilamentG: false,
    ...Object.fromEntries(
      defs
        .filter((d) => !VISIBLE_ATTRIBUTES.includes(d.key))
        .map((d) => [attributeField(d.key), false]),
    ),
  };
}

const pageStyles = {
  root: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", p: 2, gap: 2 },
  grid: { flex: 1, minHeight: 0 },
  dataGrid: {
    "& .MuiDataGrid-row": { cursor: "pointer" },
    "& .MuiDataGrid-cell.editable": { cursor: "cell", bgcolor: "action.hover" },
  },
};

/**
 * Whole catalog as a sortable, filterable grid. Clicking a cell opens the
 * part; double-clicking On hand or Status edits it in place.
 */
export function CatalogPage({
  rows,
  attributeDefs,
  loading,
  error,
  onSelect,
  onUpdate,
}: Props) {
  const [saveError, setSaveError] = useState<string | null>(null);
  const columns = useMemo(
    () => [...leadingColumns, ...attributeColumns(attributeDefs), ...trailingColumns],
    [attributeDefs],
  );

  return (
    <Box sx={pageStyles.root}>
      {error && <Alert severity="error">{error}</Alert>}
      <Box sx={pageStyles.grid}>
        <DataGrid
          // initialState is read once; remount when the definitions arrive.
          key={attributeDefs.length > 0 ? "with-attributes" : "loading"}
          rows={rows}
          columns={columns}
          getRowId={(row) => row.code}
          loading={loading}
          density="compact"
          showToolbar
          disableRowSelectionOnClick
          onCellClick={({ row, colDef }) => {
            if (!colDef.editable) onSelect(row.code);
          }}
          processRowUpdate={async (next: CatalogRow, prev: CatalogRow) => {
            const update = rowUpdate(next, prev);
            if (update) await onUpdate(next.code, update);
            return next;
          }}
          onProcessRowUpdateError={(e: Error) => setSaveError(e.message)}
          initialState={{
            columns: { columnVisibilityModel: hiddenByDefault(attributeDefs) },
            sorting: { sortModel: [{ field: "code", sort: "asc" }] },
          }}
          pageSizeOptions={[50, 100]}
          sx={pageStyles.dataGrid}
        />
      </Box>
      <Snackbar
        open={saveError != null}
        autoHideDuration={5000}
        onClose={() => setSaveError(null)}
      >
        <Alert severity="error" onClose={() => setSaveError(null)}>
          {saveError}
        </Alert>
      </Snackbar>
    </Box>
  );
}
