"use client";

import { AlertTriangle, Clock, MessageSquareText, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Doc, Id } from "@wish/convex-backend/data-model";

import {
  complaintStageLabels,
  formatDateTime,
  getComplaintAging,
  isComplaintOverdue,
} from "./complaintCaseHelpers";

type ComplaintCase = Doc<"requests"> & {
  complaintStage: string;
  ownerName?: string;
  commentCount: number;
};

export function ComplaintCaseList({
  complaints,
  selectedId,
  onSelect,
}: {
  complaints: ComplaintCase[];
  selectedId: Id<"requests"> | undefined;
  onSelect: (id: Id<"requests">) => void;
}) {
  return (
    <div className="grid gap-2">
      {complaints.map((complaint) => {
        const overdue = isComplaintOverdue(complaint.complaintStage, complaint.complaintFirstResponseDueAt);
        const isSelected = selectedId === complaint._id;

        return (
          <Button
            key={complaint._id}
            type="button"
            variant="ghost"
            className={cn(
              "h-auto justify-start rounded-lg border p-4 text-left hover:bg-muted/60",
              isSelected ? "border-orange-300 bg-orange-50/60 dark:bg-orange-950/20" : "bg-card",
            )}
            onClick={() => onSelect(complaint._id)}
          >
            <div className="grid w-full gap-3">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={overdue ? "destructive" : "secondary"}>
                      {overdue ? "Overdue" : complaintStageLabels[complaint.complaintStage] ?? "New"}
                    </Badge>
                    {complaint.complaintSeverity ? (
                      <Badge variant={complaint.complaintSeverity === "S1" ? "destructive" : "outline"}>
                        {complaint.complaintSeverity}
                      </Badge>
                    ) : null}
                    {complaint.complaintCategory ? (
                      <Badge variant="outline">{complaint.complaintCategory}</Badge>
                    ) : null}
                  </div>
                  <p className="line-clamp-2 font-medium leading-5">{complaint.text}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{getComplaintAging(complaint._creationTime)}</span>
              </div>

              {complaint.description ? (
                <p className="line-clamp-2 text-sm leading-5 text-muted-foreground">{complaint.description}</p>
              ) : null}

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <UserRound className="size-3.5" />
                  {complaint.ownerName ?? "Unassigned"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" />
                  {formatDateTime(complaint.complaintFirstResponseDueAt)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessageSquareText className="size-3.5" />
                  {complaint.commentCount}
                </span>
                {overdue ? (
                  <span className="inline-flex items-center gap-1 text-destructive">
                    <AlertTriangle className="size-3.5" />
                    Needs escalation
                  </span>
                ) : null}
              </div>
            </div>
          </Button>
        );
      })}
    </div>
  );
}
