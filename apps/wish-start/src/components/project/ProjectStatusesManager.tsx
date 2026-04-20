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
  const reorderCustomStatuses = useMutation(api.requestStatuses.reorderCustom);
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

  const defaultStatuses = statuses.filter((status) => status.type === "default");
  const customStatuses = statuses.filter((status) => status.type === "custom");
  const statusesInUse = statuses.filter((status) => status.requestCount > 0).length;
  const totalRequests = statuses.reduce((sum, status) => sum + status.requestCount, 0);

  async function moveCustomStatus(statusId: Id<"requestStatuses">, direction: "up" | "down") {
    if (isReordering) {
      return;
    }

    const currentIndex = customStatuses.findIndex((status) => status._id === statusId);

    if (currentIndex < 0) {
      return;
    }

    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (nextIndex < 0 || nextIndex >= customStatuses.length) {
      return;
    }

    const nextStatuses = [...customStatuses];
    const [movedStatus] = nextStatuses.splice(currentIndex, 1);

    if (!movedStatus) {
      return;
    }

    nextStatuses.splice(nextIndex, 0, movedStatus);

    try {
      setIsReordering(true);
      await reorderCustomStatuses({
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
              Keep the board readable, the request form predictable, and your custom workflow under control.
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
            <CardDescription>Default and custom states available to the project.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{statuses.length}</div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListOrdered className="size-4 text-orange-300" />
              Custom workflow
            </CardTitle>
            <CardDescription>These can be edited and reordered inside this project.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{customStatuses.length}</div>
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
          <CardTitle>Default statuses</CardTitle>
          <CardDescription>
            Shared system statuses stay locked. They remain available across the product, but cannot be renamed or removed here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {defaultStatuses.map((status) => (
            <ProjectStatusCard key={status._id} status={status} requestCount={status.requestCount} />
          ))}
        </CardContent>
      </Card>

      <Card className="border-orange-500/15 bg-gradient-to-b from-orange-500/6 via-card to-card">
        <CardHeader>
          <CardTitle>Custom statuses</CardTitle>
          <CardDescription>
            Edit labels, adjust descriptions, tweak colors, and control the order of custom workflow steps.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {customStatuses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center">
              <p className="text-sm font-medium">No custom statuses yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add one to create project-specific workflow stages beyond the default system set.
              </p>
            </div>
          ) : null}

          {customStatuses.map((status, index) => (
            <div key={status._id} className="space-y-4">
              <ProjectStatusCard
                status={status}
                requestCount={status.requestCount}
                canMoveUp={index > 0}
                canMoveDown={index < customStatuses.length - 1}
                isReordering={isReordering}
                onMoveUp={() => moveCustomStatus(status._id, "up")}
                onMoveDown={() => moveCustomStatus(status._id, "down")}
              />
              {index < customStatuses.length - 1 ? <Separator /> : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
