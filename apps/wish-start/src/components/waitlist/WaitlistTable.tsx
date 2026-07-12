"use client";

import { StatCard } from "@components/molecules/StatCard";
import type { ColumnDef } from "@tanstack/react-table";
import { api } from "@wish/convex-backend/api";
import type { Doc } from "@wish/convex-backend/data-model";
import { useMutation, useQuery } from "convex/react";
import { ChevronDown, Check, ArrowUpDown } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import EntityTable from "../molecules/EntityTable";
import CopyButton from "../Organisms/CopyButton";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

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
          ? `border-accent/70 bg-accent text-accent-foreground ${className ?? ""}`
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
  const [updatingId, setUpdatingId] = useState<WaitlistId | null>(null);

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
                  <StatusBadge
                    invitedAt={entry.invitedAt}
                    className="cursor-pointer transition-colors"
                  >
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

  const stats = useMemo(() => {
    const total = waitlist?.length ?? 0;
    const invited = waitlist?.filter((item) => Boolean(item.invitedAt)).length ?? 0;
    const pending = total - invited;
    return { total, invited, pending };
  }, [waitlist]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total" value={stats.total} description="All emails captured so far" />
        <StatCard label="Invited" value={stats.invited} description="Already contacted" />
        <StatCard label="Pending" value={stats.pending} description="Still waiting on invites" />
      </div>

      <EntityTable
        data={waitlist ?? []}
        columns={columns}
        initialSorting={[{ id: "appliedAt", desc: true }]}
        getSearchText={(row) => [row.email]}
      />
    </div>
  );
}
