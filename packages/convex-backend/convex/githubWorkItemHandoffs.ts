import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { assertProjectOwner, getCurrentUser } from "./lib/authorization";
import {
  createGitHubInstallationToken,
  GitHubInstallationTokenError,
} from "./lib/githubApp";
import { getGitHubAppAuthConfig } from "./lib/githubConnection";
import { findGitHubIssueBySource } from "./lib/githubIssue";
import { githubConnectionOrNull } from "./lib/workTrackerConnection";

export const getDeliveryContextInternal = internalQuery({
  args: { projectId: v.id("projects"), requestId: v.id("requests") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const project = await assertProjectOwner(ctx, args.projectId, user._id);
    const request = await ctx.db.get(args.requestId);
    if (!request || request.project !== args.projectId) {
      throw new Error("Request does not belong to the Project Board");
    }
    const connection = githubConnectionOrNull(
      await ctx.db
        .query("workTrackerConnections")
        .withIndex("by_project_provider", (q) =>
          q.eq("projectId", args.projectId).eq("provider", "github"),
        )
        .unique(),
    );
    return { connection, project, request };
  },
});

export const getForReconciliationInternal = internalQuery({
  args: { handoffId: v.id("workItemHandoffs") },
  handler: async (ctx, args) => {
    const handoff = await ctx.db.get(args.handoffId);
    if (
      !handoff ||
      handoff.provider !== "github" ||
      handoff.recovery.provider !== "github" ||
      handoff.lifecycle.state !== "unknown"
    ) {
      return null;
    }
    const connection = githubConnectionOrNull(
      await ctx.db
        .query("workTrackerConnections")
        .withIndex("by_project_provider", (q) =>
          q.eq("projectId", handoff.projectId).eq("provider", "github"),
        )
        .unique(),
    );
    if (
      !connection ||
      connection.data.installationId !== handoff.recovery.installationId ||
      connection.data.repository.id !== handoff.recovery.repositoryId
    ) {
      return null;
    }
    return { connection, handoff };
  },
});

export const markConnectionNeedsAttentionInternal = internalMutation({
  args: {
    connectionId: v.id("workTrackerConnections"),
    installationId: v.string(),
    repositoryId: v.string(),
  },
  handler: async (ctx, args) => {
    const connection = githubConnectionOrNull(await ctx.db.get(args.connectionId));
    if (
      !connection ||
      connection.data.installationId !== args.installationId ||
      connection.data.repository.id !== args.repositoryId
    ) {
      return false;
    }
    await ctx.db.patch(connection._id, {
      health: "needs_attention",
      updatedAt: Math.max(Date.now(), connection.updatedAt + 1),
    });
    return true;
  },
});

export const reconcileInternal = internalAction({
  args: { handoffId: v.id("workItemHandoffs") },
  handler: async (ctx, args): Promise<Doc<"workItemHandoffs"> | null> => {
    const target = await ctx.runQuery(
      internal.githubWorkItemHandoffs.getForReconciliationInternal,
      args,
    );
    if (!target || target.handoff.recovery.provider !== "github") return null;

    let accessToken: string;
    try {
      accessToken = await createGitHubInstallationToken({
        config: getGitHubAppAuthConfig(),
        installationId: target.handoff.recovery.installationId,
        repositoryIds: [target.handoff.recovery.repositoryId],
      });
    } catch (error) {
      if (error instanceof GitHubInstallationTokenError && error.needsAttention) {
        await ctx.runMutation(
          internal.githubWorkItemHandoffs.markConnectionNeedsAttentionInternal,
          {
            connectionId: target.connection._id,
            installationId: target.connection.data.installationId,
            repositoryId: target.connection.data.repository.id,
          },
        );
      } else {
        await ctx.runMutation(internal.workItemHandoffs.completeReconciliationInternal, {
          handoffId: target.handoff._id,
          expectedReconciliationCount: target.handoff.reconciliationCount,
        });
      }
      return await ctx.runQuery(internal.workItemHandoffs.getByIdInternal, args);
    }

    const repository = target.connection.data.repository;
    const result = await findGitHubIssueBySource({
      accessToken,
      repository: {
        id: repository.id,
        owner: repository.owner,
        name: repository.name,
      },
      sourceUrl: target.handoff.recovery.sourceUrl,
      startedAt: target.handoff.recovery.startedAt,
    });
    console.info("work_item_handoff_reconciliation", {
      provider: "github",
      handoffId: target.handoff._id,
      reconciliationCount:
        target.handoff.reconciliationCount + (result.needsAttention ? 0 : 1),
      state: result.needsAttention ? "skipped" : result.state,
      needsAttention: result.needsAttention,
    });
    if (result.needsAttention) {
      await ctx.runMutation(
        internal.githubWorkItemHandoffs.markConnectionNeedsAttentionInternal,
        {
          connectionId: target.connection._id,
          installationId: target.connection.data.installationId,
          repositoryId: target.connection.data.repository.id,
        },
      );
      return await ctx.runQuery(internal.workItemHandoffs.getByIdInternal, args);
    }

    await ctx.runMutation(internal.workItemHandoffs.completeReconciliationInternal, {
      handoffId: target.handoff._id,
      expectedReconciliationCount: target.handoff.reconciliationCount,
      externalIdentity: result.state === "succeeded" ? result.externalIdentity : undefined,
    });
    return await ctx.runQuery(internal.workItemHandoffs.getByIdInternal, args);
  },
});
