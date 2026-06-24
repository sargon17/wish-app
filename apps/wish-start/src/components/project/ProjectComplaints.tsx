"use client";

import { AlertTriangle, Inbox } from "lucide-react";
import { useQuery } from "convex/react";

import { api } from "@wish/convex-backend/api";
import type { Id } from "@wish/convex-backend/data-model";

import { Spinner } from "@/components/ui/spinner";
import RequestCard from "@/components/Request/RequestCard";

interface Props {
  projectId: Id<"projects">;
}

export default function ProjectComplaints({ projectId }: Props) {
  const complaints = useQuery(api.requests.getByProject, { id: projectId, kind: "complaint" });
  const viewerUpvotes = useQuery(api.requestUpvotes.getViewerUpvotesByProject, { projectId });

  const upvotedSet = new Set(viewerUpvotes ?? []);

  if (complaints === undefined || viewerUpvotes === undefined) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <Spinner />
      </div>
    );
  }

  if (complaints.length === 0) {
    return (
      <div className="h-full overflow-y-auto px-4 py-4 md:px-6">
        <div className="mx-auto flex min-h-80 w-full max-w-5xl flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/20 px-6 text-center">
          <Inbox className="size-8 text-muted-foreground" />
          <div>
            <p className="font-medium">No complaints yet</p>
            <p className="text-sm text-muted-foreground">
              Negative review feedback will appear here without entering the public request board.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-4 md:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Complaints</h2>
            <p className="text-sm text-muted-foreground">
              Private feedback collected from review prompts and support flows.
            </p>
          </div>
        </div>

        <div className="grid gap-3">
          {complaints.map((complaint) => (
            <div key={complaint._id}>
              <RequestCard
                request={complaint}
                upvotedSet={upvotedSet}
                showUpvoteButton={false}
              />
            </div>
          ))}
        </div>
        {complaints.length > 0 ? (
          <div className="text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <AlertTriangle className="size-3.5" />
              {complaints.length} complaint(s) total
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
