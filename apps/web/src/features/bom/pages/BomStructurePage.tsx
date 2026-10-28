import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { Plus, Search } from "lucide-react";
import type { Grouping, Taxonomy } from "@parts-warehouse/shared";
import { ConfirmDialog } from "@shared/components/ConfirmDialog";
import {
  BomStructureRow,
  PARTS_COL,
  ROW_PAD,
  TOGGLE,
} from "../components/BomStructureRow";
import { GroupingDialog } from "../components/GroupingDialog";
import type { GroupingRow } from "../model/groupingRows";
import { nextGroupingId } from "../model/nextGroupingId";
import { useBomExpansion } from "../model/useBomExpansion";
import { visibleRows } from "../model/visibleRows";

type Props = {
  groupings: Grouping[];
  rows: GroupingRow[];
  loading: boolean;
  error: string | null;
  /** Rejects with a readable message. */
  onCreate: (input: {
    id: string;
    name: string;
    taxonomy: Taxonomy;
    parentId: string | null;
  }) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

type Dialog =
  | { kind: "create"; taxonomy: Taxonomy; parentId: string | null }
  | { kind: "rename"; grouping: Grouping }
  | { kind: "delete"; grouping: Grouping };

const pageStyles = {
  card: { maxWidth: 760, overflow: "hidden" },
  top: { px: 2.5, pt: 2.5 },
  cardHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 1.5,
    mb: 0.75,
  },
  addModule: { minHeight: 36 },
  toolbar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 1,
    pb: 1.5,
  },
  filter: { flex: "1 1 260px", minWidth: 0 },
  status: { display: "block", color: "text.secondary", pb: 1 },
  columns: {
    display: "flex",
    gap: 1,
    pl: `${ROW_PAD + TOGGLE + 8}px`,
    pr: `${ROW_PAD}px`,
    pb: 0.75,
    fontSize: 12,
    fontWeight: 600,
    color: "text.secondary",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  list: { listStyle: "none", m: 0, p: 0, pb: 1 },
  noMatch: {
    py: 4,
    px: 2.5,
    textAlign: "center",
    borderTop: 1,
    borderColor: "divider",
  },
};

/** The BOM's modules, sub-assemblies and groups: add, rename, delete when empty. */
export function BomStructurePage({
  groupings,
  rows,
  loading,
  error,
  onCreate,
  onRename,
  onDelete,
}: Props) {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [query, setQuery] = useState("");
  const { expanded, toggle, expandAll, collapseAll } = useBomExpansion(rows);
  const visible = visibleRows(rows, expanded, query);
  const close = () => setDialog(null);
  const create = (taxonomy: Taxonomy, parentId: string | null) =>
    setDialog({ kind: "create", taxonomy, parentId });

  return (
    <Box>
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}
      <Paper variant="outlined" sx={pageStyles.card}>
        <Box sx={pageStyles.top}>
          <Box sx={pageStyles.cardHead}>
            <Typography variant="h3">BOM structure</Typography>
            <Button
              size="small"
              startIcon={<Plus size={16} />}
              onClick={() => create("module", null)}
              sx={pageStyles.addModule}
            >
              Add module
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Modules hold sub-assemblies, which hold groups, which hold parts.
            New groups appear in New Part. Only empty levels can be deleted.
          </Typography>
          <Box sx={pageStyles.toolbar}>
            <TextField
              type="search"
              size="small"
              placeholder="Filter by code or name, e.g. A03 or frame"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              sx={pageStyles.filter}
              slotProps={{
                htmlInput: {
                  "aria-label": "Filter by code or name",
                  autoComplete: "off",
                },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={16} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button
              variant="text"
              size="small"
              onClick={() => {
                setQuery("");
                expandAll();
              }}
            >
              Expand all
            </Button>
            <Button
              variant="text"
              size="small"
              onClick={() => {
                setQuery("");
                collapseAll();
              }}
            >
              Collapse all
            </Button>
          </Box>
          {visible.searching && visible.matches > 0 ? (
            <Typography variant="caption" role="status" sx={pageStyles.status}>
              {visible.matches} {visible.matches === 1 ? "match" : "matches"},
              shown with their parents
            </Typography>
          ) : null}
        </Box>

        {!loading && rows.length === 0 ? (
          <Typography color="text.secondary" sx={{ px: 2.5, pb: 2.5 }}>
            No modules yet. Add one, or run the CSV import.
          </Typography>
        ) : null}

        {visible.rows.length > 0 ? (
          <>
            <Box sx={pageStyles.columns} aria-hidden="true">
              <Box sx={{ flexGrow: 1 }}>Code · Name</Box>
              <Box sx={{ width: PARTS_COL, textAlign: "right" }}>Parts</Box>
            </Box>
            <Box component="ul" sx={pageStyles.list}>
              {visible.rows.map((row) => (
                <BomStructureRow
                  key={row.grouping.id}
                  row={row}
                  searching={visible.searching}
                  onToggle={() => toggle(row.grouping.id)}
                  onAdd={(taxonomy) => create(taxonomy, row.grouping.id)}
                  onRename={() =>
                    setDialog({ kind: "rename", grouping: row.grouping })
                  }
                  onDelete={() =>
                    setDialog({ kind: "delete", grouping: row.grouping })
                  }
                />
              ))}
            </Box>
          </>
        ) : null}

        {visible.searching && visible.matches === 0 ? (
          <Box sx={pageStyles.noMatch} role="status">
            <Typography sx={{ fontWeight: 600 }}>
              No codes or names match “{query.trim()}”
            </Typography>
            <Button variant="text" onClick={() => setQuery("")}>
              Clear filter
            </Button>
          </Box>
        ) : null}
      </Paper>

      {dialog?.kind === "create" ? (
        <GroupingDialog
          taxonomy={dialog.taxonomy}
          parentId={dialog.parentId}
          grouping={null}
          suggestedId={
            nextGroupingId(groupings, dialog.taxonomy, dialog.parentId) ?? ""
          }
          onSave={(input) =>
            onCreate({
              ...input,
              taxonomy: dialog.taxonomy,
              parentId: dialog.parentId,
            })
          }
          onClose={close}
        />
      ) : null}
      {dialog?.kind === "rename" ? (
        <GroupingDialog
          taxonomy={dialog.grouping.taxonomy}
          parentId={dialog.grouping.parentId}
          grouping={dialog.grouping}
          suggestedId={dialog.grouping.id}
          onSave={({ name }) => onRename(dialog.grouping.id, name)}
          onClose={close}
        />
      ) : null}
      {dialog?.kind === "delete" ? (
        <ConfirmDialog
          title={`Delete ${dialog.grouping.id} ${dialog.grouping.name}?`}
          message="It's empty, so no parts are affected. Its code becomes free to reuse."
          confirmLabel="Delete"
          onConfirm={() => onDelete(dialog.grouping.id)}
          onClose={close}
        />
      ) : null}
    </Box>
  );
}
