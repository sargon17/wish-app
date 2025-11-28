"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { ArrowUpDown } from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Doc } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { StatCard } from "components/molecules/StatCard";

type WaitlistEntry = Doc<"waitlist">;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatTimestamp(timestamp?: number | null) {
  if (!timestamp) return "—";
  return dateFormatter.format(new Date(timestamp));
}

function StatusBadge({ invitedAt }: { invitedAt?: number | null }) {
  const isInvited = Boolean(invitedAt);
  return (
    <Badge
      variant={isInvited ? "secondary" : "outline"}
      className={isInvited ? "bg-accent text-accent-foreground border-accent/70" : "border-dashed"}
    >
      {isInvited ? "Invited" : "Pending"}
    </Badge>
  );
}

export function WaitlistTable() {
  const waitlist = useQuery(api.waitlist.list);
  const [sorting, setSorting] = useState<SortingState>([{ id: "appliedAt", desc: true }]);

  const columns = useMemo<ColumnDef<WaitlistEntry>[]>(
    () => [
      {
        accessorKey: "email",
        header: "Email",
        cell: (info) => <span className="truncate font-medium">{info.getValue<string>()}</span>,
      },
      {
        accessorKey: "appliedAt",
        header: ({ column }) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-3 font-medium"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Joined
            <ArrowUpDown className="ml-1 size-3" />
          </Button>
        ),
        cell: (info) => (
          <span className="text-muted-foreground">{formatTimestamp(info.getValue<number>())}</span>
        ),
        sortingFn: (rowA, rowB, columnId) => {
          const a = rowA.getValue<number>(columnId) ?? 0;
          const b = rowB.getValue<number>(columnId) ?? 0;
          return a === b ? 0 : a > b ? 1 : -1;
        },
      },
      {
        accessorKey: "invitedAt",
        header: ({ column }) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-3 font-medium"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Invite
            <ArrowUpDown className="ml-1 size-3" />
          </Button>
        ),
        cell: (info) => {
          const invitedAt = info.getValue<number | undefined>();
          return (
            <div className="flex items-center gap-2 text-muted-foreground">
              <StatusBadge invitedAt={invitedAt} />
              <span>{formatTimestamp(invitedAt)}</span>
            </div>
          );
        },
        sortingFn: (rowA, rowB, columnId) => {
          const a = rowA.getValue<number>(columnId) ?? 0;
          const b = rowB.getValue<number>(columnId) ?? 0;
          return a === b ? 0 : a > b ? 1 : -1;
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: waitlist ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      sorting,
    },
  });

  const stats = useMemo(() => {
    const total = waitlist?.length ?? 0;
    const invited = waitlist?.filter((item) => Boolean(item.invitedAt)).length ?? 0;
    const pending = total - invited;
    return { total, invited, pending };
  }, [waitlist]);

  const isLoading = waitlist === undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total" value={stats.total} description="All emails captured so far" />
        <StatCard label="Invited" value={stats.invited} description="Already contacted" />
        <StatCard label="Pending" value={stats.pending} description="Still waiting on invites" />
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
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
                  <TableCell colSpan={3}>
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </TableCell>
                </TableRow>
              ))}

            {!isLoading && waitlist?.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                  No one is on the waitlist yet. Share your signup form to start collecting
                  interest.
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
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
}
