import { renderLabelSvg } from "@parts-warehouse/shared";
import { SMALL_LABEL } from "../testing/smallLabel";
import { FIELD_NAMES_PART } from "./fields";

describe("FIELD_NAMES_PART", () => {
  it("renders a template's placeholders", () => {
    const svg = renderLabelSvg(SMALL_LABEL, FIELD_NAMES_PART);
    expect(svg).toContain(">{code}<");
    expect(svg).toContain(">{name}<");
  });
});
