import { DropdownMenu, MenuGroup, MenuItem } from "@wordpress/components";
import { useDispatch, useSelect } from "@wordpress/data";
import { download, moreVertical, trash, upload } from "@wordpress/icons";
import { useConfirmDiscard } from "../model/useConfirmDiscard";
import { store } from "../store";

/** The ⋮ menu: export, import, delete. */
export function OptionsMenu() {
  const { name, isSaved } = useSelect(
    (select) => ({
      name: select(store).getMeta().name,
      isSaved: select(store).getSavedVersion() !== null,
    }),
    [],
  );
  const { exportTemplate, importTemplate, deleteTemplate } = useDispatch(store);
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
            {isSaved ? (
              <MenuGroup>
                <MenuItem
                  icon={trash}
                  isDestructive
                  onClick={run(
                    () =>
                      window.confirm(
                        `Delete "${name}"? This can't be undone.`,
                      ) && deleteTemplate(),
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
