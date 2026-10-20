import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Grouping, Part } from "@parts-warehouse/shared";
import { groupingRows } from "../model/groupingRows";
import { BomStructurePage } from "./BomStructurePage";

const g = (id: string, taxonomy: Grouping["taxonomy"], parentId: string | null, name: string): Grouping => ({
  id,
  taxonomy,
  name,
  revision: 0,
  parentId,
});

const groupings: Grouping[] = [
  g("A", "module", null, "Chassis"),
  g("A03", "subassembly", "A", "Chassis"),
  g("A03-002", "group", "A03", "Frame"),
  g("A03-030", "group", "A03", "Roadwheels"),
  g("A07", "subassembly", "A", "Spare"),
  g("B", "module", null, "Cab"),
];
const parts = [{ groupId: "A03-002" }, { groupId: "A03-030" }] as Part[];

function renderPage() {
  const onDelete = vi.fn().mockResolvedValue(undefined);
  render(
    <BomStructurePage
      groupings={groupings}
      rows={groupingRows(groupings, parts)}
      loading={false}
      error={null}
      onCreate={vi.fn()}
      onRename={vi.fn()}
      onDelete={onDelete}
    />,
  );
  return { onDelete };
}

/** Each row's text starts with its code (the chevron has none). */
const codes = () =>
  screen.queryAllByRole("listitem").map((li) => li.textContent?.match(/^[A-Z](\d{2}(-\d{3})?)?/)?.[0]);

beforeEach(() => localStorage.clear());

describe("BomStructurePage", () => {
  it("opens with only the first module expanded", () => {
    renderPage();
    expect(codes()).toEqual(["A", "A03", "A07", "B"]);
    expect(screen.getByRole("button", { name: "Collapse A Chassis" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("2 groups")).toBeInTheDocument();
  });

  it("expands and collapses with the chevron and toolbar", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Expand A03 Chassis" }));
    expect(codes()).toEqual(["A", "A03", "A03-002", "A03-030", "A07", "B"]);
    await userEvent.click(screen.getByRole("button", { name: "Collapse all" }));
    expect(codes()).toEqual(["A", "B"]);
    await userEvent.click(screen.getByRole("button", { name: "Expand all" }));
    expect(codes()).toHaveLength(6);
  });

  it("filters to matches and their parents, then restores the tree", async () => {
    renderPage();
    const filter = screen.getByRole("searchbox", { name: "Filter by code or name" });
    await userEvent.type(filter, "frame");
    expect(codes()).toEqual(["A", "A03", "A03-002"]);
    expect(screen.getByText("1 match, shown with their parents")).toBeInTheDocument();
    await userEvent.clear(filter);
    expect(codes()).toEqual(["A", "A03", "A07", "B"]);
  });

  it("offers to clear a filter with no matches", async () => {
    renderPage();
    await userEvent.type(screen.getByRole("searchbox"), "zzz");
    expect(screen.getByText("No codes or names match “zzz”")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear filter" }));
    expect(codes()).toEqual(["A", "A03", "A07", "B"]);
  });

  it("only shows delete on empty rows", async () => {
    const { onDelete } = renderPage();
    expect(screen.queryByRole("button", { name: "Delete A03" })).not.toBeInTheDocument();
    const spare = screen.getAllByRole("listitem").find((li) => li.textContent?.includes("Spare"))!;
    expect(within(spare).getByText("Empty")).toBeInTheDocument();
    await userEvent.click(within(spare).getByRole("button", { name: "Delete A07" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledWith("A07");
  });
});
