import type { Doc, Id } from "@wish/convex-backend/data-model";
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useState, useMemo } from "react";
import { trimTo } from "#/lib/text.ts";
import StatusChip from "../Status/StatusChip";
import DashboardTable from "../dashboard/DashboardTable";
import { Input } from "@components/ui/input";
import SortButton from "@components/atoms/SortButton";
import RequestDetailView from "./DetailView/RequestDeatailView";
import useRequests from "#/hooks/useRequests";
import useStatuses from "#/hooks/useStatuses";

interface RequestTableProps {
  projectId: Id<"projects">;
}

type RequestEntry = {
  _id: Doc<"requests">["_id"];
  title: Doc<"requests">["text"];
  description?: Doc<"requests">["description"];
  status?: Doc<"requestStatuses">;
};

const RequestTable = ({ projectId }: RequestTableProps) => {
  const { value: requests, byId } = useRequests(projectId);
  const statuses = useStatuses(projectId);
  const [sorting, setSorting] = useState<SortingState>([{ id: "title", desc: true }]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [searchTerm, setSearchTerm] = useState("");

  const mappedRequests: RequestEntry[] = useMemo(
    () =>
      (requests ?? []).map((request) => ({
        _id: request._id,
        title: request.text,
        description: request.description,
        status: statuses.byId.get(request.status),
      })),
    [statuses.byId, requests],
  );

  const filteredRequests: RequestEntry[] = useMemo(() => {
    if (!searchTerm) return mappedRequests;
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return mappedRequests.filter((request) => {
      const matchesTitle = request.title.toLowerCase().includes(normalizedSearch);
      const matchesDescription = request.description?.toLowerCase().includes(normalizedSearch);
      const matchesStatus = request.status?.displayName.toLowerCase().includes(normalizedSearch);

      return matchesTitle || matchesDescription || matchesStatus;
    });
  }, [searchTerm, mappedRequests]);

  const columns = useMemo<ColumnDef<RequestEntry>[]>(
    () => [
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
            <RequestDetailView request={request} showUpvoteButton={true}>
              <span>{title}</span>
            </RequestDetailView>
          );
        },
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: (info) => <span className="">{trimTo(info.getValue<string>(), 40)}</span>,
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
    [byId],
  );

  const table = useReactTable({
    data: filteredRequests ?? [],
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
    <div className="w-full mt-1 flex flex-col gap-4">
      <div>
        <Input
          className="max-w-80"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search"
        />
      </div>
      <div className="outline rounded-md overflow-hidden">
        <DashboardTable table={table} />
      </div>
    </div>
  );
};

export default RequestTable;
