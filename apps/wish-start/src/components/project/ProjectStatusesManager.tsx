"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Layers2, ListOrdered, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";

import StatusCreationView from "../Status/StatusCreationView";
import ProjectStatusCard from "./ProjectStatusCard";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Separator } from "../ui/separator";
import { api } from "@wish/convex-backend/api";
import type { Id } from "@wish/convex-backend/data-model";

export default function ProjectStatusesManager({ projectID }: { projectID: Id<"projects"> }) {
  const statuses = useQuery(api.requestStatuses.getManagementByProject, { id: projectID });
  const reorderStatuses = useMutation(api.requestStatuses.reorder);
  const [isReordering, setIsReordering] = useState(false);

  if (!statuses) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Statuses</h3>
          <p className="text-sm text-muted-foreground">Loading your workflow configuration…</p>
        </div>
      </div>
    );
  }

  const projectStatuses = statuses ?? [];
  const statusesInUse = projectStatuses.filter((status) => status.requestCount > 0).length;
  const totalRequests = projectStatuses.reduce((sum, status) => sum + status.requestCount, 0);

  async function moveStatus(statusId: Id<"requestStatuses">, direction: "up" | "down") {
    if (isReordering) {
      return;
    }

    const currentIndex = projectStatuses.findIndex((status) => status._id === statusId);

    if (currentIndex < 0) {
      return;
    }

    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (nextIndex < 0 || nextIndex >= projectStatuses.length) {
      return;
    }

    const nextStatuses = [...projectStatuses];
    const [movedStatus] = nextStatuses.splice(currentIndex, 1);

    if (!movedStatus) {
      return;
    }

    nextStatuses.splice(nextIndex, 0, movedStatus);

    try {
      setIsReordering(true);
      await reorderStatuses({
        projectId: projectID,
        ids: nextStatuses.map((status) => status._id),
      });
      toast.success("Status order updated");
    } catch (error) {
      console.error(error);
      toast.error("Unable to update status order");
    } finally {
      setIsReordering(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Badge variant="outline" className="border-orange-500/30 bg-orange-500/10 text-orange-200">
            <Sparkles className="size-3" />
            Workflow control
          </Badge>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Status management</h3>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Keep the board readable, the request form predictable, and the project workflow ordered end to end.
            </p>
          </div>
        </div>

        <StatusCreationView projectId={projectID}>
          <Button type="button">
            <Sparkles className="size-4" />
            New status
          </Button>
        </StatusCreationView>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card size="sm" className="border-orange-500/15 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers2 className="size-4 text-orange-300" />
              Total statuses
            </CardTitle>
            <CardDescription>All project states shown in workflow order.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{projectStatuses.length}</div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListOrdered className="size-4 text-orange-300" />
              Workflow order
            </CardTitle>
            <CardDescription>Any project status can move, edit, recolor, and be removed when board rules allow it.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{projectStatuses.length}</div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="size-4 text-orange-300" />
              Active usage
            </CardTitle>
            <CardDescription>Status slots currently referenced by requests.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{statusesInUse}</div>
            <p className="mt-2 text-xs text-muted-foreground">Tracking {totalRequests} total requests across all statuses.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-gradient-to-b from-card to-card/80">
        <CardHeader>
          <CardTitle>Project statuses</CardTitle>
          <CardDescription>
            Project workflow statuses share one ordered list. Reordering updates the workflow for every status.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {projectStatuses.map((status, index) => (
            <div key={status._id} className="space-y-3">
              <ProjectStatusCard
                status={status}
                requestCount={status.requestCount}
                canMoveUp={index > 0}
                canMoveDown={index < projectStatuses.length - 1}
                isLastStatus={projectStatuses.length <= 1}
                isReordering={isReordering}
                onMoveUp={() => moveStatus(status._id, "up")}
                onMoveDown={() => moveStatus(status._id, "down")}
              />
              {index < projectStatuses.length - 1 ? <Separator /> : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
