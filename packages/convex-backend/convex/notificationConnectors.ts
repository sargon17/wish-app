import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { assertProjectOwner, getCurrentUser } from "./lib/authorization";
import {
  generateTelegramConnectionToken,
  getTelegramConnectionTokenPrefix,
  hashTelegramConnectionToken,
} from "./lib/notificationTokens";

const TELEGRAM_CONNECTION_TOKEN_TTL_MS = 10 * 60 * 1000;

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertProjectOwner(ctx, args.projectId, user._id);

    const connectors = await ctx.db
      .query("notificationConnectors")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return connectors.sort((left, right) => left.kind.localeCompare(right.kind));
  },
});

export const createTelegramConnectionToken = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertProjectOwner(ctx, args.projectId, user._id);

    const token = generateTelegramConnectionToken();
    const now = Date.now();
    const expiresAt = now + TELEGRAM_CONNECTION_TOKEN_TTL_MS;

    // Invalidate prior unredeemed telegram tokens so only the newest one can bind the connector.
    const priorTokens = await ctx.db
      .query("notificationConnectionTokens")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const prior of priorTokens) {
      if (prior.kind === "telegram" && !prior.consumedAt) {
        await ctx.db.patch(prior._id, { consumedAt: now });
      }
    }

    await ctx.db.insert("notificationConnectionTokens", {
      projectId: args.projectId,
      kind: "telegram",
      tokenPrefix: getTelegramConnectionTokenPrefix(token),
      tokenHash: await hashTelegramConnectionToken(token),
      createdBy: user._id,
      createdAt: now,
      expiresAt,
    });

    const botUsername = process.env.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, "");
    const botLink = botUsername
      ? `https://t.me/${botUsername}?start=${encodeURIComponent(token)}`
      : undefined;

    return { token, expiresAt, botLink };
  },
});

export const setTelegramEnabled = mutation({
  args: {
    projectId: v.id("projects"),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertProjectOwner(ctx, args.projectId, user._id);

    const connector = await ctx.db
      .query("notificationConnectors")
      .withIndex("by_project_kind", (q) => q.eq("projectId", args.projectId).eq("kind", "telegram"))
      .unique();

    if (!connector) {
      throw new Error("Telegram connector not found");
    }

    await ctx.db.patch(connector._id, {
      enabled: args.enabled,
      updatedAt: Date.now(),
    });

    return { enabled: args.enabled };
  },
});
