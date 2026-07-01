import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";

export const dispatchInternal = internalAction({
  args: { deliveryId: v.id("notificationDeliveries") },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.emailNotifications.markFailedInternal, {
      deliveryId: args.deliveryId,
      error: "Email notification adapter is not configured yet",
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
