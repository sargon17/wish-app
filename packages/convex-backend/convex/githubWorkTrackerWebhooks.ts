import { v } from "convex/values";

import { internalMutation } from "./_generated/server";
import {
  githubConnectionOrNull,
  githubSetupOrNull,
} from "./lib/workTrackerConnection";

export const applyGitHubWebhookInternal = internalMutation({
  args: {
    installationId: v.string(),
    installationUnavailable: v.boolean(),
    removedRepositoryIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const connections = await ctx.db
      .query("workTrackerConnections")
      .withIndex("by_github_installation", (q) =>
        q.eq("data.installationId", args.installationId),
      )
      .collect();
    const setups = await ctx.db
      .query("workTrackerOAuthSetups")
      .withIndex("by_github_installation", (q) =>
        q.eq("data.installationId", args.installationId),
      )
      .collect();
    let updated = 0;
    for (const candidate of setups) {
      const setup = githubSetupOrNull(candidate);
      if (setup?.data.stage !== "ready") continue;
      if (args.installationUnavailable) {
        await ctx.db.delete(setup._id);
        updated += 1;
        continue;
      }
      const repositories = setup.data.repositories.filter(
        (repository) => !args.removedRepositoryIds.includes(repository.id),
      );
      if (repositories.length !== setup.data.repositories.length) {
        await ctx.db.patch(setup._id, { data: { ...setup.data, repositories } });
        updated += 1;
      }
    }
    for (const candidate of connections) {
      const connection = githubConnectionOrNull(candidate);
      if (!connection) {
        continue;
      }
      const selectedRepositoryRemoved = args.removedRepositoryIds.includes(
        connection.data.repository.id,
      );
      if (
        !args.installationUnavailable &&
        !selectedRepositoryRemoved &&
        args.removedRepositoryIds.length === 0
      ) {
        continue;
      }
      await ctx.db.patch(connection._id, {
        health:
          args.installationUnavailable || selectedRepositoryRemoved
            ? "needs_attention"
            : connection.health,
        updatedAt: Math.max(Date.now(), connection.updatedAt + 1),
      });
      updated += 1;
    }
    return { updated };
  },
});
