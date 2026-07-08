import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@components/ui/table";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";

import { Skeleton } from "../ui/skeleton";
import { Input } from "@components/ui/input";
import { useMemo, useState } from "react";

interface EntityTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  initialSorting: SortingState;
  getSearchText: (row: T) => Array<string | undefined | null>;
  isLoading?: boolean;
}

const EntityTable = <T,>({
  data,
  columns,
  isLoading,
  getSearchText,
  initialSorting,
}: EntityTableProps<T>) => {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [searchTerm, setSearchTerm] = useState("");

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return data.filter((row) =>
      getSearchText(row).some((field) => field?.toLowerCase().includes(normalizedSearch)),
    );
  }, [searchTerm, data, getSearchText]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      sorting,
    },
  });

  return (
    <div className="h-full flex flex-col gap-4">
      <div>
        <Input
          className="max-w-80"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search"
        />
      </div>
      <div className="outline rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="bg-neutral-100 hover:bg-neutral-100 dark:bg-neutral-800"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, idx) => (
                <TableRow key={`loading-${idx}`}>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </TableCell>
                </TableRow>
              ))}

            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="group">
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="truncate">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default EntityTable;
