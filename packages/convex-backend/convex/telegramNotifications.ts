import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";

function truncate(value: string | undefined, maxLength: number) {
  const normalized = value?.trim();
  if (!normalized) {
    return "";
  }

  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}

function formatRequestUrl(args: { projectSlug?: string; requestId?: string }) {
  const baseUrl = process.env.WISH_APP_BASE_URL?.replace(/\/$/, "");
  if (!baseUrl || !args.projectSlug || !args.requestId) {
    return "";
  }

  // ponytail: the route ignores the trailing slug segment (reads projectSlug + requestId only).
  return `${baseUrl}/p/${args.projectSlug}/r/${args.requestId}/request`;
}

function compactLines(lines: string[]) {
  return lines.filter((line) => line.trim().length > 0).join("\n");
}

export const buildMessageInternal = internalQuery({
  args: { deliveryId: v.id("notificationDeliveries") },
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(args.deliveryId);
    if (!delivery || delivery.connectorKind !== "telegram") {
      return null;
    }

    const connector = await ctx.db.get(delivery.connectorId);
    if (!connector || connector.kind !== "telegram" || !connector.enabled || !connector.telegramChatId) {
      return null;
    }

    const event = await ctx.db.get(delivery.eventId);
    if (!event) {
      return null;
    }

    // Never route one project's event into another project's chat.
    if (connector.projectId !== event.projectId || delivery.projectId !== event.projectId) {
      return null;
    }

    const project = await ctx.db.get(event.projectId);
    if (!project) {
      return null;
    }

    const request = event.requestId ? await ctx.db.get(event.requestId) : null;
    const comment = event.commentId ? await ctx.db.get(event.commentId) : null;
    const caseEvent = event.complaintCaseEventId ? await ctx.db.get(event.complaintCaseEventId) : null;
    const requestUrl = formatRequestUrl({
      projectSlug: project.projectSlug,
      requestId: request?._id.toString(),
    });

    const requestTitle = truncate(request?.text, 180);
    const description = truncate(request?.description, 300);
    const commentBody = truncate(comment?.body, 300);
    const projectTitle = truncate(project.title, 100);
    const caseEventChange = caseEvent
      ? `${caseEvent.fromOwnerUserId || caseEvent.fromStage || "None"} -> ${caseEvent.toOwnerUserId || caseEvent.toStage || "None"}`
      : "";

    const textByType = {
      "request.created": compactLines([
        `New Request in ${projectTitle}`,
        requestTitle,
        description,
        requestUrl,
      ]),
      "complaint.created": compactLines([
        `New Complaint in ${projectTitle}`,
        requestTitle,
        description,
        requestUrl,
      ]),
      "request.comment_created": compactLines([
        `New comment in ${projectTitle}`,
        requestTitle,
        commentBody,
        requestUrl,
      ]),
      "complaint.case_event_created": compactLines([
        `Complaint updated in ${projectTitle}`,
        requestTitle,
        caseEvent ? `${caseEvent.type}: ${caseEventChange}` : "",
        truncate(caseEvent?.reason, 240),
        requestUrl,
      ]),
    };

    return {
      chat_id: connector.telegramChatId,
      message_thread_id: connector.telegramMessageThreadId,
      text: textByType[event.type].slice(0, 4096),
    };
  },
});

export const dispatchInternal = internalAction({
  args: { deliveryId: v.id("notificationDeliveries") },
  // ponytail: no pending->sending claim; Convex doesn't auto-retry actions and each delivery
  // is scheduled exactly once. Add an atomic status claim if retries/re-enqueue are ever enabled.
  handler: async (ctx, args) => {
    const payload = await ctx.runQuery(internal.telegramNotifications.buildMessageInternal, {
      deliveryId: args.deliveryId,
    });
    if (!payload) {
      await ctx.runMutation(internal.telegramNotifications.markFailedInternal, {
        deliveryId: args.deliveryId,
        error: "Telegram delivery payload could not be built",
      });
      return;
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      await ctx.runMutation(internal.telegramNotifications.markFailedInternal, {
        deliveryId: args.deliveryId,
        error: "Missing TELEGRAM_BOT_TOKEN",
      });
      return;
    }

    const body = {
      ...payload,
      message_thread_id: payload.message_thread_id || undefined,
    };
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        await ctx.runMutation(internal.telegramNotifications.markFailedInternal, {
          deliveryId: args.deliveryId,
          error: await response.text(),
        });
        return;
      }
    } catch (error) {
      await ctx.runMutation(internal.telegramNotifications.markFailedInternal, {
        deliveryId: args.deliveryId,
        error: error instanceof Error ? error.message : "Telegram delivery failed",
      });
      return;
    }

    await ctx.runMutation(internal.telegramNotifications.markSentInternal, {
      deliveryId: args.deliveryId,
    });
  },
});

export const markSentInternal = internalMutation({
  args: { deliveryId: v.id("notificationDeliveries") },
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(args.deliveryId);
    if (!delivery) {
      return;
    }

    await ctx.db.patch(args.deliveryId, {
      status: "sent",
      attemptCount: delivery.attemptCount + 1,
      lastError: undefined,
      sentAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const markFailedInternal = internalMutation({
  args: {
    deliveryId: v.id("notificationDeliveries"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(args.deliveryId);
    if (!delivery || delivery.status === "sent") {
      return;
    }

    await ctx.db.patch(args.deliveryId, {
      status: "failed",
      attemptCount: delivery.attemptCount + 1,
      lastError: args.error.slice(0, 1000),
      updatedAt: Date.now(),
    });
  },
});
