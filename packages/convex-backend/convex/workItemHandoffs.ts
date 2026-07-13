import { v } from "convex/values";

import { internalMutation } from "./_generated/server";
import { WORK_ITEM_HANDOFF_LEASE_MS } from "./lib/workItemHandoff";
import { isWorkTrackerCredentialLeaseActive } from "./lib/workTrackerConnection";
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
    const connection = await ctx.db
      .query("workTrackerConnections")
      .withIndex("by_project_provider", (q) =>
        q.eq("projectId", args.projectId).eq("provider", args.provider),
      )
      .unique();
    if (
      !connection ||
      connection.health !== "active" ||
      isWorkTrackerCredentialLeaseActive(connection.data.credentialLease, now)
    ) {
      throw new Error("Work Tracker connection is not available");
    }
    if (connection.data.credentialLease) {
      await ctx.db.patch(connection._id, {
        data: { ...connection.data, credentialLease: undefined },
      });
    }

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
