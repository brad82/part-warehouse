import { Dropdown, MenuGroup, MenuItem } from "@wordpress/components";
import { useDispatch, useSelect } from "@wordpress/data";
import { check, chevronDown, Icon, upload } from "@wordpress/icons";
import { useConfirmDiscard } from "../model/useConfirmDiscard";
import { store } from "../store";

/** The centre "command bar": the open template's name, opening a menu of others. */
export function TemplateSwitcher() {
  const { meta, saved } = useSelect(
    (select) => ({
      meta: select(store).getMeta(),
      saved: select(store).getSavedTemplates(),
    }),
    [],
  );
  const { openSaved, startFrom, importTemplate } = useDispatch(store);
  const confirmDiscard = useConfirmDiscard();

  return (
    <Dropdown
      className="label-editor__title"
      popoverProps={{ placement: "bottom" }}
      renderToggle={({ isOpen, onToggle }) => (
        <button
          type="button"
          className="label-editor__title-button"
          aria-expanded={isOpen}
          onClick={onToggle}
        >
          <span className="label-editor__title-name">
            {meta.name || "Untitled"}
          </span>
          <span className="label-editor__title-kind">· Label template</span>
          <Icon icon={chevronDown} size={16} />
        </button>
      )}
      renderContent={({ onClose }) => {
        // Leaving the open template asks first if it has unsaved changes.
        const leaveTo = (open: () => unknown) => () => {
          onClose();
          if (confirmDiscard()) open();
        };
        return (
          <div className="label-editor__title-menu">
            {saved.length ? (
              <MenuGroup label="Saved templates">
                {saved.map((t) => {
                  const current = t.id === meta.id;
                  return (
                    <MenuItem
                      key={t.id}
                      icon={current ? check : undefined}
                      isSelected={current}
                      onClick={
                        current ? onClose : leaveTo(() => openSaved(t.id))
                      }
                    >
                      {t.name}
                    </MenuItem>
                  );
                })}
              </MenuGroup>
            ) : null}
            <MenuGroup label="Start from">
              <MenuItem onClick={leaveTo(() => startFrom("blank"))}>
                Blank label
              </MenuItem>
              <MenuItem onClick={leaveTo(() => startFrom("small"))}>
                Copy of Small label
              </MenuItem>
              <MenuItem icon={upload} onClick={leaveTo(importTemplate)}>
                Import JSON…
              </MenuItem>
            </MenuGroup>
          </div>
        );
      }}
    />
  );
}
