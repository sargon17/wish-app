import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { query } from "./_generated/server";
import { getCurrentUser } from "./lib/authorization";
import { buildRequestOverviewReadModel } from "./lib/requestOverviewReadModel";

export const requestOverview = query({
  args: {},
  handler: async (ctx) => {
    try {
      const user = await getCurrentUser(ctx);

      const projects = await ctx.db
        .query("projects")
        .withIndex("by_user", (q) => q.eq("user", user._id))
        .collect();

      const ownedProjectIds = projects.map((project) => project._id);

      const requests = (
        await Promise.all(
          ownedProjectIds.map((projectId) =>
            ctx.db
              .query("requests")
              .withIndex("by_project", (q) => q.eq("project", projectId))
              .collect(),
          ),
        )
      ).flat();

      const statuses = await loadRelevantRequestStatuses(ctx, ownedProjectIds);
      const overview = buildRequestOverviewReadModel({
        requests,
        ownedProjectIds,
        projects,
        statuses,
        now: Date.now(),
      });

      return overview;
    } catch (error) {
      console.error(error);
      throw new Error("Failed to load request stats");
    }
  },
});

async function loadRelevantRequestStatuses(ctx: QueryCtx, ownedProjectIds: Id<"projects">[]) {
  const statuses = await Promise.all([
    ctx.db
      .query("requestStatuses")
      .withIndex("by_project", (q) => q.eq("project", undefined))
      .collect(),
    ...ownedProjectIds.map((projectId) =>
      ctx.db
        .query("requestStatuses")
        .withIndex("by_project", (q) => q.eq("project", projectId))
        .collect(),
    ),
  ]);

  const dedupedStatuses = new Map<string, Doc<"requestStatuses">>();
  for (const statusGroup of statuses) {
    for (const status of statusGroup) {
      dedupedStatuses.set(status._id.toString(), status);
    }
  }

  return Array.from(dedupedStatuses.values());
}
