import { store as blockEditorStore } from "@wordpress/block-editor";
import {
  __experimentalGetBlockLabel as getBlockLabel,
  getBlockType,
} from "@wordpress/blocks";
import { Button } from "@wordpress/components";
import { useDispatch, useSelect } from "@wordpress/data";
import { lineSolid, plus } from "@wordpress/icons";
import { LABEL_BLOCK } from "../model/convert";
import { PX_PER_MM } from "../model/zoom";
import { store } from "../store";

type BlockEditorSelect = {
  getSelectedBlock: () => {
    name: string;
    attributes: Record<string, unknown>;
  } | null;
};

/** Breadcrumb of the selection; "Label" clears it. */
function Breadcrumb() {
  const block = useSelect(
    (select) =>
      (
        select(blockEditorStore) as unknown as BlockEditorSelect
      ).getSelectedBlock(),
    [],
  );
  const { clearSelectedBlock } = useDispatch(blockEditorStore) as unknown as {
    clearSelectedBlock: () => void;
  };
  const type = block ? getBlockType(block.name) : null;
  if (!block || !type) {
    return (
      <nav className="label-editor__breadcrumb" aria-label="Selection">
        <span className="is-current">Label</span>
      </nav>
    );
  }
  return (
    <nav className="label-editor__breadcrumb" aria-label="Selection">
      <button type="button" onClick={clearSelectedBlock}>
        Label
      </button>
      <span aria-hidden>›</span>
      <span className="is-current">
        {type.title}
        {block.name === LABEL_BLOCK.text
          ? `: ${getBlockLabel(type, block.attributes, "list-view")}`
          : null}
      </span>
    </nav>
  );
}

/** − 100% + ; the percentage resets to fit. */
function ZoomControls() {
  const { scale, isFit } = useSelect(
    (select) => ({
      scale: select(store).getScale(),
      isFit: select(store).isZoomFit(),
    }),
    [],
  );
  const { zoomIn, zoomOut, zoomToFit } = useDispatch(store);
  return (
    <div className="label-editor__zoom">
      <Button
        size="small"
        icon={lineSolid}
        label="Zoom out"
        onClick={zoomOut}
      />
      <Button
        size="small"
        variant="tertiary"
        label={isFit ? "Fitted to window" : "Zoom to fit"}
        onClick={zoomToFit}
        className="label-editor__zoom-value"
      >
        {Math.round((scale / PX_PER_MM) * 100)}%
      </Button>
      <Button size="small" icon={plus} label="Zoom in" onClick={zoomIn} />
    </div>
  );
}

const mm = (n: number) => `${+n.toFixed(1)}`;

/** Bottom bar: selection, save state, label facts, zoom. */
export function StatusBar() {
  const { notice, dirty, meta, count } = useSelect(
    (select) => ({
      notice: select(store).getNotice(),
      dirty: select(store).isDirty(),
      meta: select(store).getMeta(),
      count: select(store).getBlocks().length,
    }),
    [],
  );
  const status = notice || (dirty ? "Unsaved changes" : "");
  return (
    <footer className="label-editor__footer">
      <Breadcrumb />
      <span className="label-editor__footer-spacer" />
      {status ? (
        <span className="label-editor__footer-status">{status}</span>
      ) : null}
      <span>
        {mm(meta.widthMm)} × {mm(meta.heightMm)} mm
      </span>
      <span>
        {count} element{count === 1 ? "" : "s"}
      </span>
      <ZoomControls />
    </footer>
  );
}
