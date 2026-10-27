import { Box, Button, IconButton } from "@mui/material";
import { ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import type { Taxonomy } from "@parts-warehouse/shared";
import { CHILD_TAXONOMY, TAXONOMY_LABELS, countLabel } from "../model/taxonomy";
import type { VisibleRow } from "../model/visibleRows";

const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
/** Row geometry, px. The page's column header lines up with it. */
export const ROW_PAD = 20;
const INDENT = 28;
export const TOGGLE = 32;
export const PARTS_COL = 64;

const rowStyles = {
  row: (depth: number) => ({
    display: "flex",
    alignItems: "center",
    gap: 1,
    minHeight: 44,
    borderTop: 1,
    borderColor: "divider",
    pl: `${ROW_PAD + depth * INDENT}px`,
    pr: `${ROW_PAD}px`,
    "&:hover": { bgcolor: "action.hover" },
    "& .row-actions": { opacity: 0, transition: "opacity 120ms" },
    "&:hover .row-actions, &:focus-within .row-actions": { opacity: 1 },
    "@media (hover: none)": { "& .row-actions": { opacity: 1 } },
  }),
  iconButton: {
    width: TOGGLE,
    height: TOGGLE,
    borderRadius: "6px",
    flexShrink: 0,
  },
  chevron: (open: boolean) => ({
    display: "flex",
    transform: open ? "rotate(90deg)" : "none",
    transition: "transform 120ms",
  }),
  label: {
    flexGrow: 1,
    minWidth: 0,
    display: "flex",
    alignItems: "baseline",
    flexWrap: "wrap",
    columnGap: 1.5,
    rowGap: 0.25,
    py: 1,
  },
  code: {
    fontFamily: MONO,
    fontSize: 13,
    color: "text.secondary",
    minWidth: 64,
  },
  summary: { fontSize: 12, color: "text.secondary" },
  badge: {
    fontSize: 11,
    fontWeight: 600,
    color: "text.secondary",
    border: 1,
    borderColor: "divider",
    borderRadius: 999,
    px: 1,
    py: "1px",
  },
  actions: { display: "flex", alignItems: "center", gap: 0.25, flexShrink: 0 },
  addChild: { minHeight: 32, borderRadius: "6px", px: 1.25, fontSize: 13 },
  parts: (row: VisibleRow) => ({
    flexShrink: 0,
    width: PARTS_COL,
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
    fontWeight: row.grouping.taxonomy === "group" ? 400 : 600,
    color: row.parts === 0 ? "text.disabled" : "text.primary",
  }),
};

type RowProps = {
  row: VisibleRow;
  searching: boolean;
  onToggle: () => void;
  onAdd: (taxonomy: Taxonomy) => void;
  onRename: () => void;
  onDelete: () => void;
};

/** One tree row: toggle, code and name, hover actions, part count. */
export function BomStructureRow({
  row,
  searching,
  onToggle,
  onAdd,
  onRename,
  onDelete,
}: RowProps) {
  const { grouping: g, depth, children, parts, open, context } = row;
  const child = CHILD_TAXONOMY[g.taxonomy];
  const empty = children === 0 && parts === 0;
  const title = `${g.id} ${g.name}`;

  return (
    <Box component="li" sx={rowStyles.row(depth)}>
      {children > 0 ? (
        <IconButton
          size="small"
          aria-expanded={open}
          aria-label={`${open ? "Collapse" : "Expand"} ${title}`}
          onClick={searching ? undefined : onToggle}
          sx={rowStyles.iconButton}
        >
          <Box component="span" sx={rowStyles.chevron(open)}>
            <ChevronRight size={16} />
          </Box>
        </IconButton>
      ) : (
        <Box
          component="span"
          aria-hidden="true"
          sx={{ width: TOGGLE, flexShrink: 0 }}
        />
      )}
      <Box sx={rowStyles.label}>
        <Box component="span" sx={rowStyles.code}>
          {g.id}
        </Box>
        <Box
          component="span"
          sx={{
            fontWeight: g.taxonomy === "group" ? 400 : 600,
            color: context ? "text.secondary" : "text.primary",
          }}
        >
          {g.name}
        </Box>
        {child && children > 0 && !open ? (
          <Box component="span" sx={rowStyles.summary}>
            {countLabel(children, child)}
          </Box>
        ) : null}
        {empty ? (
          <Box component="span" sx={rowStyles.badge}>
            Empty
          </Box>
        ) : null}
      </Box>
      <Box className="row-actions" sx={rowStyles.actions}>
        {child ? (
          <Button
            variant="text"
            size="small"
            startIcon={<Plus size={14} />}
            aria-label={`Add ${TAXONOMY_LABELS[child].toLowerCase()} to ${title}`}
            onClick={() => onAdd(child)}
            sx={rowStyles.addChild}
          >
            {TAXONOMY_LABELS[child]}
          </Button>
        ) : null}
        <IconButton
          size="small"
          aria-label={`Rename ${g.id}`}
          title="Rename"
          onClick={onRename}
          sx={rowStyles.iconButton}
        >
          <Pencil size={16} />
        </IconButton>
        {empty ? (
          <IconButton
            size="small"
            color="error"
            aria-label={`Delete ${g.id}`}
            title="Delete"
            onClick={onDelete}
            sx={rowStyles.iconButton}
          >
            <Trash2 size={16} />
          </IconButton>
        ) : null}
      </Box>
      <Box component="span" sx={rowStyles.parts(row)}>
        {parts}
      </Box>
    </Box>
  );
}
