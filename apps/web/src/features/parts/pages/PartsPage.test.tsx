import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { AttributeDef, Grouping, Part, PartType, PartUpdate } from "@snowcat/shared";
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
    onSave: vi.fn<(update: PartUpdate) => Promise<void>>(async () => {}),
    onSaveNow: vi.fn<(update: PartUpdate) => Promise<void>>(async () => {}),
    ...overrides,
  };
  const tree = (p: typeof props) => (
    <MemoryRouter>
      <PartsProvider {...p}>
        <PartsPage />
      </PartsProvider>
    </MemoryRouter>
  );
  const { rerender } = render(tree(props));
  return { ...props, rerender: (next: Partial<typeof props>) => rerender(tree({ ...props, ...next })) };
}

describe("PartsPage", () => {
  it("saves a validated update without name or stock", async () => {
    const user = userEvent.setup();
    const props = renderPage();

    await user.type(screen.getByLabelText("Print time (min)"), "42");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(props.onSave).toHaveBeenCalledWith(
      expect.objectContaining({ qtyPerBuild: 12, attributes: { print_time_min: 42 } }),
    );
    const [update] = vi.mocked(props.onSave).mock.calls[0];
    expect(update).not.toHaveProperty("onHand");
    expect(update).not.toHaveProperty("status");
    expect(update).not.toHaveProperty("name");
    expect(props.onSaveNow).not.toHaveBeenCalled();
  });

  it("moves stock out of the form into the strip", () => {
    renderPage({ selected: { ...parts[0], onHand: 5 } });
    const strip = screen.getByRole("region", { name: "Stock" });
    expect(within(strip).getByLabelText("On hand")).toHaveValue("5");
    expect(within(strip).getByText("5 of 12 per build")).toBeInTheDocument();
    expect(within(strip).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "42");
    expect(screen.queryByText(/still to print/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Part name")).not.toBeInTheDocument();
  });

  it("saves on hand + 1 straight away from Add one", async () => {
    const user = userEvent.setup();
    const props = renderPage({ selected: { ...parts[0], onHand: 3 } });

    await user.click(screen.getByRole("button", { name: "Add one" }));

    expect(props.onSaveNow).toHaveBeenCalledWith({ onHand: 4 });
    expect(screen.getByLabelText("On hand")).toHaveValue("4");
  });

  it("saves a typed on hand on Enter, not per keystroke", async () => {
    const user = userEvent.setup();
    const props = renderPage();

    const onHand = screen.getByLabelText("On hand");
    await user.clear(onHand);
    await user.type(onHand, "15");
    expect(props.onSaveNow).not.toHaveBeenCalled();
    await user.type(onHand, "{Enter}");

    expect(props.onSaveNow).toHaveBeenCalledTimes(1);
    expect(props.onSaveNow).toHaveBeenCalledWith({ onHand: 15 });
  });

  it("saves status from the toggle", async () => {
    const user = userEvent.setup();
    const props = renderPage();

    await user.click(screen.getByRole("button", { name: "Completed" }));

    expect(props.onSaveNow).toHaveBeenCalledWith({ status: "completed" });
  });

  it("shows a stock save error and puts the saved value back", async () => {
    const user = userEvent.setup();
    renderPage({
      onSaveNow: vi.fn(async () => {
        throw new Error("Server said no");
      }),
    });

    await user.click(screen.getByRole("button", { name: "Add one" }));

    expect(await screen.findByText("Server said no")).toBeInTheDocument();
    expect(screen.getByLabelText("On hand")).toHaveValue("0");
  });

  it("keeps unsaved form edits when a stock save comes back", async () => {
    const user = userEvent.setup();
    const props = renderPage();

    await user.type(screen.getByLabelText("Print time (min)"), "42");
    props.rerender({
      selected: { ...parts[0], onHand: 1, updatedAt: "2026-10-17T00:00:00.000Z" },
    });

    expect(screen.getByLabelText("Print time (min)")).toHaveValue(42);
    expect(screen.getByLabelText("On hand")).toHaveValue("1");
  });

  it("renames the part on its own", async () => {
    const user = userEvent.setup();
    const props = renderPage();

    await user.click(screen.getByRole("button", { name: "Rename part" }));
    const dialog = screen.getByRole("dialog", { name: "Rename part" });
    const name = within(dialog).getByLabelText("Part name");
    await user.clear(name);
    expect(within(dialog).getByText("Enter a name")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Save" })).toBeDisabled();

    await user.type(name, "  Left Inner Grouser 3 ");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(props.onSaveNow).toHaveBeenCalledWith({ name: "Left Inner Grouser 3" });
    expect(props.onSave).not.toHaveBeenCalled();
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

});
