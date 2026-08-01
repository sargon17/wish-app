import { type Infer, v } from "convex/values";

import { internal } from "./_generated/api";
import { action, internalMutation, internalQuery, mutation } from "./_generated/server";
import { assertProjectOwner, getCurrentUser } from "./lib/authorization";
import {
  createGitHubInstallationToken,
  listGitHubInstallationRepositories,
} from "./lib/githubApp";
import { getGitHubAppAuthConfig } from "./lib/githubConnection";
import {
  githubConnectionOrNull,
  githubSetupOrNull,
} from "./lib/workTrackerConnection";
import { githubRepositoryValidator } from "./lib/workTrackerTypes";

export const getGitHubSetupForActionInternal = internalQuery({
  args: {
    projectId: v.id("projects"),
    setupId: v.id("workTrackerOAuthSetups"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertProjectOwner(ctx, args.projectId, user._id);
    const setup = githubSetupOrNull(await ctx.db.get(args.setupId));
    if (
      !setup ||
      setup.projectId !== args.projectId ||
      setup.data.stage !== "ready" ||
      setup.expiresAt <= Date.now()
    ) {
      throw new Error("GitHub setup is no longer available");
    }
    const connection = githubConnectionOrNull(
      await ctx.db
        .query("workTrackerConnections")
        .withIndex("by_project_provider", (q) =>
          q.eq("projectId", args.projectId).eq("provider", "github"),
        )
        .unique(),
    );
    return {
      ...setup,
      data: setup.data,
      connectionSnapshot: connection
        ? { id: connection._id, updatedAt: connection.updatedAt }
        : null,
    };
  },
});

export const selectGitHubRepositoryInternal = internalMutation({
  args: {
    projectId: v.id("projects"),
    setupId: v.id("workTrackerOAuthSetups"),
    repository: githubRepositoryValidator,
    connectionSnapshot: v.union(
      v.null(),
      v.object({ id: v.id("workTrackerConnections"), updatedAt: v.number() }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertProjectOwner(ctx, args.projectId, user._id);
    const setup = githubSetupOrNull(await ctx.db.get(args.setupId));
    if (
      !setup ||
      setup.projectId !== args.projectId ||
      setup.data.stage !== "ready" ||
      setup.expiresAt <= Date.now()
    ) {
      throw new Error("GitHub setup is no longer available");
    }
    if (!setup.data.repositories.some((candidate) => candidate.id === args.repository.id)) {
      throw new Error("GitHub repository is not available");
    }

    const existing = githubConnectionOrNull(
      await ctx.db
        .query("workTrackerConnections")
        .withIndex("by_project_provider", (q) =>
          q.eq("projectId", args.projectId).eq("provider", "github"),
        )
        .unique(),
    );
    const connectionIsCurrent = args.connectionSnapshot
      ? existing?._id === args.connectionSnapshot.id &&
        existing.updatedAt === args.connectionSnapshot.updatedAt
      : existing === null;
    if (!connectionIsCurrent) {
      throw new Error("GitHub connection changed; reload and try again");
    }
    const now = Date.now();
    const data = {
      provider: "github" as const,
      installationId: setup.data.installationId,
      accountLogin: setup.data.accountLogin,
      repository: args.repository,
    };
    if (existing) {
      await ctx.db.patch(existing._id, {
        health: "active",
        destinationLabel: args.repository.fullName,
        data,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("workTrackerConnections", {
        projectId: args.projectId,
        provider: "github",
        health: "active",
        destinationLabel: args.repository.fullName,
        data,
        createdBy: user._id,
        createdAt: now,
        updatedAt: now,
      });
    }
    await ctx.db.delete(setup._id);
    return { accountLogin: setup.data.accountLogin, repository: args.repository };
  },
});

export const selectGitHubRepository = action({
  args: {
    projectId: v.id("projects"),
    setupId: v.id("workTrackerOAuthSetups"),
    repositoryId: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    accountLogin: string;
    repository: Infer<typeof githubRepositoryValidator>;
  }> => {
    const setup = await ctx.runQuery(
      internal.githubWorkTrackerConnections.getGitHubSetupForActionInternal,
      { projectId: args.projectId, setupId: args.setupId },
    );
    const candidate = setup.data.repositories.find(
      (repository) => repository.id === args.repositoryId,
    );
    if (!candidate) throw new Error("GitHub repository is not available");
    let repository;
    try {
      const accessToken = await createGitHubInstallationToken({
        config: getGitHubAppAuthConfig(),
        installationId: setup.data.installationId,
        repositoryIds: [candidate.id],
      });
      repository = (await listGitHubInstallationRepositories(accessToken)).find(
        (current) => current.id === candidate.id,
      );
    } catch {
      throw new Error("Unable to verify the GitHub repository");
    }
    if (!repository) throw new Error("GitHub repository is no longer available");
    return await ctx.runMutation(
      internal.githubWorkTrackerConnections.selectGitHubRepositoryInternal,
      {
        projectId: args.projectId,
        setupId: args.setupId,
        repository,
        connectionSnapshot: setup.connectionSnapshot,
      },
    );
  },
});

export const getGitHubConnectionForActionInternal = internalQuery({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertProjectOwner(ctx, args.projectId, user._id);
    return githubConnectionOrNull(
      await ctx.db
        .query("workTrackerConnections")
        .withIndex("by_project_provider", (q) =>
          q.eq("projectId", args.projectId).eq("provider", "github"),
        )
        .unique(),
    );
  },
});

export const syncGitHubRepositoriesInternal = internalMutation({
  args: {
    connectionId: v.id("workTrackerConnections"),
    installationId: v.string(),
    connectionUpdatedAt: v.number(),
    selectedRepository: v.union(v.null(), githubRepositoryValidator),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const connection = githubConnectionOrNull(await ctx.db.get(args.connectionId));
    if (!connection) throw new Error("GitHub connection not found");
    await assertProjectOwner(ctx, connection.projectId, user._id);
    if (
      connection.data.installationId !== args.installationId ||
      connection.updatedAt !== args.connectionUpdatedAt
    ) {
      return false;
    }
    await ctx.db.patch(connection._id, {
      health: args.selectedRepository ? "active" : "needs_attention",
      destinationLabel: args.selectedRepository?.fullName ?? connection.destinationLabel,
      data: args.selectedRepository
        ? { ...connection.data, repository: args.selectedRepository }
        : connection.data,
      updatedAt: Date.now(),
    });
    return true;
  },
});

export const listGitHubRepositories = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const connection = await ctx.runQuery(
      internal.githubWorkTrackerConnections.getGitHubConnectionForActionInternal,
      args,
    );
    if (!connection) throw new Error("GitHub connection not found");
    try {
      const accessToken = await createGitHubInstallationToken({
        config: getGitHubAppAuthConfig(),
        installationId: connection.data.installationId,
      });
      const repositories = await listGitHubInstallationRepositories(accessToken);
      const selectedRepository =
        repositories.find((candidate) => candidate.id === connection.data.repository.id) ?? null;
      const synced = await ctx.runMutation(
        internal.githubWorkTrackerConnections.syncGitHubRepositoriesInternal,
        {
          connectionId: connection._id,
          installationId: connection.data.installationId,
          connectionUpdatedAt: connection.updatedAt,
          selectedRepository,
        },
      );
      if (!synced) throw new Error("GitHub connection changed; reload and try again");
      return repositories;
    } catch {
      throw new Error("Unable to load GitHub repositories");
    }
  },
});

export const changeGitHubRepositoryInternal = internalMutation({
  args: {
    projectId: v.id("projects"),
    connectionId: v.id("workTrackerConnections"),
    installationId: v.string(),
    connectionUpdatedAt: v.number(),
    repository: githubRepositoryValidator,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertProjectOwner(ctx, args.projectId, user._id);
    const connection = githubConnectionOrNull(await ctx.db.get(args.connectionId));
    if (
      !connection ||
      connection.projectId !== args.projectId ||
      connection.data.installationId !== args.installationId ||
      connection.updatedAt !== args.connectionUpdatedAt
    ) {
      throw new Error("GitHub connection changed; reload and try again");
    }
    await ctx.db.patch(connection._id, {
      health: "active",
      destinationLabel: args.repository.fullName,
      data: { ...connection.data, repository: args.repository },
      updatedAt: Date.now(),
    });
    return { repository: args.repository };
  },
});

export const changeGitHubRepository = action({
  args: { projectId: v.id("projects"), repositoryId: v.string() },
  handler: async (
    ctx,
    args,
  ): Promise<{ repository: Infer<typeof githubRepositoryValidator> }> => {
    const connection = await ctx.runQuery(
      internal.githubWorkTrackerConnections.getGitHubConnectionForActionInternal,
      { projectId: args.projectId },
    );
    if (!connection) throw new Error("GitHub connection not found");
    let repositories;
    try {
      const accessToken = await createGitHubInstallationToken({
        config: getGitHubAppAuthConfig(),
        installationId: connection.data.installationId,
      });
      repositories = await listGitHubInstallationRepositories(accessToken);
    } catch {
      throw new Error("Unable to load GitHub repositories");
    }
    const repository = repositories.find((candidate) => candidate.id === args.repositoryId);
    if (!repository) throw new Error("GitHub repository is not available");
    return await ctx.runMutation(
      internal.githubWorkTrackerConnections.changeGitHubRepositoryInternal,
      {
        projectId: args.projectId,
        connectionId: connection._id,
        installationId: connection.data.installationId,
        connectionUpdatedAt: connection.updatedAt,
        repository,
      },
    );
  },
});

export const disconnectGitHub = mutation({
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
    if (connection) await ctx.db.delete(connection._id);
    return { disconnected: true };
  },
});
