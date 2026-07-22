import { v } from "convex/values";

import { internalMutation } from "./_generated/server";
import { WORK_ITEM_HANDOFF_LEASE_MS } from "./lib/workItemHandoff";
import { workTrackerProviderValidator } from "./lib/workTrackerTypes";

export const reserveInternal = internalMutation({
  args: {
    projectId: v.id("projects"),
    requestId: v.id("requests"),
    provider: workTrackerProviderValidator,
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request || request.project !== args.projectId) {
      throw new Error("Request does not belong to the Project Board");
    }

    const existing = await ctx.db
      .query("workItemHandoffs")
      .withIndex("by_request_provider", (q) =>
        q.eq("requestId", args.requestId).eq("provider", args.provider),
      )
      .unique();
    if (existing) {
      return existing;
    }

    const now = Date.now();
    const handoffId = await ctx.db.insert("workItemHandoffs", {
      projectId: args.projectId,
      requestId: args.requestId,
      provider: args.provider,
      attemptCount: 1,
      reconciliationCount: 0,
      recovery: {
        provider: "linear",
        issueId: crypto.randomUUID(),
      },
      lifecycle: {
        state: "pending",
        leaseExpiresAt: now + WORK_ITEM_HANDOFF_LEASE_MS,
      },
      createdAt: now,
      updatedAt: now,
    });
    const handoff = await ctx.db.get(handoffId);
    if (!handoff) {
      throw new Error("Work Item Handoff reservation failed");
    }

    return handoff;
  },
});
