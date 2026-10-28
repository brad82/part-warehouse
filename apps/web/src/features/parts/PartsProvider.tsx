import { createContext, useContext, useMemo, type ReactNode } from "react";
import type {
  AttributeDef,
  Grouping,
  Part,
  PartType,
  PartUpdate,
  PreviewColour,
} from "@parts-warehouse/shared";
import { defsForType } from "@shared/lib/attributeFields";
import type { PartImageActions } from "./model/partImageActions";
import { buildTree } from "./model/buildTree";
import { usePartDraft, type PartDraft } from "./model/usePartDraft";
import { usePartStock, type PartStock } from "./model/usePartStock";
import { useTreeExpansion } from "./model/useTreeExpansion";

type Props = {
  children: ReactNode;
  groupings: Grouping[];
  parts: Part[];
  partTypes: PartType[];
  attributeDefs: AttributeDef[];
  /** STL viewer colours, matched to parts by colour name. */
  previewColours: PreviewColour[];
  partsLoading: boolean;
  search: string;
  onSearchChange: (q: string) => void;
  selected: Part | undefined;
  selectedCode: string | undefined;
  selectedLoading: boolean;
  selectedError: string | null;
  onSelect: (code: string) => void;
  saving: boolean;
  saveError: string | null;
  onSave: (update: PartUpdate) => Promise<void>;
  /**
   * Saves one change at once, outside the form (stock strip, rename).
   * Throws a readable Error on failure.
   */
  onSaveNow: (update: PartUpdate) => Promise<void>;
  /** Upload / scrape / swap / remove the selected part's image. */
  imageActions: PartImageActions;
};

type PartsContextValue = Omit<Props, "children"> & {
  tree: ReturnType<typeof buildTree>;
  expansion: ReturnType<typeof useTreeExpansion>;
  draft: PartDraft;
  stock: PartStock;
};

const PartsContext = createContext<PartsContextValue | null>(null);

/**
 * Composition root for the parts screen: builds the tree, owns expansion,
 * the edit draft and the stock strip, and exposes them via selector hooks. No Redux dependency;
 * data and callbacks arrive as props from PartsContainer.
 */
export function PartsProvider({ children, ...props }: Props) {
  const tree = useMemo(
    () => buildTree(props.groupings, props.parts),
    [props.groupings, props.parts],
  );
  const expansion = useTreeExpansion(
    tree,
    props.search.trim() !== "",
    props.groupings,
    props.selected,
  );
  const draft = usePartDraft(props.selected, props.attributeDefs, props.onSave);
  const stock = usePartStock(props.selected, props.onSaveNow);

  return (
    <PartsContext.Provider value={{ ...props, tree, expansion, draft, stock }}>
      {children}
    </PartsContext.Provider>
  );
}

function usePartsContext() {
  const value = useContext(PartsContext);
  if (!value) {
    throw new Error("Parts hooks must be used within a PartsProvider");
  }
  return value;
}

export function usePartsSidebar() {
  const ctx = usePartsContext();
  return {
    tree: ctx.tree,
    loading: ctx.partsLoading,
    search: ctx.search,
    onSearchChange: ctx.onSearchChange,
    expanded: ctx.expansion.expanded,
    setExpanded: ctx.expansion.setExpanded,
    selectedCode: ctx.selectedCode,
    onSelect: ctx.onSelect,
  };
}

export function useSelectedPart() {
  const ctx = usePartsContext();
  return {
    part: ctx.selected,
    code: ctx.selectedCode,
    loading: ctx.selectedLoading,
    error: ctx.selectedError,
    groupings: ctx.groupings,
    previewColours: ctx.previewColours,
  };
}

export function usePartForm() {
  const { draft, saving, saveError, selected, partTypes, attributeDefs } =
    usePartsContext();
  const partTypeId = draft.values?.partTypeId;
  const defs = useMemo(
    () => (partTypeId ? defsForType(attributeDefs, partTypeId) : []),
    [attributeDefs, partTypeId],
  );
  return { ...draft, part: selected, saving, saveError, partTypes, defs };
}

export function usePartImage() {
  const { selected, imageActions } = usePartsContext();
  return { part: selected, ...imageActions };
}

export function usePartStockStrip() {
  return usePartsContext().stock;
}

export function useRenamePart() {
  const { onSaveNow } = usePartsContext();
  return { rename: (name: string) => onSaveNow({ name }) };
}
