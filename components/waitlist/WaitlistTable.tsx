"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowUpDown } from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Doc } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { StatCard } from "components/molecules/StatCard";
import CopyButton from "../Organisms/CopyButton";
import { ChevronDown, ChevronLeft, ChevronRight, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type WaitlistEntry = Doc<"waitlist">;
type WaitlistId = WaitlistEntry["_id"];

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatTimestamp(timestamp?: number | null) {
  if (!timestamp) return "—";
  return dateFormatter.format(new Date(timestamp));
}

function StatusBadge({
  invitedAt,
  asChild = false,
  className,
  children,
}: {
  invitedAt?: number | null;
  asChild?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const isInvited = Boolean(invitedAt);
  const label = isInvited ? "Invited" : "Pending";
  return (
    <Badge
      asChild={asChild}
      variant={isInvited ? "secondary" : "outline"}
      className={
        isInvited
          ? `bg-accent text-accent-foreground border-accent/70 ${className ?? ""}`
          : `border-dashed ${className ?? ""}`
      }
    >
      {children ?? label}
    </Badge>
  );
}

export function WaitlistTable() {
  const waitlist = useQuery(api.waitlist.list);
  const setStatus = useMutation(api.waitlist.setStatus);
  const [sorting, setSorting] = useState<SortingState>([{ id: "appliedAt", desc: true }]);
  const [updatingId, setUpdatingId] = useState<WaitlistId | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "invited">("all");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });

  const handleStatusChange = useCallback(
    async (id: WaitlistId, status: "pending" | "invited") => {
      try {
        setUpdatingId(id);
        await setStatus({ id, status });
        toast.success(`Marked as ${status}`);
      } catch (error) {
        console.error(error);
        toast.error("Unable to update status right now.");
      } finally {
        setUpdatingId(null);
      }
    },
    [setStatus],
  );

  const columns = useMemo<ColumnDef<WaitlistEntry>[]>(
    () => [
      {
        accessorKey: "email",
        header: "Email",
        cell: (info) => {
          const email = info.getValue<string>();
          return (
            <div className="flex items-center gap-2">
              <span className="truncate font-medium">{email}</span>
              <CopyButton
                text={email}
                className="opacity-0 transition-opacity duration-150 group-hover:opacity-100"
              />
            </div>
          );
        },
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
          return <span className="text-muted-foreground">{formatTimestamp(invitedAt)}</span>;
        },
        sortingFn: (rowA, rowB, columnId) => {
          const a = rowA.getValue<number>(columnId) ?? 0;
          const b = rowB.getValue<number>(columnId) ?? 0;
          return a === b ? 0 : a > b ? 1 : -1;
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const entry = row.original;
          const isInvited = Boolean(entry.invitedAt);
          const value = isInvited ? "invited" : "pending";
          const disabled = updatingId === entry._id;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild disabled={disabled}>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  disabled={disabled}
                >
                  <StatusBadge invitedAt={entry.invitedAt} className="cursor-pointer transition-colors">
                    <span className="flex items-center gap-1">
                      {value === "invited" ? "Invited" : "Pending"}
                      <ChevronDown className="size-3 opacity-70" />
                    </span>
                  </StatusBadge>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={6}>
                <DropdownMenuLabel>Set status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => handleStatusChange(entry._id, "pending")}
                  disabled={value === "pending" || disabled}
                  className="flex items-center gap-2"
                >
                  {value === "pending" && <Check className="size-4" />}
                  Pending
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => handleStatusChange(entry._id, "invited")}
                  disabled={value === "invited" || disabled}
                  className="flex items-center gap-2"
                >
                  {value === "invited" && <Check className="size-4" />}
                  Invited
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [handleStatusChange, updatingId],
  );

  const filteredWaitlist = useMemo(() => {
    if (!waitlist) return [];

    const normalizedSearch = searchTerm.trim().toLowerCase();

    return waitlist.filter((entry) => {
      const matchesSearch =
        !normalizedSearch || entry.email.toLowerCase().includes(normalizedSearch);
      const isInvited = Boolean(entry.invitedAt);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "invited" && isInvited) ||
        (statusFilter === "pending" && !isInvited);

      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter, waitlist]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    setPagination((prev) => {
      const maxPage =
        filteredWaitlist.length === 0
          ? 0
          : Math.max(Math.ceil(filteredWaitlist.length / prev.pageSize) - 1, 0);

      if (prev.pageIndex > maxPage) {
        return { ...prev, pageIndex: maxPage };
      }
      return prev;
    });
  }, [filteredWaitlist.length]);

  const table = useReactTable({
    data: filteredWaitlist ?? [],
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

  const stats = useMemo(() => {
    const total = waitlist?.length ?? 0;
    const invited = waitlist?.filter((item) => Boolean(item.invitedAt)).length ?? 0;
    const pending = total - invited;
    return { total, invited, pending };
  }, [waitlist]);

  const isLoading = waitlist === undefined;
  const hasFilters = Boolean(searchTerm.trim()) || statusFilter !== "all";
  const totalFiltered = filteredWaitlist.length;
  const { pageIndex, pageSize } = table.getState().pagination;
  const pageStart = totalFiltered === 0 ? 0 : pageIndex * pageSize + 1;
  const pageEnd = totalFiltered === 0 ? 0 : Math.min((pageIndex + 1) * pageSize, totalFiltered);
  const pageCount = table.getPageCount();

  return (
    <div className="flex flex-col gap-4 sidebar-offset-pl">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total" value={stats.total} description="All emails captured so far" />
        <StatCard label="Invited" value={stats.invited} description="Already contacted" />
        <StatCard label="Pending" value={stats.pending} description="Still waiting on invites" />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search by email..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="w-full sm:max-w-xs"
        />
        <div className="flex items-center gap-3">
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as "all" | "pending" | "invited")}
          >
            <SelectTrigger className="w-[160px]" aria-label="Filter by status">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="invited">Invited</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            Showing {filteredWaitlist.length} of {waitlist?.length ?? 0}
          </span>
        </div>
      </div>

      <ScrollArea className="rounded-md border bg-background/80 max-h-[60vh]">
        <div className="min-w-full">
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
                    <TableCell colSpan={4}>
                      <Skeleton className="h-10 w-full rounded-lg" />
                    </TableCell>
                  </TableRow>
                ))}

              {!isLoading && (waitlist?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    No one is on the waitlist yet. Share your signup form to start collecting
                    interest.
                  </TableCell>
                </TableRow>
              )}

              {!isLoading &&
                (waitlist?.length ?? 0) > 0 &&
                table.getRowModel().rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                      No entries match your search or filters.
                    </TableCell>
                  </TableRow>
                )}

              {!isLoading &&
                table.getRowModel().rows.map((row) => (
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
      </ScrollArea>

      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-sm text-muted-foreground">
          {totalFiltered === 0
            ? "No entries to display"
            : `Showing ${pageStart}-${pageEnd} of ${totalFiltered}${hasFilters ? " (filtered)" : ""}`}
        </p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) =>
                setPagination({ pageIndex: 0, pageSize: Number(value) || 10 })
              }
            >
              <SelectTrigger className="w-[110px]" aria-label="Rows per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="mr-1 size-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pageCount === 0 ? 1 : pageIndex + 1} of {Math.max(pageCount, 1)}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
            <ChevronRight className="ml-1 size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
