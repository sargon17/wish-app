import { api } from "@wish/convex-backend/api";
import type { Id } from "@wish/convex-backend/data-model";
import { useQuery } from "convex/react";
import { useMemo } from "react";

export default function useStatuses(projectId: Id<"projects">) {
  const statuses = useQuery(api.requestStatuses.getByProject, { id: projectId });

  const byId = useMemo(
    () => new Map((statuses ?? []).map((status) => [status._id, status])),
    [statuses],
  );

  return {
    value: statuses,
    byId,
  };
}
