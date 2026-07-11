import { useRequestBoardState } from "#/hooks/useRequestBoardState";
import useStatuses from "#/hooks/useStatuses";
import DashboardBoardColumn from "@components/dashboard/DashboardBoardColumn";
import type { Id } from "@wish/convex-backend/data-model";

type RequestKanbanProps = {
  projectId: Id<"projects">;
  kind?: "request" | "complaint";
};

const RequestKanban = ({ projectId, kind }: RequestKanbanProps) => {
  const statuses = useStatuses(projectId);
  const { handleRequestDrop } = useRequestBoardState();

  if (!statuses) return;

  return (
    <>
      {(statuses.value ?? []).map((status) => (
        <DashboardBoardColumn
          key={status._id}
          status={status}
          projectId={projectId}
          kind={kind}
          onDropRequest={handleRequestDrop}
        />
      ))}
    </>
  );
};

export default RequestKanban;
