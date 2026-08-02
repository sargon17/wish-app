"use client";

import type { Id } from "@wish/convex-backend/data-model";

import LinearWorkTrackerCard from "./LinearWorkTrackerCard";

export default function ProjectWorkTrackersManager({
  linearResult,
  projectId,
}: {
  linearResult?: string;
  projectId: Id<"projects">;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3>Work tools</h3>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Send Requests and Complaints to the tools where your team plans and delivers work.
            Creation is always an explicit Project Owner action.
          </p>
        </div>
      </div>

      <LinearWorkTrackerCard projectId={projectId} linearResult={linearResult} />
    </div>
  );
}
