import type { Doc, Id } from "@wish/convex-backend/data-model";
import { type ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { trimTo } from "#/lib/text.ts";
import StatusChip from "../Status/StatusChip";
import EntityTable from "../molecules/EntityTable";
import SortButton from "@components/atoms/SortButton";
import RequestDetailView from "./DetailView/RequestDeatailView";
import useRequests from "#/hooks/useRequests";
import useStatuses from "#/hooks/useStatuses";
import { Checkbox } from "@components/ui/checkbox";

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
  const { byId: statusesById } = useStatuses(projectId);

  const mappedRequests: RequestEntry[] = useMemo(
    () =>
      (requests ?? []).map((request) => ({
        _id: request._id,
        title: request.text,
        description: request.description,
        status: statusesById.get(request.status),
      })),
    [requests, statusesById],
  );

  const columns = useMemo<ColumnDef<RequestEntry>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllRowsSelected()}
            onCheckedChange={(v) => table.toggleAllRowsSelected(!!v)}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
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

  return (
    <div className="w-full mt-1 flex flex-col gap-4">
      <EntityTable
        data={mappedRequests ?? []}
        columns={columns}
        initialSorting={[{ id: "title", desc: true }]}
        getSearchText={(row) => [row.title, row.description, row.status?.name]}
      />
    </div>
  );
};

export default RequestTable;
