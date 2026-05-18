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

      const requests = (
        await Promise.all(
          projects.map((project) =>
            ctx.db.query("requests").withIndex("by_project", (q) => q.eq("project", project._id)).collect(),
          ),
        )
      ).flat();

      const statuses = await ctx.db.query("requestStatuses").collect();
      const overview = buildRequestOverviewReadModel({
        requests,
        ownedProjectIds: projects.map((project) => project._id),
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
