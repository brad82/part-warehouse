import { store as blockEditorStore } from "@wordpress/block-editor";
import { createBlock, type Block } from "@wordpress/blocks";
import { Button, Dropdown, MenuGroup, MenuItem } from "@wordpress/components";
import { useDispatch } from "@wordpress/data";
import { plus } from "@wordpress/icons";
import { SYMBOLOGIES } from "@parts-warehouse/shared";
import { Barcode, Box as BoxIcon, QrCode, Type } from "lucide-react";
import { LABEL_BLOCK } from "../model/convert";

/** Menu entries; the two barcode ones are the same block, preset. */
const ITEMS = [
  {
    key: "qr",
    name: LABEL_BLOCK.barcode,
    attributes: { symbology: "qrcode", ...SYMBOLOGIES.qrcode.size },
    label: "QR code",
    icon: <QrCode size={20} />,
  },
  {
    key: "barcode",
    name: LABEL_BLOCK.barcode,
    attributes: { symbology: "code128", ...SYMBOLOGIES.code128.size },
    label: "Barcode",
    icon: <Barcode size={20} />,
  },
  {
    key: "text",
    name: LABEL_BLOCK.text,
    label: "Text",
    icon: <Type size={20} />,
  },
  {
    key: "render",
    name: LABEL_BLOCK.image,
    label: "Part render",
    icon: <BoxIcon size={20} />,
  },
];

/** The "+" toggle: adds a block in front of the rest, which Gutenberg selects. */
export function BlockInserter() {
  const { insertBlock } = useDispatch(blockEditorStore) as unknown as {
    insertBlock: (block: Block, index: number) => void;
  };
  return (
    <Dropdown
      popoverProps={{ placement: "bottom-start" }}
      renderToggle={({ isOpen, onToggle }) => (
        <Button
          variant="primary"
          size="compact"
          icon={plus}
          label="Add element"
          isPressed={isOpen}
          onClick={onToggle}
          className="label-editor__inserter-toggle"
        />
      )}
      renderContent={({ onClose }) => (
        <MenuGroup label="Elements">
          {ITEMS.map((item) => (
            <MenuItem
              key={item.key}
              icon={item.icon}
              iconPosition="left"
              onClick={() => {
                insertBlock(
                  createBlock(
                    item.name,
                    "attributes" in item ? item.attributes : {},
                  ),
                  0,
                );
                onClose();
              }}
            >
              {item.label}
            </MenuItem>
          ))}
        </MenuGroup>
      )}
    />
  );
}
