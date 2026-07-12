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
import { useMemo, useState, type ComponentProps } from "react";
import FilterList from "./FilterList";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@components/ui/empty";
import { TableProperties } from "lucide-react";

type FieldsFN<T> = (row: T) => Array<string | undefined | null>;

interface EntityTableProps<T> extends Pick<ComponentProps<typeof FilterList>, "filters"> {
  data: readonly T[];
  columns: ColumnDef<T>[];
  initialSorting: SortingState;
  getSearchText: FieldsFN<T>;
  getFilterText?: FieldsFN<T>;
  isLoading?: boolean;
}

const filterData = <T,>(row: T, query: string, fieldsFn?: FieldsFN<T>): boolean => {
  if (!fieldsFn) return true;

  return fieldsFn(row).some((field) => field?.toLowerCase().includes(query));
};

const EntityTable = <T,>({
  data,
  columns,
  isLoading,
  getSearchText,
  getFilterText,
  initialSorting,
  filters,
}: EntityTableProps<T>) => {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const filteredData = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const normalizedActiveFilter = activeFilter.trim().toLowerCase();

    return data.filter((row) =>
      filterData(row, normalizedSearch, getSearchText) && normalizedActiveFilter === "all"
        ? true
        : filterData(row, normalizedActiveFilter, getFilterText),
    );
  }, [searchTerm, data, getSearchText, activeFilter, getFilterText]);

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
      <FilterList active={activeFilter} onChange={(v) => setActiveFilter(v)} filters={filters} />
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

            {!isLoading && table.getRowModel().rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <EmptyEntityTable />
                </TableCell>
              </TableRow>
            )}

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

const EmptyEntityTable = () => {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <TableProperties />
        </EmptyMedia>
        <EmptyTitle>No results found</EmptyTitle>
        <EmptyDescription>No data matches your current search and filters.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
};

export default EntityTable;
