import type { Doc } from "@wish/convex-backend/data-model";

interface FindNextStatusProps {
  current: Doc<"requestStatuses">;
  statuses: Doc<"requestStatuses">[];
}

export function findNextStatus({ current, statuses }: FindNextStatusProps) {
  const currentIndex = statuses.indexOf(current);
  if (currentIndex === statuses.length - 1) return current;

  return statuses.slice(currentIndex + 1, currentIndex + 2)[0];
}
