import { v } from "convex/values";

import { query } from "./_generated/server";
import { assertProjectOwner, getCurrentUser } from "./lib/authorization";
import { isGitHubConfigured } from "./lib/githubConnection";
import {
  githubConnectionOrNull,
  githubSetupOrNull,
} from "./lib/workTrackerConnection";

export const getGitHubSettings = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertProjectOwner(ctx, args.projectId, user._id);
    const connection = githubConnectionOrNull(
      await ctx.db
        .query("workTrackerConnections")
        .withIndex("by_project_provider", (q) =>
          q.eq("projectId", args.projectId).eq("provider", "github"),
        )
        .unique(),
    );
    const setup = githubSetupOrNull(
      await ctx.db
        .query("workTrackerOAuthSetups")
        .withIndex("by_project_provider", (q) =>
          q.eq("projectId", args.projectId).eq("provider", "github"),
        )
        .unique(),
    );
    const readySetupData =
      setup?.data.stage === "ready" && setup.expiresAt > Date.now() ? setup : null;
    return {
      configured: await isGitHubConfigured(),
      cleanupSetupId:
        setup &&
        !readySetupData &&
        setup.data.stage !== "discarding" &&
        !(setup.data.stage === "pending" && setup.consumedAt)
          ? setup._id
          : null,
      connection: connection
        ? {
            health: connection.health,
            destinationLabel: connection.destinationLabel,
            installationId: connection.data.installationId,
            accountLogin: connection.data.accountLogin,
            repository: connection.data.repository,
          }
        : null,
      setup: readySetupData?.data.stage === "ready"
        ? {
            id: readySetupData._id,
            expiresAt: readySetupData.expiresAt,
            installationId: readySetupData.data.installationId,
            accountLogin: readySetupData.data.accountLogin,
            repositories: readySetupData.data.repositories,
            replacesInstallation:
              Boolean(connection) &&
              connection?.data.installationId !== readySetupData.data.installationId,
          }
        : null,
    };
  },
});
