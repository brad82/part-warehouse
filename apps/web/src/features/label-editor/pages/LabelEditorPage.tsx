import "./labelCreator.css";
import { useSelect } from "@wordpress/data";
import { EditorCanvas } from "../components/EditorCanvas";
import { EditorHeader } from "../components/EditorHeader";
import { EditorShell } from "../components/EditorShell";
import { LayersSidebar } from "../components/LayersSidebar";
import { SettingsSidebar } from "../components/SettingsSidebar";
import { StatusBar } from "../components/StatusBar";
import { store } from "../store";

/**
 * Label template editor laid out like the WordPress block editor: top bar,
 * Layers left, Template/Block settings right, status bar below.
 */
export function LabelCreatorPage() {
  const { layersOpen, settingsOpen } = useSelect(
    (select) => ({
      layersOpen: select(store).isPanelOpen("layers"),
      settingsOpen: select(store).isPanelOpen("settings"),
    }),
    [],
  );
  return (
    <EditorShell>
      <EditorHeader />
      <div className="label-editor__body">
        {layersOpen ? <LayersSidebar /> : null}
        <EditorCanvas />
        {settingsOpen ? <SettingsSidebar /> : null}
      </div>
      <StatusBar />
    </EditorShell>
  );
}
