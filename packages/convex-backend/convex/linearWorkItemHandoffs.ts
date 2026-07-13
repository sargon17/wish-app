import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { getWorkTrackerEncryptionKey, parseStoredCredentials } from "./lib/linearConnection";
import { findLinearIssue } from "./lib/linearIssue";
import { isWorkTrackerCredentialLeaseActive } from "./lib/workTrackerConnection";
import { decryptWorkTrackerSecret } from "./lib/workTrackerSecrets";
import { getFreshLinearConnection } from "./workTrackerConnections";

export const getForReconciliationInternal = internalQuery({
  args: { handoffId: v.id("workItemHandoffs") },
  handler: async (ctx, args) => {
    const handoff = await ctx.db.get(args.handoffId);
    if (!handoff || handoff.provider !== "linear" || handoff.lifecycle.state !== "unknown") {
      return null;
    }
    const connection = await ctx.db
      .query("workTrackerConnections")
      .withIndex("by_project_provider", (q) =>
        q.eq("projectId", handoff.projectId).eq("provider", "linear"),
      )
      .unique();
    return connection ? { connection, handoff } : null;
  },
});

export const markConnectionNeedsAttentionInternal = internalMutation({
  args: { connectionId: v.id("workTrackerConnections"), credentialCiphertext: v.string() },
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    const now = Date.now();
    if (
      !connection ||
      connection.provider !== "linear" ||
      connection.data.encryptedCredentials.ciphertext !== args.credentialCiphertext ||
      isWorkTrackerCredentialLeaseActive(connection.data.credentialLease, now)
    ) {
      return false;
    }
    await ctx.db.patch(connection._id, { health: "needs_attention", updatedAt: now });
    return true;
  },
});

export const reconcileInternal = internalAction({
  args: { handoffId: v.id("workItemHandoffs") },
  handler: async (ctx, args): Promise<Doc<"workItemHandoffs"> | null> => {
    const target = await ctx.runQuery(
      internal.linearWorkItemHandoffs.getForReconciliationInternal,
      args,
    );
    if (!target) return null;

    let accessToken: string | undefined;
    let credentialCiphertext = target.connection.data.encryptedCredentials.ciphertext;
    let needsAttention = false;
    let refreshedCredentials = false;
    const identity = await ctx.auth.getUserIdentity();
    if (identity) {
      try {
        const forceRefresh = target.connection.health !== "active";
        const fresh = await getFreshLinearConnection(ctx, target.handoff.projectId, forceRefresh);
        refreshedCredentials = forceRefresh;
        if (
          fresh.connection._id === target.connection._id &&
          fresh.connection.health === "active"
        ) {
          accessToken = fresh.credentials.accessToken;
          credentialCiphertext = fresh.connection.data.encryptedCredentials.ciphertext;
        }
      } catch {
        // Connection state is updated by the refresh path when attention is required.
      }
    } else {
      try {
        const credentials = parseStoredCredentials(
          await decryptWorkTrackerSecret(
            target.connection.data.encryptedCredentials,
            getWorkTrackerEncryptionKey(),
          ),
        );
        if (credentials.expiresAt > Date.now()) {
          accessToken = credentials.accessToken;
        }
      } catch {
        needsAttention = true;
      }
    }

    if (!accessToken) {
      if (needsAttention) {
        await ctx.runMutation(
          internal.linearWorkItemHandoffs.markConnectionNeedsAttentionInternal,
          {
            connectionId: target.connection._id,
            credentialCiphertext: target.connection.data.encryptedCredentials.ciphertext,
          },
        );
      }
      console.info("work_item_handoff_reconciliation", {
        provider: "linear",
        handoffId: target.handoff._id,
        reconciliationCount: target.handoff.reconciliationCount,
        state: "skipped",
        needsAttention,
      });
      return await ctx.runQuery(internal.workItemHandoffs.getByIdInternal, args);
    }

    let result = await findLinearIssue({
      accessToken,
      issueId: target.handoff.recovery.issueId,
    });
    if (identity && result.needsAttention && !refreshedCredentials) {
      try {
        const fresh = await getFreshLinearConnection(ctx, target.handoff.projectId, true);
        if (
          fresh.connection._id === target.connection._id &&
          fresh.connection.health === "active"
        ) {
          credentialCiphertext = fresh.connection.data.encryptedCredentials.ciphertext;
          result = await findLinearIssue({
            accessToken: fresh.credentials.accessToken,
            issueId: target.handoff.recovery.issueId,
          });
        }
      } catch {
        // The result remains uncertain and the connection is marked below.
      }
    }
    console.info("work_item_handoff_reconciliation", {
      provider: "linear",
      handoffId: target.handoff._id,
      reconciliationCount: target.handoff.reconciliationCount + (result.needsAttention ? 0 : 1),
      state: result.needsAttention ? "skipped" : result.state,
      needsAttention: needsAttention || result.needsAttention,
    });
    if (result.needsAttention) {
      await ctx.runMutation(internal.linearWorkItemHandoffs.markConnectionNeedsAttentionInternal, {
        connectionId: target.connection._id,
        credentialCiphertext,
      });
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
