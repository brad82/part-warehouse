import { Button } from "@wordpress/components";
import { closeSmall } from "@wordpress/icons";

type Tab = { id: string; label: string };

/** Panel header as in Gutenberg: tabs on the left, close on the right. */
export function SidebarHeader({
  tabs,
  active,
  onSelect,
  onClose,
}: {
  tabs: Tab[];
  active: string;
  onSelect?: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="label-editor__sidebar-header">
      <div role="tablist" className="label-editor__tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === active}
            className={`label-editor__tab${t.id === active ? " is-active" : ""}`}
            onClick={() => onSelect?.(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <Button size="small" icon={closeSmall} label="Close" onClick={onClose} />
    </div>
  );
}
