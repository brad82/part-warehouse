import { DropdownMenu, MenuGroup, MenuItem } from "@wordpress/components";
import { useDispatch, useSelect } from "@wordpress/data";
import { download, moreVertical, trash, upload } from "@wordpress/icons";
import { useConfirmDiscard } from "../model/useConfirmDiscard";
import { useTemplatePersistence } from "../model/useTemplatePersistence";
import { store } from "../store";

/** The ⋮ menu: export, import, delete. */
export function OptionsMenu() {
  const { name, deletable } = useSelect(
    (select) => ({
      name: select(store).getMeta().name,
      // Drafts aren't stored; built-ins ship with the app.
      deletable:
        select(store).getSavedVersion() !== null &&
        !select(store).getMeta().builtin,
    }),
    [],
  );
  const { exportTemplate, importTemplate } = useDispatch(store);
  const { remove } = useTemplatePersistence();
  const confirmDiscard = useConfirmDiscard();

  return (
    <DropdownMenu
      icon={moreVertical}
      label="Options"
      toggleProps={{ size: "compact" }}
      popoverProps={{ placement: "bottom-end" }}
    >
      {({ onClose }) => {
        const run = (action: () => unknown) => () => {
          onClose();
          action();
        };
        return (
          <>
            <MenuGroup>
              <MenuItem icon={download} onClick={run(exportTemplate)}>
                Export JSON
              </MenuItem>
              <MenuItem
                icon={upload}
                onClick={run(() => confirmDiscard() && importTemplate())}
              >
                Import JSON…
              </MenuItem>
            </MenuGroup>
            {deletable ? (
              <MenuGroup>
                <MenuItem
                  icon={trash}
                  isDestructive
                  onClick={run(
                    () =>
                      window.confirm(
                        `Delete "${name}"? This can't be undone.`,
                      ) && remove(),
                  )}
                >
                  Delete template
                </MenuItem>
              </MenuGroup>
            ) : null}
          </>
        );
      }}
    </DropdownMenu>
  );
}
