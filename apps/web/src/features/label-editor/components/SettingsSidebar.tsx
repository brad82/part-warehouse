import { useEffect, useState } from "react";
import {
  BlockInspector,
  store as blockEditorStore,
} from "@wordpress/block-editor";
import { useDispatch, useSelect } from "@wordpress/data";
import { store } from "../store";
import { SidebarHeader } from "./SidebarHeader";
import { TemplatePanel } from "./TemplatePanel";

const TABS = [
  { id: "template", label: "Template" },
  { id: "block", label: "Block" },
];

/**
 * Right panel: the template's settings or the selected block's inspector.
 * Follows the selection, like Gutenberg's Page/Block tabs.
 */
export function SettingsSidebar() {
  const selected = useSelect(
    (select) =>
      (
        select(blockEditorStore) as unknown as {
          getSelectedBlockClientId: () => string | null;
        }
      ).getSelectedBlockClientId(),
    [],
  );
  const { togglePanel } = useDispatch(store);
  const [tab, setTab] = useState(selected ? "block" : "template");
  useEffect(() => setTab(selected ? "block" : "template"), [selected]);

  return (
    <aside className="label-editor__sidebar is-end" aria-label="Settings">
      <SidebarHeader
        tabs={TABS}
        active={tab}
        onSelect={setTab}
        onClose={() => togglePanel("settings")}
      />
      <div className="label-editor__sidebar-body">
        {tab === "template" ? <TemplatePanel /> : <BlockInspector />}
      </div>
    </aside>
  );
}
