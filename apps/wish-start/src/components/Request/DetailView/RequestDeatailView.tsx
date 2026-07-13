import useRequests from "#/hooks/useRequests";
import { api } from "@wish/convex-backend/api";
import type { Doc } from "@wish/convex-backend/data-model";
import { useQuery } from "convex/react";
import { ChevronUp, Mail, User } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import CommentsPanel from "@/components/Request/Comments/CommentsPanel";
import WorkItemHandoffAction from "@/components/Request/DetailView/WorkItemHandoffAction";
import RequestUpvoteButton from "@/components/Request/RequestUpvoteButton";
import StatusForwardBadge from "@/components/Status/StatusForwardBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useRequestStatus } from "@/hooks/useRequestStatus";
import { findCurrentStatus } from "@/lib/requestStatus/findCurrentStatus";

interface Props {
  children?: ReactNode;
  request: Doc<"requests">;
  showUpvoteButton?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function RequestDetailView({
  children,
  request,
  showUpvoteButton = true,
  open,
  onOpenChange,
}: Props) {
  const [activeRequestId, setActiveRequestId] = useState(request._id);
  const requests = useRequests(request.project);

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

  const requestStatus = useRequestStatus({ request: activeRequest });

  const handleSave = () => {
    requestStatus.methods.save();
  };

  const hasChanges = requestStatus.state.hasChanged;
  const hasSuggestions = (suggestions?.length ?? 0) > 0;
  const isOriginalRequest = activeRequest._id === request._id;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children ? (
        <DialogTrigger asChild className="cursor-pointer">
          {children}
        </DialogTrigger>
      ) : null}
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-106.25 md:max-w-5xl">
        <div
          className={
            hasSuggestions ? "grid gap-6 md:grid-cols-[minmax(0,1fr)_360px]" : "grid gap-6"
          }
        >
          <div className="flex min-h-0 flex-col gap-6">
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-3">
                <DialogTitle className="capitalize">{activeRequest.text}</DialogTitle>
                {showUpvoteButton ? (
                  <RequestUpvoteButton
                    requestId={activeRequest._id}
                    projectId={activeRequest.project}
                    upvoteCount={activeRequest.upvoteCount ?? 0}
                    isUpvoted={requests.upvotedByUser.has(activeRequest._id)}
                    size="default"
                  />
                ) : null}
                {requestStatus.state.current && <StatusForwardBadge status={requestStatus} />}
                <div className="ml-auto">
                  <WorkItemHandoffAction request={activeRequest} />
                </div>
              </div>
              <div>
                <div className="mb-8 flex flex-wrap gap-3 text-sm text-foreground/50 *:flex *:items-center *:gap-2">
                  {activeRequest.requesterEmail ? (
                    <>
                      <div>
                        <Mail size={16} />
                        <a
                          className="hover:text-foreground"
                          href={`mailto:${activeRequest.requesterEmail}`}
                        >
                          {activeRequest.requesterEmail}
                        </a>
                      </div>
                      <div className="text-foreground/20">/</div>
                    </>
                  ) : null}
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
                  <p className="text-sm text-secondary-foreground">{activeRequest.description}</p>
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
                <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
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
                          ? "h-auto justify-between gap-4 rounded-none border-b border-border/60 px-0 py-3 text-left text-accent-foreground last:border-b-0 hover:bg-transparent"
                          : "h-auto justify-between gap-4 rounded-none border-b border-border/60 px-0 py-3 text-left last:border-b-0 hover:bg-transparent"
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
