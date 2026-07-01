import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { assertProjectOwner, getCurrentUser } from "./lib/authorization";
import {
  DEFAULT_NOTIFICATION_EVENT_TYPES,
  notificationEventTypeValidator,
  normalizeNotificationEventTypes,
} from "./lib/notificationTypes";
import {
  generateTelegramConnectionToken,
  getTelegramConnectionTokenPrefix,
  hashTelegramConnectionToken,
} from "./lib/notificationTokens";

const TELEGRAM_CONNECTION_TOKEN_TTL_MS = 10 * 60 * 1000;

function toPublicConnector(connector: Doc<"notificationConnectors">) {
  return connector;
}

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertProjectOwner(ctx, args.projectId, user._id);

    const connectors = await ctx.db
      .query("notificationConnectors")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return connectors
      .sort((left, right) => left.kind.localeCompare(right.kind))
      .map((connector) => toPublicConnector(connector));
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
    const botLink = botUsername ? `https://t.me/${botUsername}?start=${encodeURIComponent(token)}` : undefined;

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

export const updateEventTypes = mutation({
  args: {
    projectId: v.id("projects"),
    connectorId: v.id("notificationConnectors"),
    eventTypes: v.array(notificationEventTypeValidator),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertProjectOwner(ctx, args.projectId, user._id);

    const connector = await ctx.db.get(args.connectorId);
    if (!connector || connector.projectId !== args.projectId) {
      throw new Error("Notification connector not found");
    }

    await ctx.db.patch(connector._id, {
      eventTypes: normalizeNotificationEventTypes(args.eventTypes),
      updatedAt: Date.now(),
    });
  },
});

export const getDefaultEventTypes = query({
  args: {},
  handler: async () => {
    return [...DEFAULT_NOTIFICATION_EVENT_TYPES];
  },
});
