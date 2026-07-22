import useRequests from "#/hooks/useRequests";
import useStatuses from "#/hooks/useStatuses";
import { trimTo } from "#/lib/text.ts";
import SortButton from "@components/atoms/SortButton";
import { Checkbox } from "@components/ui/checkbox";
import { type ColumnDef, type OnChangeFn, type RowSelectionState } from "@tanstack/react-table";
import { api } from "@wish/convex-backend/api";
import type { Doc, Id } from "@wish/convex-backend/data-model";
import { MAX_BULK_REQUESTS } from "@wish/convex-backend/request-limits";
import { useMutation } from "convex/react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type { Filter } from "@/lib/requestBoard/buildFilters";
import { formatDate } from "@/lib/time";

import EntityTable from "../molecules/EntityTable";
import StatusChip from "../Status/StatusChip";

import RequestDetailView from "./DetailView/RequestDeatailView";
import { RequestBulkActions } from "./RequestBulkActions";
import RequestsEmpty from "./RequestsEmpty";
import RequestTableFilters from "./RequestTableFilters";

interface RequestTableProps {
  projectId: Id<"projects">;
  kind?: "request" | "complaint";
}

type RequestEntry = {
  _id: Doc<"requests">["_id"];
  title: Doc<"requests">["text"];
  description?: Doc<"requests">["description"];
  status?: Doc<"requestStatuses">;
  createdAt: number;
};

const RequestTable = ({ projectId, kind }: RequestTableProps) => {
  const { value: requests, byId, byStatus, isPending } = useRequests(projectId, kind);
  const { value: statuses, byId: statusesById } = useStatuses(projectId);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isBulkMutationPending, setIsBulkMutationPending] = useState(false);
  const [hiddenFilters, setHiddenFilters] = useState<string[]>([]);
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const bulkMutationInFlight = useRef(false);
  const updateStatuses = useMutation(api.requests.updateStatuses);
  const deleteRequests = useMutation(api.requests.deleteRequests);
  const selectedIds = (requests ?? [])
    .filter((request) => rowSelection[request._id])
    .map((request) => request._id);
  const handleRowSelectionChange: OnChangeFn<RowSelectionState> = (updater) => {
    setRowSelection((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      const selected = Object.keys(next).filter((id) => next[id]);
      if (selected.length <= MAX_BULK_REQUESTS) return next;

      return Object.fromEntries(selected.slice(0, MAX_BULK_REQUESTS).map((id) => [id, true]));
    });
  };

  const handleBulkStatusChange = async (status: Id<"requestStatuses">) => {
    if (bulkMutationInFlight.current || selectedIds.length === 0) return;

    try {
      bulkMutationInFlight.current = true;
      setIsBulkMutationPending(true);
      await updateStatuses({ ids: selectedIds, status });
      setRowSelection({});
      toast.success(
        `${selectedIds.length} ${kind === "complaint" ? "complaints" : "requests"} updated`,
      );
    } catch (error) {
      console.error(error);
      toast.error("Unable to update the selected items");
    } finally {
      bulkMutationInFlight.current = false;
      setIsBulkMutationPending(false);
    }
  };

  const handleBulkDelete = async () => {
    if (bulkMutationInFlight.current || selectedIds.length === 0) return false;

    try {
      bulkMutationInFlight.current = true;
      setIsBulkMutationPending(true);
      await deleteRequests({ ids: selectedIds });
      setRowSelection({});
      toast.success(
        `${selectedIds.length} ${kind === "complaint" ? "complaints" : "requests"} deleted`,
      );
      return true;
    } catch (error) {
      console.error(error);
      toast.error("Unable to delete the selected items");
      return false;
    } finally {
      bulkMutationInFlight.current = false;
      setIsBulkMutationPending(false);
    }
  };

  const mappedRequests: RequestEntry[] = useMemo(
    () =>
      (requests ?? []).map((request) => ({
        _id: request._id,
        title: request.text,
        description: request.description,
        status: statusesById.get(request.status),
        createdAt: request._creationTime,
      })),
    [requests, statusesById],
  );

  const filters = useMemo(() => {
    let res: Filter[] = [];
    byStatus.forEach((value, key) => {
      const status = statusesById.get(key);
      if (!status) return;
      res = [...res, { label: status.displayName, value: status.name, count: value.length }];
    });
    return res;
  }, [byStatus, statusesById]);
  const filteredRequests = useMemo(() => {
    const from = createdFrom ? new Date(`${createdFrom}T00:00:00`).getTime() : undefined;
    const to = createdTo ? new Date(`${createdTo}T23:59:59.999`).getTime() : undefined;
    return mappedRequests.filter((request) => {
      if (request.status && hiddenFilters.includes(request.status.name.toLowerCase())) return false;
      if (from && request.createdAt < from) return false;
      if (to && request.createdAt > to) return false;
      return true;
    });
  }, [createdFrom, createdTo, hiddenFilters, mappedRequests]);

  const columns = useMemo<ColumnDef<RequestEntry>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            aria-label="Select current page"
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            disabled={
              isBulkMutationPending ||
              (selectedIds.length >= MAX_BULK_REQUESTS && !table.getIsAllPageRowsSelected())
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            aria-label={`Select ${kind === "complaint" ? "complaint" : "request"} ${row.original.title}`}
            checked={row.getIsSelected()}
            disabled={
              isBulkMutationPending ||
              (!row.getIsSelected() && selectedIds.length >= MAX_BULK_REQUESTS)
            }
            onCheckedChange={(value) => row.toggleSelected(!!value)}
          />
        ),
      },
      {
        accessorKey: "title",
        header: ({ column }) => (
          <SortButton
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            sort={column.getIsSorted()}
          >
            Title
          </SortButton>
        ),
        cell: (info) => {
          const _id = info.row.original._id;
          const title = info.getValue<string>();
          const request = byId.get(_id);
          if (!request) return;

          return (
            <RequestDetailView request={request} showUpvoteButton={kind !== "complaint"}>
              <span>{title}</span>
            </RequestDetailView>
          );
        },
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: (info) => {
          const description = info.getValue<string>();
          if (!description || description.length === 0) return <span></span>;
          return <span className="">{trimTo(info.getValue<string>(), 40)}</span>;
        },
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <SortButton
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            sort={column.getIsSorted()}
          >
            Created
          </SortButton>
        ),
        cell: (info) => (
          <time className="whitespace-nowrap text-muted-foreground">
            {formatDate(info.getValue<number>())}
          </time>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <SortButton
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            sort={column.getIsSorted()}
          >
            Status
          </SortButton>
        ),
        sortingFn: (rowA, rowB, columnId) => {
          const a = rowA.getValue<Doc<"requestStatuses">>(columnId).name;
          const b = rowB.getValue<Doc<"requestStatuses">>(columnId).name;
          return a === b ? 0 : a > b ? 1 : -1;
        },
        cell: (info) => {
          const status = info.getValue<Doc<"requestStatuses">>();

          if (!status) return;

          return <StatusChip label={status.displayName} color={status.color ?? "#fff"} />;
        },
      },
    ],
    [byId, isBulkMutationPending, kind, selectedIds.length],
  );

  // empty
  if (!isPending && mappedRequests.length === 0)
    return <RequestsEmpty projectId={projectId as never} />;

  return (
    <div className="mt-1 flex w-full flex-col gap-4">
      {selectedIds.length > 0 && (
        <RequestBulkActions
          count={selectedIds.length}
          isPending={isBulkMutationPending}
          kind={kind ?? "request"}
          onClear={() => setRowSelection({})}
          onDelete={handleBulkDelete}
          onStatusChange={handleBulkStatusChange}
          statuses={statuses ?? []}
        />
      )}
      <EntityTable
        data={filteredRequests}
        columns={columns}
        getRowId={(row) => row._id}
        initialSorting={[{ id: "title", desc: true }]}
        getSearchText={(row) => [row.title, row.description, row.status?.name]}
        rowSelection={rowSelection}
        onRowSelectionChange={handleRowSelectionChange}
        searchPlaceholder="Search requests"
        toolbar={
          <RequestTableFilters
            filters={filters}
            hiddenFilters={hiddenFilters}
            createdFrom={createdFrom}
            createdTo={createdTo}
            onHiddenFiltersChange={setHiddenFilters}
            onDateRangeChange={(from, to) => {
              setCreatedFrom(from);
              setCreatedTo(to);
            }}
          />
        }
      />
    </div>
  );
};

export default RequestTable;
