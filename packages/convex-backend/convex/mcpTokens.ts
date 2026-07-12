import { v } from "convex/values";

import { internal } from "./_generated/api";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { getCurrentUser } from "./lib/authorization";
import { createMcpToken, hashMcpTokenId } from "./lib/mcpToken";

const TOKEN_LIFETIME_MS = 365 * 24 * 60 * 60 * 1000;

export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const tokens = await ctx.db
      .query("mcpTokens")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return tokens.find((token) => !token.revokedAt && token.expiresAt > Date.now()) ?? null;
  },
});

export const createRecord = internalMutation({
  args: {
    tokenHash: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const existingTokens = await ctx.db
      .query("mcpTokens")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    await Promise.all(
      existingTokens
        .filter((token) => !token.revokedAt)
        .map((token) => ctx.db.patch(token._id, { revokedAt: args.createdAt })),
    );
    await ctx.db.insert("mcpTokens", { userId: user._id, ...args });

    return user;
  },
});

export const create = action({
  args: {},
  handler: async (ctx): Promise<{ expiresAt: number; token: string }> => {
    const now = Date.now();
    const expiresAt = now + TOKEN_LIFETIME_MS;
    const tokenId = crypto.randomUUID();
    const tokenHash = await hashMcpTokenId(tokenId);
    const user = await ctx.runMutation(internal.mcpTokens.createRecord, {
      tokenHash,
      createdAt: now,
      expiresAt,
    });

    return { expiresAt, token: await createMcpToken(user._id, tokenId, expiresAt) };
  },
});

export const revoke = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const tokens = await ctx.db
      .query("mcpTokens")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const now = Date.now();

    await Promise.all(
      tokens
        .filter((token) => !token.revokedAt)
        .map((token) => ctx.db.patch(token._id, { revokedAt: now })),
    );

    return { revoked: true };
  },
});

export const assertValid = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    return { userId: user._id };
  },
});
