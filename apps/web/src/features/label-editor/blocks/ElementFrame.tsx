import {
  store as blockEditorStore,
  useBlockEditContext,
  useBlockProps,
} from "@wordpress/block-editor";
import { useDispatch, useSelect } from "@wordpress/data";
import {
  elementBox,
  renderElementSvg,
  type LabelElement,
} from "@snowcat/shared";
import { useCanvasEnv } from "../model/CanvasContext";
import { applyGesture, resizeHandles } from "../model/geometry";
import { usePointerGesture } from "./utils/usePointerGesture";

/**
 * A block's wrapper on the canvas: absolutely placed at the element's box,
 * showing the element's real SVG as `renderLabelSvg` would print it. Drag
 * the body to move it; when selected, drag a handle to resize it.
 */
export function ElementFrame({
  el,
  placeholder,
}: {
  el: LabelElement;
  placeholder?: string;
}) {
  const { scale, part, assets } = useCanvasEnv();
  const { clientId, isSelected } = useBlockEditContext();
  // First block is frontmost (see blocksToElements).
  const zIndex = useSelect(
    (select) => {
      const editor = select(blockEditorStore) as unknown as {
        getBlockIndex: (id: string) => number;
        getBlockCount: () => number;
      };
      return editor.getBlockCount() - editor.getBlockIndex(clientId);
    },
    [clientId],
  );
  const { updateBlockAttributes, __unstableMarkLastChangeAsPersistent } =
    useDispatch(blockEditorStore) as unknown as {
      updateBlockAttributes: (
        id: string,
        attrs: Record<string, unknown>,
      ) => void;
      __unstableMarkLastChangeAsPersistent: () => void;
    };
  const { gesture, bind } = usePointerGesture(scale, (g) => {
    updateBlockAttributes(clientId, applyGesture(el, g));
    // Gutenberg folds repeat edits of the same attributes into one undo
    // step (as for typing); each drag should be its own.
    __unstableMarkLastChangeAsPersistent();
  });

  // While dragging, draw the element as it will be once dropped.
  const shown = gesture
    ? ({ ...el, ...applyGesture(el, gesture) } as LabelElement)
    : el;
  const box = elementBox(shown);
  const svg = renderElementSvg(shown, part, assets);
  const empty = !/<(svg|text|image)\b/.test(svg.slice(svg.indexOf(">") + 1));
  const blockProps = useBlockProps({
    className: gesture ? "label-element is-dragging" : "label-element",
    // Gutenberg's native block drag (reorder) would cancel our pointer drag;
    // reordering lives in the Layers panel.
    draggable: false,
    style: {
      position: "absolute",
      zIndex,
      left: box.x * scale,
      top: box.y * scale,
      width: box.width * scale,
      height: box.height * scale,
    },
  });

  return (
    <div {...blockProps}>
      {empty ? (
        <div className="label-element__placeholder" {...bind("move")}>
          {placeholder ?? "Empty"}
        </div>
      ) : (
        <div
          className="label-element__svg"
          dangerouslySetInnerHTML={{ __html: svg }}
          {...bind("move")}
        />
      )}
      {isSelected
        ? resizeHandles(el).map((handle) => (
            <div
              key={handle}
              className={`label-element__handle is-${handle}`}
              aria-hidden
              {...bind(handle)}
            />
          ))
        : null}
    </div>
  );
}
