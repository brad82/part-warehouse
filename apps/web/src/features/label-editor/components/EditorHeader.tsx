import { Button } from "@wordpress/components";
import { useDispatch, useSelect } from "@wordpress/data";
import {
  chevronLeft,
  drawerRight,
  listView,
  redo,
  undo,
} from "@wordpress/icons";
import { useLabelEditorData } from "../LabelEditorDataProvider";
import { useConfirmDiscard } from "../model/useConfirmDiscard";
import { useTemplatePersistence } from "../model/useTemplatePersistence";
import { store } from "../store";
import { BlockInserter } from "./BlockInserter";
import { OptionsMenu } from "./OptionsMenu";
import { TemplateSwitcher } from "./TemplateSwitcher";

/** Top bar: tools left, template switcher centre, panels and save right. */
export function EditorHeader() {
  const s = useSelect(
    (select) => ({
      canUndo: select(store).canUndo(),
      canRedo: select(store).canRedo(),
      dirty: select(store).isDirty(),
      layersOpen: select(store).isPanelOpen("layers"),
      settingsOpen: select(store).isPanelOpen("settings"),
    }),
    [],
  );
  const actions = useDispatch(store);
  const { save } = useTemplatePersistence();
  const { onExit } = useLabelEditorData();
  const confirmDiscard = useConfirmDiscard();

  return (
    <header className="label-editor__header">
      <div className="label-editor__header-side">
        <Button
          size="compact"
          icon={chevronLeft}
          label="Back to settings"
          onClick={() => confirmDiscard() && onExit()}
        />
        <BlockInserter />
        <Button
          size="compact"
          icon={undo}
          label="Undo"
          shortcut="⌘Z"
          disabled={!s.canUndo}
          accessibleWhenDisabled
          onClick={actions.undo}
        />
        <Button
          size="compact"
          icon={redo}
          label="Redo"
          shortcut="⇧⌘Z"
          disabled={!s.canRedo}
          accessibleWhenDisabled
          onClick={actions.redo}
        />
        <Button
          size="compact"
          icon={listView}
          label="Layers"
          isPressed={s.layersOpen}
          onClick={() => actions.togglePanel("layers")}
        />
      </div>

      <TemplateSwitcher />

      <div className="label-editor__header-side is-end">
        <Button
          size="compact"
          icon={drawerRight}
          label="Settings"
          isPressed={s.settingsOpen}
          onClick={() => actions.togglePanel("settings")}
        />
        <Button
          variant="primary"
          size="compact"
          onClick={save}
          disabled={!s.dirty}
          accessibleWhenDisabled
        >
          {s.dirty ? "Save" : "Saved"}
        </Button>
        <OptionsMenu />
      </div>
    </header>
  );
}
