import "@wordpress/components/build-style/style.css";
import "@wordpress/block-editor/build-style/style.css";
import type { ReactNode } from "react";
import {
  BlockEditorKeyboardShortcuts,
  BlockEditorProvider,
} from "@wordpress/block-editor";
import { Popover, SlotFillProvider } from "@wordpress/components";
import { useDispatch, useSelect } from "@wordpress/data";
import { ShortcutProvider } from "@wordpress/keyboard-shortcuts";
import { LABEL_BLOCK } from "../model/convert";
import { useUndoShortcuts } from "../model/useUndoShortcuts";
import { store } from "../store";

const SETTINGS = {
  allowedBlockTypes: Object.values(LABEL_BLOCK),
  hasFixedToolbar: false,
};

/**
 * Gutenberg's providers, bound to the store's blocks: everything inside can
 * use the block editor (selection, inspector fills, toolbars, shortcuts).
 */
export function EditorShell({ children }: { children: ReactNode }) {
  const blocks = useSelect((select) => select(store).getBlocks(), []);
  const { commitBlocks, inputBlocks } = useDispatch(store);
  useUndoShortcuts();

  return (
    // ShortcutProvider renders a div; it carries the editor's column layout.
    <ShortcutProvider className="label-editor">
      <SlotFillProvider>
        <BlockEditorProvider
          value={blocks}
          onInput={inputBlocks}
          onChange={commitBlocks}
          settings={SETTINGS}
        >
          <BlockEditorKeyboardShortcuts.Register />
          {children}
          <Popover.Slot />
        </BlockEditorProvider>
      </SlotFillProvider>
    </ShortcutProvider>
  );
}
