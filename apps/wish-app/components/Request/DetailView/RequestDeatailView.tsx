import { ChevronUp, User } from "lucide-react";
import { useQuery } from "convex/react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import StatusForwardBadge from "@/components/Status/StatusForwardBadge";
import CommentsPanel from "@/components/Request/Comments/CommentsPanel";
import RequestUpvoteButton from "@/components/Request/RequestUpvoteButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useRequestStatus } from "@/hooks/useRequestStatus";
import { findCurrentStatus } from "@/lib/requestStatus/findCurrentStatus";

interface Props {
  children: ReactNode;
  request: Doc<"requests">;
  upvotedSet: Set<Doc<"requests">["_id"]>;
}

export default function RequestDetailView({
  children,
  request,
  upvotedSet,
}: Props) {
  const [activeRequestId, setActiveRequestId] = useState(request._id);

  useEffect(() => {
    setActiveRequestId(request._id);
  }, [request._id]);

  const suggestions = useQuery(
    api.requests.getByClientId,
    request.clientId
      ? {
        projectId: request.project,
        clientId: request.clientId,
        excludeId: request._id,
        limit: 5,
      }
      : "skip",
  );

  const requestMap = useMemo(() => {
    const map = new Map<Doc<"requests">["_id"], Doc<"requests">>();
    map.set(request._id, request);
    suggestions?.forEach((item) => map.set(item._id, item));
    return map;
  }, [request, suggestions]);

  const activeRequest = requestMap.get(activeRequestId) ?? request;
  const activeUpvoteCount = activeRequest.upvoteCount ?? 0;
  const activeIsUpvoted = upvotedSet.has(activeRequest._id);

  const requestStatus = useRequestStatus({ request: activeRequest });

  const handleSave = () => {
    requestStatus.methods.save();
  };

  const hasChanges = requestStatus.state.hasChanged;
  const hasSuggestions = (suggestions?.length ?? 0) > 0;
  const isOriginalRequest = activeRequest._id === request._id;
  return (
    <Dialog>
      <DialogTrigger asChild className="cursor-pointer">
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-106.25 md:max-w-5xl max-h-[85vh] overflow-hidden">
        <div
          className={
            hasSuggestions
              ? "grid gap-6 md:grid-cols-[minmax(0,1fr)_360px]"
              : "grid gap-6"
          }
        >
          <div className="flex min-h-0 flex-col gap-6">
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-3">
                <DialogTitle className="capitalize">{activeRequest.text}</DialogTitle>
                <RequestUpvoteButton
                  requestId={activeRequest._id}
                  projectId={activeRequest.project}
                  upvoteCount={activeUpvoteCount}
                  isUpvoted={activeIsUpvoted}
                  size="default"
                />
                {requestStatus.state.current && <StatusForwardBadge status={requestStatus} />}
              </div>
              <div>
                <div className="*:flex *:gap-2 *:items-center flex gap-2 text-foreground/50 text-sm mb-8">
                  <div>
                    <User size={16} />
                    {activeRequest.clientId}
                  </div>
                  <div className="text-foreground/20">/</div>
                  <div>
                    <p>ID:</p>
                    {activeRequest._id}
                  </div>
                </div>
                <div>
                  <p className="text-secondary-foreground text-sm">{activeRequest.description}</p>
                </div>
              </div>
            </DialogHeader>

            <CommentsPanel request={activeRequest} />

            {hasChanges && (
              <DialogFooter>
                <Button onClick={handleSave}>Save</Button>
              </DialogFooter>
            )}
          </div>

          {hasSuggestions && (
            <div className="flex min-h-0 flex-col">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Other suggestions
                </p>
                {!isOriginalRequest && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => setActiveRequestId(request._id)}
                  >
                    Back to original
                  </Button>
                )}
              </div>
              <Separator className="my-3" />
              <div className="flex flex-col">
                {suggestions?.map((suggestion) => {
                  const status = findCurrentStatus({
                    id: suggestion.status,
                    statuses: requestStatus.state.statuses,
                  });
                  const isActive = suggestion._id === activeRequest._id;
                  return (
                    <Button
                      key={suggestion._id}
                      type="button"
                      variant="ghost"
                      className={
                        isActive
                          ? "h-auto justify-between gap-4 rounded-none border-b border-border/60 px-0 py-3 text-left text-accent-foreground hover:bg-transparent last:border-b-0"
                          : "h-auto justify-between gap-4 rounded-none border-b border-border/60 px-0 py-3 text-left hover:bg-transparent last:border-b-0"
                      }
                      onClick={() => setActiveRequestId(suggestion._id)}
                    >
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="truncate text-sm font-medium text-foreground">
                          {suggestion.text}
                        </span>
                        {status && (
                          <Badge variant="secondary" className="w-fit text-[10px]">
                            {status.displayName}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <ChevronUp className="h-3.5 w-3.5" />
                        <span>{suggestion.upvoteCount ?? 0}</span>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
