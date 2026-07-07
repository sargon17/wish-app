import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@components/ui/table";
import { flexRender, type Table as TypeTable } from "@tanstack/react-table";

import { Skeleton } from "../ui/skeleton";

interface DashboardTableProps<T> {
  table: TypeTable<T>;
  isLoading?: boolean;
}

const DashboardTable = <T,>({ table, isLoading }: DashboardTableProps<T>) => {
  return (
    <>
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
    </>
  );
};

export default DashboardTable;
