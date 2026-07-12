import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export async function emitNotificationEvent(
  ctx: MutationCtx,
  args: {
    projectId: Id<"projects">;
    type: "request.created" | "complaint.created" | "request.comment_created";
    requestId?: Id<"requests">;
    commentId?: Id<"requestComments">;
  },
) {
  const now = Date.now();
  const eventId = await ctx.db.insert("notificationEvents", {
    ...args,
    createdAt: now,
  });

  const connectors = await ctx.db
    .query("notificationConnectors")
    .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
    .collect();

  for (const connector of connectors) {
    if (!connector.enabled || !connector.eventTypes.includes(args.type)) {
      continue;
    }

    const deliveryId = await ctx.db.insert("notificationDeliveries", {
      eventId,
      projectId: args.projectId,
      connectorId: connector._id,
      connectorKind: connector.kind,
      status: "pending",
      attemptCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.telegramNotifications.dispatchInternal, {
      deliveryId,
    });
  }

  return eventId;
}
