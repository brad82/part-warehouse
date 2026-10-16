import type { Part } from "@snowcat/shared";
import type { LabelTemplate } from "../model/templates";
import { BagLabel } from "./Templates/BagLabel";
import { SmallLabel } from "./Templates/SmallLabel";

type Props = { part: Part; template: LabelTemplate; render: string | null };

export function LabelFor({ part, template, render }: Props) {
  return template.id === "bag" ? (
    <BagLabel part={part} render={render} />
  ) : (
    <SmallLabel part={part} />
  );
}
