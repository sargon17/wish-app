import { v } from "convex/values";

import { internalMutation } from "./_generated/server";
import { DEFAULT_NOTIFICATION_EVENT_TYPES } from "./lib/notificationTypes";
import {
  getTelegramConnectionTokenPrefix,
  verifyTelegramConnectionTokenHash,
} from "./lib/notificationTokens";

export const consumeConnectionTokenInternal = internalMutation({
  args: {
    token: v.string(),
    chatId: v.string(),
    chatTitle: v.optional(v.string()),
    messageThreadId: v.optional(v.number()),
    telegramUserId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const token = args.token.trim();
    const tokenPrefix = getTelegramConnectionTokenPrefix(token);
    const candidates = await ctx.db
      .query("notificationConnectionTokens")
      .withIndex("by_token_prefix", (q) => q.eq("tokenPrefix", tokenPrefix))
      .collect();
    const now = Date.now();

    for (const candidate of candidates) {
      if (candidate.consumedAt || candidate.expiresAt <= now) {
        continue;
      }

      const matches = await verifyTelegramConnectionTokenHash(candidate.tokenHash, token);
      if (!matches) {
        continue;
      }

      const project = await ctx.db.get(candidate.projectId);
      if (!project) {
        throw new Error("Project not found");
      }

      const existingConnector = await ctx.db
        .query("notificationConnectors")
        .withIndex("by_project_kind", (q) => q.eq("projectId", candidate.projectId).eq("kind", "telegram"))
        .unique();
      const connectorPatch = {
        enabled: true,
        telegramChatId: args.chatId,
        telegramChatTitle: args.chatTitle || "Telegram chat",
        telegramMessageThreadId: args.messageThreadId,
        telegramConnectedByUserId: args.telegramUserId,
        eventTypes: [...DEFAULT_NOTIFICATION_EVENT_TYPES],
        updatedAt: now,
      };

      if (existingConnector) {
        await ctx.db.patch(existingConnector._id, connectorPatch);
      } else {
        await ctx.db.insert("notificationConnectors", {
          projectId: candidate.projectId,
          kind: "telegram",
          createdBy: candidate.createdBy,
          createdAt: now,
          ...connectorPatch,
        });
      }

      await ctx.db.patch(candidate._id, {
        consumedAt: now,
      });

      return { ok: true, projectTitle: project.title };
    }

    return { ok: false, reason: "invalid_or_expired" };
  },
});
