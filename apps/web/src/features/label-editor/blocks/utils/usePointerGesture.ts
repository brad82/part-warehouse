import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { Gesture } from "../../model/geometry";

/** Pixels the pointer must travel before a press counts as a drag. */
const THRESHOLD_PX = 3;

type Start = { x: number; y: number; mode: Gesture["mode"] };

const preventDefault = (e: Event) => e.preventDefault();

/**
 * Stops the page selecting text while a gesture is under way. Safari
 * ignores `user-select` on the elements around the canvas and starts a
 * selection mid-drag, which interrupts the pointer stream.
 */
function blockTextSelection(on: boolean) {
  if (on) {
    window.getSelection()?.removeAllRanges();
    document.addEventListener("selectstart", preventDefault);
  } else {
    document.removeEventListener("selectstart", preventDefault);
  }
}

/**
 * Pointer drags on a canvas element: the body moves it, each resize handle
 * resizes it. `gesture` (mm) is live while dragging, for a preview;
 * `onCommit` gets the final gesture once on release, so a drag is one undo
 * step. Plain clicks fall through to Gutenberg's selection.
 */
export function usePointerGesture(
  scale: number,
  onCommit: (gesture: Gesture) => void,
) {
  const start = useRef<Start | null>(null);
  const [gesture, setGesture] = useState<Gesture | null>(null);

  // Unmounting mid-drag (e.g. undo removes the block) must not leave
  // selection blocked.
  useEffect(() => () => blockTextSelection(false), []);

  const end = (e: PointerEvent<HTMLElement>) => {
    if (!start.current) return;
    start.current = null;
    blockTextSelection(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (gesture) onCommit(gesture);
    setGesture(null);
  };

  /** Pointer handlers for the body ("move") or one resize handle. */
  const bind = (mode: Gesture["mode"]) => ({
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      // A handle only shows on the selected block, so it needs none of the
      // press's defaults (focus, selection). The body keeps them: that
      // press is how Gutenberg selects the block.
      if (mode !== "move") e.preventDefault();
      start.current = { x: e.clientX, y: e.clientY, mode };
      blockTextSelection(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      if (start.current?.mode !== mode) return;
      const dxPx = e.clientX - start.current.x;
      const dyPx = e.clientY - start.current.y;
      if (!gesture && Math.hypot(dxPx, dyPx) < THRESHOLD_PX) return;
      setGesture({
        mode,
        dx: dxPx / scale,
        dy: dyPx / scale,
        shift: e.shiftKey,
      });
    },
    onPointerUp: end,
    onPointerCancel: end,
  });

  return { gesture, bind };
}
