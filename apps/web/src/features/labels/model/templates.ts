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
    description: "QR + name + code · 25×25mm placeholder (printer TBD)",
    widthMm: 25,
    heightMm: 25,
    supportsRender: false,
  },
];

export function templateById(id: LabelTemplate["id"]): LabelTemplate {
  return LABEL_TEMPLATES.find((t) => t.id === id) ?? LABEL_TEMPLATES[0];
}
