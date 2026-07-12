import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "@wish/convex-backend/api";
import type { Id } from "@wish/convex-backend/data-model";
import { useMemo } from "react";

export default function useStatuses(projectId: Id<"projects">) {
  const { data: statuses } = useQuery(
    convexQuery(api.requestStatuses.getByProject, { id: projectId }),
  );

  const byId = useMemo(
    () => new Map((statuses ?? []).map((status) => [status._id, status])),
    [statuses],
  );

  return {
    value: statuses,
    byId,
  };
}
