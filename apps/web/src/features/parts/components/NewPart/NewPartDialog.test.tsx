import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Grouping, PartType } from "@snowcat/shared";
import { NewPartDialog } from "./NewPartDialog";

const groupings: Grouping[] = [
  { id: "A", taxonomy: "module", name: "Chassis", revision: 0, parentId: null },
  { id: "A01", taxonomy: "subassembly", name: "Tracks", revision: 0, parentId: "A" },
  { id: "A01-001", taxonomy: "group", name: "Grousers", revision: 0, parentId: "A01" },
];

const partTypes: PartType[] = [
  { id: "printed", name: "Printed", sort: 1 },
  { id: "purchased", name: "Purchased", sort: 2 },
];

describe("NewPartDialog", () => {
  it("creates a part in the default group with the next number", async () => {
    const user = userEvent.setup();
    const props = {
      open: true,
      onClose: vi.fn(),
      groupings,
      partTypes,
      defaultGroupId: "A01-001",
      nextPartNumber: vi.fn(async () => "03"),
      onCreate: vi.fn(async () => "A01-001-003"),
      creating: false,
      createError: null,
      onCreated: vi.fn(),
    };
    render(<NewPartDialog {...props} />);

    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("A01-001-003")).toBeInTheDocument();
    expect(props.nextPartNumber).toHaveBeenCalledWith("A01-001");

    await user.type(within(dialog).getByLabelText("Part name"), "M3x8 bolt");
    await user.click(within(dialog).getByRole("button", { name: "Create" }));

    expect(props.onCreate).toHaveBeenCalledWith({
      groupId: "A01-001",
      part: "03",
      revision: 0,
      name: "M3x8 bolt",
      partTypeId: "printed",
      qtyPerBuild: 1,
    });
    expect(props.onCreated).toHaveBeenCalledWith("A01-001-003");
  });
});
