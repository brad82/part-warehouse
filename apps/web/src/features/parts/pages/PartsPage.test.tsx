import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { AttributeDef, Grouping, Part, PartType } from "@snowcat/shared";
import { PartsProvider } from "../PartsProvider";
import { PartsPage } from "./PartsPage";

// WebGL isn't available in jsdom.
vi.mock("../components/PartView/StlViewer", () => ({
  StlViewer: () => <div>stl viewer</div>,
}));

const groupings: Grouping[] = [
  { id: "A", taxonomy: "module", name: "Chassis", revision: 0, parentId: null },
  { id: "A01", taxonomy: "subassembly", name: "Tracks", revision: 0, parentId: "A" },
  { id: "A01-001", taxonomy: "group", name: "Grousers", revision: 0, parentId: "A01" },
];

const part = (code: string, name: string): Part => ({
  code,
  groupId: "A01-001",
  part: code.slice(-2),
  revision: 0,
  name,
  partTypeId: "printed",
  qtyPerBuild: 12,
  notes: null,
  onHand: 0,
  attributes: { colour: "Black", material: "PETG", file_version: "1.85" },
  status: "planned",
  source: "csv",
  updatedAt: "2026-10-16T00:00:00.000Z",
});

const partTypes: PartType[] = [
  { id: "printed", name: "Printed", sort: 1 },
  { id: "purchased", name: "Purchased", sort: 2 },
];

const def = (
  id: number,
  key: string,
  label: string,
  dataType: AttributeDef["dataType"],
  unit: string | null = null,
  partTypeIds = ["printed"],
): AttributeDef => ({
  id, key, label, dataType, unit, options: null, system: true, sort: id * 10, partTypeIds,
});

const attributeDefs: AttributeDef[] = [
  def(1, "colour", "Colour", "text", null, ["printed", "purchased"]),
  def(3, "print_time_min", "Print time", "integer", "min"),
  def(5, "file_version", "File version", "text"),
  def(7, "sku", "SKU", "text", null, ["purchased"]),
];

const parts = [
  part("A01-001-001", "Left Inner Grouser 2"),
  part("A01-001-002", "Left Outer Grouser 2"),
];

function renderPage(overrides: Partial<Parameters<typeof PartsProvider>[0]> = {}) {
  const props = {
    groupings,
    parts,
    partTypes,
    attributeDefs,
    previewColours: [{ id: 1, name: "Black", hex: "#2b2d30", sort: 10 }],
    partsLoading: false,
    search: "",
    onSearchChange: vi.fn(),
    selected: parts[0],
    selectedCode: parts[0].code,
    selectedLoading: false,
    selectedError: null,
    onSelect: vi.fn(),
    saving: false,
    saveError: null,
    onSave: vi.fn(async () => {}),
    onCreate: vi.fn(async () => "A01-001-003"),
    creating: false,
    createError: null,
    nextPartNumber: vi.fn(async () => "03"),
    ...overrides,
  };
  render(
    <MemoryRouter>
      <PartsProvider {...props}>
        <PartsPage />
      </PartsProvider>
    </MemoryRouter>,
  );
  return props;
}

describe("PartsPage", () => {
  it("edits stock fields and saves a validated update", async () => {
    const user = userEvent.setup();
    const props = renderPage();

    const onHand = screen.getByLabelText("On hand");
    await user.clear(onHand);
    await user.type(onHand, "5");
    await user.type(screen.getByLabelText("Print time (min)"), "42");
    expect(screen.getByText("7")).toBeInTheDocument(); // still to print
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(props.onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        onHand: 5,
        status: "planned",
        attributes: { print_time_min: 42 },
      }),
    );
  });

  it("shows the attributes of the part's type", () => {
    renderPage();
    expect(screen.getByLabelText("Colour")).toHaveValue("Black");
    expect(screen.queryByLabelText("SKU")).not.toBeInTheDocument();
  });

  it("flags an invalid attribute value", async () => {
    const user = userEvent.setup();
    const props = renderPage();

    // userEvent can't type "1." into a jsdom number input.
    fireEvent.change(screen.getByLabelText("Print time (min)"), { target: { value: "1.5" } });
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(props.onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Enter a whole number")).toBeInTheDocument();
  });

  it("clears an emptied attribute", async () => {
    const user = userEvent.setup();
    const props = renderPage();

    await user.clear(screen.getByLabelText("Colour"));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(props.onSave).toHaveBeenCalledWith(
      expect.objectContaining({ attributes: { colour: null } }),
    );
  });

  it("blocks saving an invalid value", async () => {
    const user = userEvent.setup();
    const props = renderPage();

    await user.clear(screen.getByLabelText("Qty per build"));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(props.onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Check this value")).toBeInTheDocument();
  });

  it("navigates when a part is picked from the expanded tree", async () => {
    const user = userEvent.setup();
    const props = renderPage();

    const tree = screen.getByRole("tree", { name: "Parts" });
    await user.click(within(tree).getByText("Left Outer Grouser 2"));

    expect(props.onSelect).toHaveBeenCalledWith("A01-001-002");
  });

  it("creates a part in the selected part's group with the next number", async () => {
    const user = userEvent.setup();
    const props = renderPage();

    await user.click(screen.getByRole("button", { name: "New part" }));
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
    expect(props.onSelect).toHaveBeenCalledWith("A01-001-003");
  });
});
