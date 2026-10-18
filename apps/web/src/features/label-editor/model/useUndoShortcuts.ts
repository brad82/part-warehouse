import { useEffect } from "react";
import { useDispatch } from "@wordpress/data";
import { store } from "../store";

/** ⌘Z / ⇧⌘Z (Ctrl on Windows) outside text inputs, which keep their own undo. */
export function useUndoShortcuts() {
  const { undo, redo } = useDispatch(store);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      if (
        (e.target as HTMLElement).closest(
          "input, textarea, [contenteditable='true']",
        )
      )
        return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);
}
