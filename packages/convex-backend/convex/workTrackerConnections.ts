import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
} from "./_generated/server";
import { assertProjectOwner, getCurrentUser } from "./lib/authorization";
import {
  getLinearConfig,
  LINEAR_CREDENTIAL_LEASE_MS,
  LINEAR_REFRESH_EARLY_MS,
  parseStoredCredentials,
  serializeCredentials,
} from "./lib/linearConnection";
import {
  discoverLinearWorkspace,
  refreshLinearCredentials,
  revokeLinearCredentials,
} from "./lib/linearOAuth";
import {
  decryptWorkTrackerSecret,
  encryptWorkTrackerSecret,
} from "./lib/workTrackerSecrets";
import { assertNoBlockingLinearHandoffs } from "./lib/workTrackerGuards";
import { isWorkTrackerCredentialLeaseActive } from "./lib/workTrackerConnection";


export const selectLinearTeamInternal = internalMutation({
  args: {
    projectId: v.id("projects"),
    setupId: v.id("workTrackerOAuthSetups"),
    teamId: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    connectionId?: Id<"workTrackerConnections">;
    organization: { id: string; name: string; urlKey: string };
    pendingRevocation?: { ciphertext: string; iv: string };
    team: { id: string; key: string; name: string };
  }> => {
    const user = await getCurrentUser(ctx);
    await assertProjectOwner(ctx, args.projectId, user._id);
    const setup = await ctx.db.get(args.setupId);
    const authorization = setup?.data.stage === "ready" ? setup.data.authorization : undefined;
    const encryptedCredentials =
      setup?.data.stage === "ready" ? setup.data.encryptedCredentials : undefined;
    if (
      !setup ||
      setup.projectId !== args.projectId ||
      setup.provider !== "linear" ||
      setup.expiresAt <= Date.now() ||
      !authorization ||
      !encryptedCredentials
    ) {
      throw new Error("Linear setup is no longer available");
    }
    const team = authorization.teams.find((candidate) => candidate.id === args.teamId);
    if (!team) {
      throw new Error("Linear team is not available");
    }

    const existing = await ctx.db
      .query("workTrackerConnections")
      .withIndex("by_project_provider", (q) =>
        q.eq("projectId", args.projectId).eq("provider", "linear"),
      )
      .unique();
    const now = Date.now();
    if (isWorkTrackerCredentialLeaseActive(existing?.data.credentialLease, now)) {
      throw new Error("Linear credentials are busy; try again shortly");
    }
    if (existing?.data.pendingRevocation) {
      throw new Error("The previous Linear authorization is still being revoked");
    }
    if (existing) {
      await assertNoBlockingLinearHandoffs(ctx, args.projectId);
    }

    const data = {
      provider: "linear" as const,
      organizationId: authorization.organization.id,
      organizationName: authorization.organization.name,
      organizationUrlKey: authorization.organization.urlKey,
      teamId: team.id,
      teamKey: team.key,
      teamName: team.name,
      encryptedCredentials,
      pendingRevocation: existing
        ? { encryptedCredentials: existing.data.encryptedCredentials, retryAt: now }
        : undefined,
    };
    if (existing) {
      await ctx.db.patch(existing._id, {
        health: "active",
        destinationLabel: team.name,
        data,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("workTrackerConnections", {
        projectId: args.projectId,
        provider: "linear",
        health: "active",
        destinationLabel: team.name,
        data,
        createdBy: user._id,
        createdAt: now,
        updatedAt: now,
      });
    }
    await ctx.db.delete(setup._id);
    return {
      connectionId: existing?._id,
      organization: authorization.organization,
      pendingRevocation: existing?.data.encryptedCredentials,
      team,
    };
  },
});

export const clearLinearPendingRevocationInternal = internalMutation({
  args: {
    connectionId: v.id("workTrackerConnections"),
    ciphertext: v.string(),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    if (
      connection?.data.pendingRevocation?.encryptedCredentials.ciphertext !== args.ciphertext
    ) {
      return;
    }
    await ctx.db.patch(connection._id, {
      data: { ...connection.data, pendingRevocation: undefined },
      updatedAt: Date.now(),
    });
  },
});

export const selectLinearTeam = action({
  args: {
    projectId: v.id("projects"),
    setupId: v.id("workTrackerOAuthSetups"),
    teamId: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    organization: { id: string; name: string; urlKey: string };
    team: { id: string; key: string; name: string };
  }> => {
    const result = await ctx.runMutation(
      internal.workTrackerConnections.selectLinearTeamInternal,
      args,
    );
    if (result.connectionId && result.pendingRevocation) {
      try {
        const config = getLinearConfig();
        const credentials = parseStoredCredentials(
          await decryptWorkTrackerSecret(result.pendingRevocation, config.encryptionKey),
        );
        await revokeLinearCredentials(credentials.refreshToken);
        await ctx.runMutation(
          internal.workTrackerConnections.clearLinearPendingRevocationInternal,
          {
            connectionId: result.connectionId,
            ciphertext: result.pendingRevocation.ciphertext,
          },
        );
      } catch (error) {
        console.error("Replaced Linear credential revocation failed", {
          connectionId: result.connectionId,
          message: error instanceof Error ? error.message.slice(0, 200) : "Unknown error",
        });
      }
    }
    return { organization: result.organization, team: result.team };
  },
});

export const getLinearConnectionForActionInternal = internalQuery({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertProjectOwner(ctx, args.projectId, user._id);
    return await ctx.db
      .query("workTrackerConnections")
      .withIndex("by_project_provider", (q) =>
        q.eq("projectId", args.projectId).eq("provider", "linear"),
      )
      .unique();
  },
});

export const claimLinearRefreshInternal = internalMutation({
  args: { connectionId: v.id("workTrackerConnections"), leaseId: v.string(), now: v.number() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const connection = await ctx.db.get(args.connectionId);
    if (!connection) {
      throw new Error("Linear connection not found");
    }
    await assertProjectOwner(ctx, connection.projectId, user._id);
    if (isWorkTrackerCredentialLeaseActive(connection.data.credentialLease, args.now)) {
      return false;
    }
    await ctx.db.patch(connection._id, {
      data: {
        ...connection.data,
        credentialLease: {
          id: args.leaseId,
          expiresAt: args.now + LINEAR_CREDENTIAL_LEASE_MS,
        },
      },
      updatedAt: args.now,
    });
    return true;
  },
});

export const completeLinearRefreshInternal = internalMutation({
  args: {
    connectionId: v.id("workTrackerConnections"),
    encryptedCredentials: v.object({ ciphertext: v.string(), iv: v.string() }),
    leaseId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const connection = await ctx.db.get(args.connectionId);
    if (!connection) {
      throw new Error("Linear connection not found");
    }
    await assertProjectOwner(ctx, connection.projectId, user._id);
    if (connection.data.credentialLease?.id !== args.leaseId) {
      return false;
    }
    await ctx.db.patch(connection._id, {
      health: "active",
      data: {
        ...connection.data,
        encryptedCredentials: args.encryptedCredentials,
        credentialLease: undefined,
      },
      updatedAt: Date.now(),
    });
    return true;
  },
});

export const failLinearRefreshInternal = internalMutation({
  args: {
    connectionId: v.id("workTrackerConnections"),
    needsAttention: v.boolean(),
    leaseId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const connection = await ctx.db.get(args.connectionId);
    if (!connection) {
      return;
    }
    await assertProjectOwner(ctx, connection.projectId, user._id);
    if (connection.data.credentialLease?.id !== args.leaseId) {
      return;
    }
    await ctx.db.patch(connection._id, {
      health: args.needsAttention ? "needs_attention" : connection.health,
      data: { ...connection.data, credentialLease: undefined },
      updatedAt: Date.now(),
    });
  },
});

async function getFreshLinearConnection(ctx: ActionCtx, projectId: Id<"projects">) {
  const config = getLinearConfig();
  let connection = await ctx.runQuery(
    internal.workTrackerConnections.getLinearConnectionForActionInternal,
    { projectId },
  );
  if (!connection) {
    throw new Error("Linear connection not found");
  }
  let credentials = parseStoredCredentials(
    await decryptWorkTrackerSecret(connection.data.encryptedCredentials, config.encryptionKey),
  );
  if (credentials.expiresAt > Date.now() + LINEAR_REFRESH_EARLY_MS) {
    return { connection, credentials };
  }

  const leaseId = crypto.randomUUID();
  const claimed = await ctx.runMutation(
    internal.workTrackerConnections.claimLinearRefreshInternal,
    { connectionId: connection._id, leaseId, now: Date.now() },
  );
  if (!claimed) {
    connection = await ctx.runQuery(
      internal.workTrackerConnections.getLinearConnectionForActionInternal,
      { projectId },
    );
    if (!connection) {
      throw new Error("Linear connection not found");
    }
    credentials = parseStoredCredentials(
      await decryptWorkTrackerSecret(connection.data.encryptedCredentials, config.encryptionKey),
    );
    if (credentials.expiresAt <= Date.now() + LINEAR_REFRESH_EARLY_MS) {
      throw new Error("Linear credentials are already refreshing");
    }
    return { connection, credentials };
  }

  let rotatedRefreshToken: string | undefined;
  let stored = false;
  try {
    const refreshed = await refreshLinearCredentials({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      refreshToken: credentials.refreshToken,
    });
    rotatedRefreshToken = refreshed.refreshToken;
    const now = Date.now();
    const encryptedCredentials = await encryptWorkTrackerSecret(
      serializeCredentials(refreshed, now),
      config.encryptionKey,
    );
    const saved = await ctx.runMutation(
      internal.workTrackerConnections.completeLinearRefreshInternal,
      {
        connectionId: connection._id,
        encryptedCredentials,
        leaseId,
      },
    );
    if (!saved) {
      throw new Error("Linear refresh lease expired");
    }
    stored = true;
    const currentConnection = await ctx.runQuery(
      internal.workTrackerConnections.getLinearConnectionForActionInternal,
      { projectId },
    );
    if (!currentConnection) {
      throw new Error("Linear connection not found");
    }
    return {
      connection: currentConnection,
      credentials: { ...refreshed, expiresAt: now + refreshed.expiresIn * 1000 },
    };
  } catch (error) {
    if (rotatedRefreshToken && !stored) {
      try {
        await revokeLinearCredentials(rotatedRefreshToken);
      } catch {
        // The connection is marked for attention below because rotation may have invalidated it.
      }
    }
    const needsAttention =
      Boolean(rotatedRefreshToken && !stored) ||
      (error instanceof Error &&
        error.message === "Linear authorization is invalid");
    await ctx.runMutation(internal.workTrackerConnections.failLinearRefreshInternal, {
      connectionId: connection._id,
      needsAttention,
      leaseId,
    });
    throw new Error("Unable to refresh Linear connection");
  }
}

export const syncLinearDiscoveryInternal = internalMutation({
  args: {
    connectionId: v.id("workTrackerConnections"),
    credentialCiphertext: v.string(),
    organization: v.object({ id: v.string(), name: v.string(), urlKey: v.string() }),
    selectedTeam: v.union(
      v.null(),
      v.object({ id: v.string(), key: v.string(), name: v.string() }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const connection = await ctx.db.get(args.connectionId);
    if (!connection) {
      throw new Error("Linear connection not found");
    }
    await assertProjectOwner(ctx, connection.projectId, user._id);
    const now = Date.now();
    if (
      connection.data.encryptedCredentials.ciphertext !== args.credentialCiphertext ||
      isWorkTrackerCredentialLeaseActive(connection.data.credentialLease, now)
    ) {
      return false;
    }
    if (connection.data.organizationId !== args.organization.id) {
      await ctx.db.patch(connection._id, {
        health: "needs_attention",
        data: { ...connection.data, credentialLease: undefined },
        updatedAt: now,
      });
      return false;
    }
    await ctx.db.patch(connection._id, {
      health: args.selectedTeam ? "active" : "needs_attention",
      destinationLabel: args.selectedTeam?.name ?? connection.destinationLabel,
      data: {
        ...connection.data,
        organizationId: args.organization.id,
        organizationName: args.organization.name,
        organizationUrlKey: args.organization.urlKey,
        teamKey: args.selectedTeam?.key ?? connection.data.teamKey,
        teamName: args.selectedTeam?.name ?? connection.data.teamName,
        credentialLease: undefined,
      },
      updatedAt: now,
    });
    return true;
  },
});

export const markLinearConnectionNeedsAttentionInternal = internalMutation({
  args: { connectionId: v.id("workTrackerConnections"), credentialCiphertext: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const connection = await ctx.db.get(args.connectionId);
    if (!connection) {
      return;
    }
    await assertProjectOwner(ctx, connection.projectId, user._id);
    const now = Date.now();
    if (
      connection.data.encryptedCredentials.ciphertext !== args.credentialCiphertext ||
      isWorkTrackerCredentialLeaseActive(connection.data.credentialLease, now)
    ) {
      return;
    }
    await ctx.db.patch(connection._id, {
      health: "needs_attention",
      data: { ...connection.data, credentialLease: undefined },
      updatedAt: now,
    });
  },
});

export const listLinearTeams = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args): Promise<{ id: string; key: string; name: string }[]> => {
    const { connection, credentials } = await getFreshLinearConnection(ctx, args.projectId);
    try {
      const discovery = await discoverLinearWorkspace(credentials.accessToken);
      if (discovery.organization.id !== connection.data.organizationId) {
        await ctx.runMutation(
          internal.workTrackerConnections.markLinearConnectionNeedsAttentionInternal,
          {
            connectionId: connection._id,
            credentialCiphertext: connection.data.encryptedCredentials.ciphertext,
          },
        );
        throw new Error("Linear workspace no longer matches the connection");
      }
      const selectedTeam =
        discovery.teams.find((team) => team.id === connection.data.teamId) ?? null;
      await ctx.runMutation(internal.workTrackerConnections.syncLinearDiscoveryInternal, {
        connectionId: connection._id,
        credentialCiphertext: connection.data.encryptedCredentials.ciphertext,
        organization: discovery.organization,
        selectedTeam,
      });
      return discovery.teams;
    } catch (error) {
      if (error instanceof Error && error.message === "Linear authorization is invalid") {
        await ctx.runMutation(
          internal.workTrackerConnections.markLinearConnectionNeedsAttentionInternal,
          {
            connectionId: connection._id,
            credentialCiphertext: connection.data.encryptedCredentials.ciphertext,
          },
        );
      }
      throw new Error("Unable to load Linear teams");
    }
  },
});

export const changeLinearTeamInternal = internalMutation({
  args: {
    projectId: v.id("projects"),
    connectionId: v.id("workTrackerConnections"),
    credentialCiphertext: v.string(),
    organization: v.object({ id: v.string(), name: v.string(), urlKey: v.string() }),
    team: v.object({ id: v.string(), key: v.string(), name: v.string() }),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertProjectOwner(ctx, args.projectId, user._id);
    const connection = await ctx.db.get(args.connectionId);
    if (!connection || connection.projectId !== args.projectId) {
      throw new Error("Linear connection not found");
    }
    const now = Date.now();
    if (
      connection.data.encryptedCredentials.ciphertext !== args.credentialCiphertext ||
      isWorkTrackerCredentialLeaseActive(connection.data.credentialLease, now)
    ) {
      throw new Error("Linear connection changed; reload and try again");
    }
    if (connection.data.teamId !== args.team.id) {
      await assertNoBlockingLinearHandoffs(ctx, args.projectId);
    }
    await ctx.db.patch(connection._id, {
      health: "active",
      destinationLabel: args.team.name,
      data: {
        ...connection.data,
        organizationId: args.organization.id,
        organizationName: args.organization.name,
        organizationUrlKey: args.organization.urlKey,
        teamId: args.team.id,
        teamKey: args.team.key,
        teamName: args.team.name,
        credentialLease: undefined,
      },
      updatedAt: now,
    });
    return { team: args.team };
  },
});

export const changeLinearTeam = action({
  args: { projectId: v.id("projects"), teamId: v.string() },
  handler: async (ctx, args): Promise<{ team: { id: string; key: string; name: string } }> => {
    const { connection, credentials } = await getFreshLinearConnection(ctx, args.projectId);
    const discovery = await discoverLinearWorkspace(credentials.accessToken);
    if (discovery.organization.id !== connection.data.organizationId) {
      await ctx.runMutation(
        internal.workTrackerConnections.markLinearConnectionNeedsAttentionInternal,
        {
          connectionId: connection._id,
          credentialCiphertext: connection.data.encryptedCredentials.ciphertext,
        },
      );
      throw new Error("Linear workspace no longer matches the connection");
    }
    const team = discovery.teams.find((candidate) => candidate.id === args.teamId);
    if (!team) {
      throw new Error("Linear team is not available");
    }
    return await ctx.runMutation(internal.workTrackerConnections.changeLinearTeamInternal, {
      projectId: args.projectId,
      connectionId: connection._id,
      credentialCiphertext: connection.data.encryptedCredentials.ciphertext,
      organization: discovery.organization,
      team,
    });
  },
});

export const beginLinearDisconnectInternal = internalMutation({
  args: { projectId: v.id("projects"), leaseId: v.string(), now: v.number() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertProjectOwner(ctx, args.projectId, user._id);
    await assertNoBlockingLinearHandoffs(ctx, args.projectId);
    const connection = await ctx.db
      .query("workTrackerConnections")
      .withIndex("by_project_provider", (q) =>
        q.eq("projectId", args.projectId).eq("provider", "linear"),
      )
      .unique();
    if (!connection) {
      return null;
    }
    if (isWorkTrackerCredentialLeaseActive(connection.data.credentialLease, args.now)) {
      throw new Error("Linear credentials are busy; try again shortly");
    }
    if (connection.data.pendingRevocation) {
      throw new Error("The previous Linear authorization is still being revoked");
    }
    const data = {
      ...connection.data,
      credentialLease: {
        id: args.leaseId,
        expiresAt: args.now + LINEAR_CREDENTIAL_LEASE_MS,
      },
    };
    await ctx.db.patch(connection._id, {
      health: "needs_attention",
      data,
      updatedAt: args.now,
    });
    return { ...connection, data };
  },
});

export const finalizeLinearDisconnectInternal = internalMutation({
  args: {
    projectId: v.id("projects"),
    connectionId: v.id("workTrackerConnections"),
    leaseId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertProjectOwner(ctx, args.projectId, user._id);
    const connection = await ctx.db.get(args.connectionId);
    if (!connection) {
      return { disconnected: true };
    }
    if (
      connection.projectId !== args.projectId ||
      connection.data.credentialLease?.id !== args.leaseId
    ) {
      return { disconnected: false };
    }
    await ctx.db.delete(connection._id);
    return { disconnected: true };
  },
});

export const disconnectLinear = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args): Promise<{ disconnected: true }> => {
    const leaseId = crypto.randomUUID();
    const connection = await ctx.runMutation(
      internal.workTrackerConnections.beginLinearDisconnectInternal,
      { ...args, leaseId, now: Date.now() },
    );
    if (connection) {
      for (const encrypted of [connection.data.encryptedCredentials]) {
        try {
          const config = getLinearConfig();
          const credentials = parseStoredCredentials(
            await decryptWorkTrackerSecret(encrypted, config.encryptionKey),
          );
          await revokeLinearCredentials(credentials.refreshToken);
        } catch (error) {
          console.error("Linear credential revocation failed", {
            connectionId: connection._id,
            message: error instanceof Error ? error.message.slice(0, 200) : "Unknown error",
          });
        }
      }
      const result = await ctx.runMutation(
        internal.workTrackerConnections.finalizeLinearDisconnectInternal,
        { ...args, connectionId: connection._id, leaseId },
      );
      if (!result.disconnected) {
        throw new Error("Linear connection changed during disconnect");
      }
    }
    return { disconnected: true };
  },
});
