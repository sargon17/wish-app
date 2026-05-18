import type { QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { buildRequestOverviewReadModel } from "./lib/requestOverviewReadModel";

export const requestOverview = query({
  args: {},
  handler: async (ctx) => {
    try {
      const identity = await ctx.auth.getUserIdentity();

      if (identity === null) {
        throw new Error("Not authenticated");
      }

      const user = await ctx.db
        .query("users")
        .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
        .unique();

      if (!user) {
        throw new Error("Unauthenticated call to query");
      }

      const projects = await ctx.db
        .query("projects")
        .withIndex("by_user", (q) => q.eq("user", user._id))
        .collect();

      const ownedProjectIds = projects.map((project) => project._id);

      const requests = (
        await Promise.all(
          ownedProjectIds.map((projectId) =>
            ctx.db.query("requests").withIndex("by_project", (q) => q.eq("project", projectId)).collect(),
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
    ctx.db.query("requestStatuses").filter((q) => q.eq(q.field("project"), undefined)).collect(),
    ...ownedProjectIds.map((projectId) =>
      ctx.db.query("requestStatuses").withIndex("by_project", (q) => q.eq("project", projectId)).collect(),
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
