import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@components/ui/empty";
import { Input } from "@components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@components/ui/pagination";
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
import { TableProperties } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { Skeleton } from "../ui/skeleton";

const EntityTable = <T,>({
  data,
  columns,
  isLoading,
  getSearchText,
  initialSorting,
  searchPlaceholder = "Search",
  toolbar,
}: {
  data: readonly T[];
  columns: ColumnDef<T>[];
  initialSorting: SortingState;
  getSearchText: (row: T) => Array<string | undefined | null>;
  searchPlaceholder?: string;
  toolbar?: ReactNode;
  isLoading?: boolean;
}) => {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [searchTerm, setSearchTerm] = useState("");
  const filteredData = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return [...data];
    return data.filter((row) =>
      getSearchText(row).some((field) => field?.toLowerCase().includes(query)),
    );
  }, [data, getSearchText, searchTerm]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });
  const pagesNumber = table.getPageCount();

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="max-w-80 flex-1"
          value={searchTerm}
          onChange={(event) => {
            setSearchTerm(event.target.value);
            setPagination((current) => ({ ...current, pageIndex: 0 }));
          }}
          placeholder={searchPlaceholder}
        />
        {toolbar}
      </div>
      <div className="max-h-[calc(100dvh-20rem)] overflow-auto rounded-md border">
        <Table className="min-w-[48rem]">
          <TableHeader className="sticky top-0 z-10">
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
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`loading-${index}`}>
                  <TableCell colSpan={columns.length}>
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <EmptyEntityTable />
                </TableCell>
              </TableRow>
            ) : null}
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
      {pagesNumber > 1 ? (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  table.previousPage();
                }}
              />
            </PaginationItem>
            {Array.from({ length: pagesNumber }).map((_, index) => {
              if (Math.abs(index - pagination.pageIndex) >= 4) return null;
              if (Math.abs(index - pagination.pageIndex) === 3) {
                return (
                  <PaginationItem key={index}>
                    <PaginationEllipsis />
                  </PaginationItem>
                );
              }
              return (
                <PaginationItem key={index}>
                  <PaginationLink
                    href="#"
                    isActive={pagination.pageIndex === index}
                    onClick={(event) => {
                      event.preventDefault();
                      table.setPageIndex(index);
                    }}
                  >
                    {index + 1}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  table.nextPage();
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  );
};

function EmptyEntityTable() {
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
}

export default EntityTable;
