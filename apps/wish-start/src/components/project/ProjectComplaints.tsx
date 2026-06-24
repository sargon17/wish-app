"use client";

import { AlertTriangle, Inbox } from "lucide-react";
import { useQuery } from "convex/react";

import { api } from "@wish/convex-backend/api";
import type { Id } from "@wish/convex-backend/data-model";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  projectId: Id<"projects">;
}

export default function ProjectComplaints({ projectId }: Props) {
  const complaints = useQuery(api.requests.getByProject, { id: projectId, kind: "complaint" });

  if (complaints === undefined) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-sm text-muted-foreground">
        Loading complaints...
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
          <Badge variant="secondary" className="gap-1.5">
            <AlertTriangle className="size-3.5" />
            {complaints.length}
          </Badge>
        </div>

        {complaints.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/20 px-6 text-center">
            <Inbox className="size-8 text-muted-foreground" />
            <div>
              <p className="font-medium">No complaints yet</p>
              <p className="text-sm text-muted-foreground">
                Negative review feedback will appear here without entering the public request board.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            {complaints.map((complaint) => (
              <Card key={complaint._id} className="rounded-lg">
                <CardHeader className="gap-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <CardTitle className="text-base">{complaint.text}</CardTitle>
                    <time className="text-xs text-muted-foreground">
                      {new Date(complaint._creationTime).toLocaleString()}
                    </time>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>Client {complaint.clientId}</span>
                    <span>/</span>
                    <span>{complaint._id}</span>
                  </div>
                </CardHeader>
                {complaint.description && (
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-secondary-foreground">
                      {complaint.description}
                    </p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
