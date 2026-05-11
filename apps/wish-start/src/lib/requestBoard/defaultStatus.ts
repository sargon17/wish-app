import type { Doc, Id } from "@wish/convex-backend/data-model";

type DialogMethod = "create" | "edit";

export function getRequestDialogDefaultStatus({
  method,
  request,
  explicitStatus,
  statuses,
}: {
  method: DialogMethod;
  request?: Doc<"requests">;
  explicitStatus?: Id<"requestStatuses">;
  statuses?: Doc<"requestStatuses">[];
}) {
  if (method === "edit" && request) {
    return request.status;
  }

  if (explicitStatus) {
    return explicitStatus;
  }

  return statuses?.[0]?._id ?? "";
}
