import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import {
  parseGitHubUserCredentials,
  revokeGitHubCredentials,
} from "./lib/githubApp";
import { GITHUB_REVOCATION_RETRY_MS } from "./lib/githubConnection";
import { githubSetupOrNull } from "./lib/workTrackerConnection";
import { getWorkTrackerEncryptionKey } from "./lib/workTrackerConfig";
import { decryptWorkTrackerSecret } from "./lib/workTrackerSecrets";

export const getExpiredGitHubSetupsInternal = internalQuery({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("workTrackerOAuthSetups")
      .withIndex("by_expires_at", (q) => q.lt("expiresAt", args.now))
      .filter((q) => q.eq(q.field("provider"), "github"))
      .take(20);
  },
});

export const deleteExpiredGitHubSetupInternal = internalMutation({
  args: { setupId: v.id("workTrackerOAuthSetups"), now: v.number() },
  handler: async (ctx, args) => {
    const setup = githubSetupOrNull(await ctx.db.get(args.setupId));
    if (setup && setup.data.stage !== "discarding" && setup.expiresAt < args.now) {
      await ctx.db.delete(setup._id);
    }
  },
});

export const deleteDiscardingGitHubSetupInternal = internalMutation({
  args: { setupId: v.id("workTrackerOAuthSetups"), ciphertext: v.string() },
  handler: async (ctx, args) => {
    const setup = githubSetupOrNull(await ctx.db.get(args.setupId));
    if (
      setup?.data.stage === "discarding" &&
      setup.data.encryptedUserCredentials.ciphertext === args.ciphertext
    ) {
      await ctx.db.delete(setup._id);
    }
  },
});

export const rescheduleGitHubRevocationInternal = internalMutation({
  args: {
    setupId: v.id("workTrackerOAuthSetups"),
    ciphertext: v.string(),
    retryAt: v.number(),
  },
  handler: async (ctx, args) => {
    const setup = githubSetupOrNull(await ctx.db.get(args.setupId));
    if (
      setup?.data.stage === "discarding" &&
      setup.data.encryptedUserCredentials.ciphertext === args.ciphertext
    ) {
      await ctx.db.patch(setup._id, { expiresAt: args.retryAt });
    }
  },
});

export const cleanupExpiredGitHubSetupsInternal = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const setups = await ctx.runQuery(
      internal.githubWorkTrackerCleanup.getExpiredGitHubSetupsInternal,
      { now },
    );
    for (const setup of setups) {
      const githubSetup = githubSetupOrNull(setup);
      if (!githubSetup) continue;
      if (githubSetup.data.stage === "discarding") {
        const encrypted = githubSetup.data.encryptedUserCredentials;
        try {
          const credentials = parseGitHubUserCredentials(
            await decryptWorkTrackerSecret(encrypted, getWorkTrackerEncryptionKey()),
          );
          await revokeGitHubCredentials(credentials);
          await ctx.runMutation(
            internal.githubWorkTrackerCleanup.deleteDiscardingGitHubSetupInternal,
            { setupId: githubSetup._id, ciphertext: encrypted.ciphertext },
          );
        } catch (error) {
          console.error("GitHub user authorization revocation retry failed", {
            setupId: githubSetup._id,
            message: error instanceof Error ? error.message.slice(0, 200) : "Unknown error",
          });
          await ctx.runMutation(
            internal.githubWorkTrackerCleanup.rescheduleGitHubRevocationInternal,
            {
              setupId: githubSetup._id,
              ciphertext: encrypted.ciphertext,
              retryAt: now + GITHUB_REVOCATION_RETRY_MS,
            },
          );
        }
        continue;
      }
      await ctx.runMutation(
        internal.githubWorkTrackerCleanup.deleteExpiredGitHubSetupInternal,
        { setupId: setup._id, now },
      );
    }
  },
});
