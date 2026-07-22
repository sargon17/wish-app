// @vitest-environment jsdom

import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vite-plus/test";

import { Checkbox } from "@/components/ui/checkbox";

import EntityTable from "./EntityTable";

const data = Array.from({ length: 21 }, (_, index) => ({
  id: `request-${index + 1}`,
  title: `Request ${index + 1}`,
}));

const columns: ColumnDef<(typeof data)[number]>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        aria-label="Select current page"
        checked={
          table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label={`Select ${row.original.title}`}
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
      />
    ),
  },
  { accessorKey: "title", header: "Title" },
];

function SelectionTable() {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  return (
    <>
      <output aria-label="Selected count">{Object.keys(rowSelection).length}</output>
      <EntityTable
        columns={columns}
        data={data}
        getRowId={(row) => row.id}
        getSearchText={(row) => [row.title]}
        initialSorting={[]}
        onRowSelectionChange={setRowSelection}
        rowSelection={rowSelection}
      />
    </>
  );
}

describe("EntityTable row selection", () => {
  it("selects the current page and preserves stable selections across pages", () => {
    render(<SelectionTable />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Request 1" }));
    expect(
      screen.getByRole("checkbox", { name: "Select current page" }).getAttribute("aria-checked"),
    ).toBe("mixed");

    fireEvent.click(screen.getByRole("checkbox", { name: "Select current page" }));
    expect(screen.getByLabelText("Selected count").textContent).toBe("20");

    fireEvent.click(screen.getByRole("link", { name: "2" }));
    expect(
      screen.getByRole("checkbox", { name: "Select current page" }).getAttribute("aria-checked"),
    ).toBe("false");

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Request 21" }));
    expect(screen.getByLabelText("Selected count").textContent).toBe("21");

    fireEvent.click(screen.getByRole("checkbox", { name: "Select current page" }));
    expect(screen.getByLabelText("Selected count").textContent).toBe("20");
  });
});
