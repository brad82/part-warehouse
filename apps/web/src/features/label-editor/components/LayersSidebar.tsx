import { __experimentalListView as ListView } from "@wordpress/block-editor";
import { useDispatch } from "@wordpress/data";
import { store } from "../store";
import { SidebarHeader } from "./SidebarHeader";

/** Left panel: every element, front to back. */
export function LayersSidebar() {
  const { togglePanel } = useDispatch(store);
  return (
    <aside className="label-editor__sidebar is-start" aria-label="Layers">
      <SidebarHeader
        tabs={[{ id: "layers", label: "Layers" }]}
        active="layers"
        onClose={() => togglePanel("layers")}
      />
      <div className="label-editor__sidebar-body">
        <p className="label-editor__sidebar-hint">
          Front to back. Drag to restack.
        </p>
        <ListView showBlockMovers description="Label elements, front to back" />
      </div>
    </aside>
  );
}
