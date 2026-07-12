"use client";

import { api } from "@wish/convex-backend/api";
import type { Id } from "@wish/convex-backend/data-model";
import { useMutation, useQuery } from "convex/react";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import StatusCreationView from "../Status/StatusCreationView";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription } from "../ui/card";

import ProjectStatusCard from "./ProjectStatusCard";

export default function ProjectStatusesManager({ projectID }: { projectID: Id<"projects"> }) {
  const statuses = useQuery(api.requestStatuses.getManagementByProject, { id: projectID });
  const reorderStatuses = useMutation(api.requestStatuses.reorder);
  const [isReordering, setIsReordering] = useState(false);

  if (!statuses) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Statuses</h3>
          <p className="text-sm text-muted-foreground">Loading the ordered workflow list…</p>
        </div>
      </div>
    );
  }

  const projectStatuses = statuses ?? [];

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
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Statuses</h3>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Statuses can be edited, reordered, and removed.
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

      <Card className="border-border/70 bg-gradient-to-b from-card to-card/80">
        <CardContent>
          <CardDescription className="mb-4">
            Manage one ordered workflow list for this project.
          </CardDescription>
          <ol className="space-y-3">
            {projectStatuses.map((status, index) => (
              <li key={status._id}>
                <ProjectStatusCard
                  status={status}
                  replacementCandidates={projectStatuses}
                  requestCount={status.requestCount}
                  canMoveUp={index > 0}
                  canMoveDown={index < projectStatuses.length - 1}
                  isLastStatus={projectStatuses.length <= 1}
                  isReordering={isReordering}
                  onMoveUp={() => moveStatus(status._id, "up")}
                  onMoveDown={() => moveStatus(status._id, "down")}
                />
              </li>
            ))}
          </ol>
          {projectStatuses.length === 0 ? (
            <CardDescription>No project statuses found.</CardDescription>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
