import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { getWorkTrackerEncryptionKey, parseStoredCredentials } from "./lib/linearConnection";
import { revokeLinearCredentials } from "./lib/linearOAuth";
import { decryptWorkTrackerSecret } from "./lib/workTrackerSecrets";

const REVOCATION_RETRY_MS = 5 * 60 * 1000;

export const getExpiredLinearSetupsInternal = internalQuery({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("workTrackerOAuthSetups")
      .withIndex("by_expires_at", (q) => q.lt("expiresAt", args.now))
      .take(10);
  },
});

export const deleteExpiredLinearSetupInternal = internalMutation({
  args: { setupId: v.id("workTrackerOAuthSetups"), now: v.number() },
  handler: async (ctx, args) => {
    const setup = await ctx.db.get(args.setupId);
    if (setup && setup.provider === "linear" && setup.expiresAt < args.now) {
      await ctx.db.delete(setup._id);
    }
  },
});

export const rescheduleLinearSetupRevocationInternal = internalMutation({
  args: { setupId: v.id("workTrackerOAuthSetups"), retryAt: v.number() },
  handler: async (ctx, args) => {
    const setup = await ctx.db.get(args.setupId);
    if (setup && setup.provider === "linear" && setup.data.stage !== "pending") {
      await ctx.db.patch(setup._id, { expiresAt: args.retryAt });
    }
  },
});

export const getPendingLinearRevocationsInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("workTrackerConnections")
      .withIndex("by_pending_revocation", (q) =>
        q
          .gt("data.pendingRevocation.retryAt", 0)
          .lte("data.pendingRevocation.retryAt", Date.now()),
      )
      .take(10);
  },
});

export const reschedulePendingLinearRevocationInternal = internalMutation({
  args: {
    connectionId: v.id("workTrackerConnections"),
    ciphertext: v.string(),
    retryAt: v.number(),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    if (
      connection?.data.pendingRevocation?.encryptedCredentials.ciphertext !== args.ciphertext
    ) {
      return;
    }
    await ctx.db.patch(connection._id, {
      data: {
        ...connection.data,
        pendingRevocation: { ...connection.data.pendingRevocation, retryAt: args.retryAt },
      },
    });
  },
});

export const cleanupExpiredLinearSetupsInternal = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const setups: Doc<"workTrackerOAuthSetups">[] = await ctx.runQuery(
      internal.linearWorkTrackerCleanup.getExpiredLinearSetupsInternal,
      { now },
    );
    for (const setup of setups) {
      const encrypted = setup.data.stage === "pending" ? undefined : setup.data.encryptedCredentials;
      let revoked = !encrypted;
      if (encrypted) {
        try {
          const credentials = parseStoredCredentials(
            await decryptWorkTrackerSecret(encrypted, getWorkTrackerEncryptionKey()),
          );
          await revokeLinearCredentials(credentials.refreshToken);
          revoked = true;
        } catch (error) {
          console.error("Expired Linear setup revocation failed", {
            setupId: setup._id,
            message: error instanceof Error ? error.message.slice(0, 200) : "Unknown error",
          });
          await ctx.runMutation(
            internal.linearWorkTrackerCleanup.rescheduleLinearSetupRevocationInternal,
            { setupId: setup._id, retryAt: now + REVOCATION_RETRY_MS },
          );
        }
      }
      if (revoked) {
        await ctx.runMutation(
          internal.linearWorkTrackerCleanup.deleteExpiredLinearSetupInternal,
          { setupId: setup._id, now },
        );
      }
    }
  },
});

export const cleanupPendingLinearRevocationsInternal = internalAction({
  args: {},
  handler: async (ctx) => {
    const connections: Doc<"workTrackerConnections">[] = await ctx.runQuery(
      internal.linearWorkTrackerCleanup.getPendingLinearRevocationsInternal,
      {},
    );
    for (const connection of connections) {
      const encrypted = connection.data.pendingRevocation?.encryptedCredentials;
      if (!encrypted) continue;
      try {
        const credentials = parseStoredCredentials(
          await decryptWorkTrackerSecret(encrypted, getWorkTrackerEncryptionKey()),
        );
        await revokeLinearCredentials(credentials.refreshToken);
        await ctx.runMutation(
          internal.workTrackerConnections.clearLinearPendingRevocationInternal,
          { connectionId: connection._id, ciphertext: encrypted.ciphertext },
        );
      } catch (error) {
        console.error("Pending Linear credential revocation failed", {
          connectionId: connection._id,
          message: error instanceof Error ? error.message.slice(0, 200) : "Unknown error",
        });
        await ctx.runMutation(
          internal.linearWorkTrackerCleanup.reschedulePendingLinearRevocationInternal,
          {
            connectionId: connection._id,
            ciphertext: encrypted.ciphertext,
            retryAt: Date.now() + REVOCATION_RETRY_MS,
          },
        );
      }
    }
  },
});
