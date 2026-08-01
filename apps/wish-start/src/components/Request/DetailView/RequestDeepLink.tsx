import { useLocation, useRouter } from "@tanstack/react-router";
import type { Id } from "@wish/convex-backend/data-model";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import useRequests from "@/hooks/useRequests";
import { locationWithoutRequestItem } from "@/lib/requestDeepLink";

import RequestDetailView from "./RequestDeatailView";

interface Props {
  projectId: Id<"projects">;
  itemId: string | null;
  kind?: "request" | "complaint";
}

export default function RequestDeepLink({ projectId, itemId, kind }: Props) {
  const requests = useRequests(projectId, kind);
  const location = useLocation();
  const router = useRouter();
  const lastRejectedItem = useRef<string | null | undefined>(undefined);
  const request = itemId
    ? requests.value?.find((candidate) => candidate._id === itemId)
    : undefined;
  const isMalformedItem = itemId === null;

  useEffect(() => {
    if (!isMalformedItem && (requests.isPending || requests.error || request)) return;

    if (lastRejectedItem.current !== itemId) {
      toast.error(kind === "complaint" ? "Complaint not found" : "Request not found");
      lastRejectedItem.current = itemId;
    }

    router.history.replace(locationWithoutRequestItem(location.pathname, location.searchStr));
  }, [
    itemId,
    isMalformedItem,
    kind,
    location.pathname,
    location.searchStr,
    request,
    requests.error,
    requests.isPending,
    router,
  ]);

  if (!request) return null;

  return (
    <RequestDetailView
      request={request}
      showUpvoteButton={kind !== "complaint"}
      open
      onOpenChange={(open) => {
        if (open) return;
        router.history.replace(locationWithoutRequestItem(location.pathname, location.searchStr));
      }}
    />
  );
}
