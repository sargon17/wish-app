import { v } from "convex/values";

import { query } from "./_generated/server";
import { assertProjectOwner, getCurrentUser } from "./lib/authorization";
import { isLinearConfigured } from "./lib/linearConnection";

export const getLinearSettings = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertProjectOwner(ctx, args.projectId, user._id);
    const connection = await ctx.db
      .query("workTrackerConnections")
      .withIndex("by_project_provider", (q) =>
        q.eq("projectId", args.projectId).eq("provider", "linear"),
      )
      .unique();
    const setup = await ctx.db
      .query("workTrackerOAuthSetups")
      .withIndex("by_project_provider", (q) =>
        q.eq("projectId", args.projectId).eq("provider", "linear"),
      )
      .unique();
    const readySetup =
      setup?.data.stage === "ready" && setup.expiresAt > Date.now()
        ? {
            id: setup._id,
            expiresAt: setup.expiresAt,
            authorization: setup.data.authorization,
          }
        : null;

    return {
      configured: isLinearConfigured(),
      cleanupSetupId:
        setup && setup.data.stage !== "pending" && !readySetup ? setup._id : null,
      connection: connection
        ? {
            health: connection.health,
            destinationLabel: connection.destinationLabel,
            organization: {
              id: connection.data.organizationId,
              name: connection.data.organizationName,
              urlKey: connection.data.organizationUrlKey,
            },
            team: {
              id: connection.data.teamId,
              key: connection.data.teamKey,
              name: connection.data.teamName,
            },
          }
        : null,
      setup: readySetup
        ? {
            id: readySetup.id,
            expiresAt: readySetup.expiresAt,
            organization: readySetup.authorization.organization,
            teams: readySetup.authorization.teams,
            replacesWorkspace:
              Boolean(connection) &&
              connection?.data.organizationId !== readySetup.authorization.organization.id,
          }
        : null,
    };
  },
});
