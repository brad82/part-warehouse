import { SMALL_LABEL } from "@snowcat/shared";

/**
 * Label stock. Sizes are millimetres of the printed page. Adding a roll or
 * the small printer's real size is one entry here.
 */
export type LabelTemplate = {
  id: "bag" | "small";
  label: string;
  description: string;
  widthMm: number;
  heightMm: number;
  supportsRender: boolean;
};

export const LABEL_TEMPLATES: LabelTemplate[] = [
  {
    id: "bag",
    label: "Bag label",
    description: "Brother QL-800 · 62mm continuous (DK-22205) · 62×100mm",
    widthMm: 62,
    heightMm: 100,
    supportsRender: true,
  },
  {
    id: "small",
    label: "Small label",
    description: "QR + code + name · 1×2⅝in mailer label (Avery 5160) · 66.7×25.4mm",
    widthMm: SMALL_LABEL.widthMm,
    heightMm: SMALL_LABEL.heightMm,
    supportsRender: false,
  },
];

export function templateById(id: LabelTemplate["id"]): LabelTemplate {
  return LABEL_TEMPLATES.find((t) => t.id === id) ?? LABEL_TEMPLATES[0];
}
