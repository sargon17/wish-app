import type { Doc, Id } from "@wish/convex-backend/data-model";

interface GetFullStatusProps {
  id: Id<"requestStatuses">;
  statuses: Doc<"requestStatuses">[] | undefined;
}

export function findCurrentStatus({ id, statuses }: GetFullStatusProps) {
  return statuses?.find((status) => status._id === id);
}
