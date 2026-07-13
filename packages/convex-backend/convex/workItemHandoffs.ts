import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { assertProjectOwner, getCurrentUser } from "./lib/authorization";
import { sendGitHubHandoff } from "./lib/githubHandoffDelivery";
import { sendLinearHandoff } from "./lib/linearHandoffDelivery";
import {
  WORK_ITEM_HANDOFF_RECONCILIATION_DELAYS_MS,
  WORK_ITEM_HANDOFF_LEASE_MS,
  handoffDelayWithJitter,
  isPendingLeaseExpired,
} from "./lib/workItemHandoff";
import { isWorkTrackerCredentialLeaseActive } from "./lib/workTrackerConnection";
import {
  externalWorkItemIdentityValidator,
  workItemHandoffRecoveryValidator,
  workTrackerProviderValidator,
} from "./lib/workTrackerTypes";

async function getOwnedHandoff(
  ctx: MutationCtx | QueryCtx,
  args: {
    projectId: Id<"projects">;
    requestId: Id<"requests">;
    provider: Doc<"workItemHandoffs">["provider"];
  },
) {
  const user = await getCurrentUser(ctx);
  await assertProjectOwner(ctx, args.projectId, user._id);
  const request = await ctx.db.get(args.requestId);
  if (!request || request.project !== args.projectId) {
    throw new Error("Request does not belong to the Project Board");
  }
  return await ctx.db
    .query("workItemHandoffs")
    .withIndex("by_request_provider", (q) =>
      q.eq("requestId", request._id).eq("provider", args.provider),
    )
    .unique();
}

async function scheduleReconciliation(
  ctx: MutationCtx,
  handoffId: Id<"workItemHandoffs">,
  delay: number,
) {
  await ctx.scheduler.runAfter(
    handoffDelayWithJitter(delay, handoffId),
    internal.workItemHandoffs.reconcileInternal,
    {
      handoffId,
    },
  );
}

export const get = query({
  args: {
    projectId: v.id("projects"),
    requestId: v.id("requests"),
    provider: workTrackerProviderValidator,
  },
  handler: async (ctx, args) => await getOwnedHandoff(ctx, args),
});

export const getSurface = query({
  args: {
    projectId: v.id("projects"),
    requestId: v.id("requests"),
    provider: workTrackerProviderValidator,
  },
  handler: async (ctx, args) => {
    const handoff = await getOwnedHandoff(ctx, args);
    const connection = await ctx.db
      .query("workTrackerConnections")
      .withIndex("by_project_provider", (q) =>
        q.eq("projectId", args.projectId).eq("provider", args.provider),
      )
      .unique();
    return {
      connection: connection
        ? { health: connection.health, destinationLabel: connection.destinationLabel }
        : null,
      handoff,
    };
  },
});

export const getOwnedInternal = internalQuery({
  args: {
    projectId: v.id("projects"),
    requestId: v.id("requests"),
    provider: workTrackerProviderValidator,
  },
  handler: async (ctx, args) => await getOwnedHandoff(ctx, args),
});

export const getByIdInternal = internalQuery({
  args: { handoffId: v.id("workItemHandoffs") },
  handler: async (ctx, args) => await ctx.db.get(args.handoffId),
});

export const reserveInternal = internalMutation({
  args: {
    projectId: v.id("projects"),
    requestId: v.id("requests"),
    provider: workTrackerProviderValidator,
    connectionId: v.id("workTrackerConnections"),
    connectionUpdatedAt: v.number(),
    recovery: workItemHandoffRecoveryValidator,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const project = await assertProjectOwner(ctx, args.projectId, user._id);
    const request = await ctx.db.get(args.requestId);
    if (!request || request.project !== args.projectId) {
      throw new Error("Request does not belong to the Project Board");
    }
    if (args.recovery.provider !== args.provider) {
      throw new Error("Work Item Handoff provider data does not match");
    }

    const existing = await ctx.db
      .query("workItemHandoffs")
      .withIndex("by_request_provider", (q) =>
        q.eq("requestId", args.requestId).eq("provider", args.provider),
      )
      .unique();
    const now = Date.now();
    if (existing && existing.lifecycle.state !== "failed") {
      if (
        existing.lifecycle.state === "pending" &&
        isPendingLeaseExpired(existing.lifecycle.leaseExpiresAt, now)
      ) {
        const lifecycle = {
          state: "unknown" as const,
          errorCode: "handoff_lease_expired",
          errorMessage: "Wish could not confirm whether the External Work Item was created",
        };
        await ctx.db.patch(existing._id, { lifecycle, updatedAt: now });
        await scheduleReconciliation(
          ctx,
          existing._id,
          WORK_ITEM_HANDOFF_RECONCILIATION_DELAYS_MS[0],
        );
        return {
          handoff: { ...existing, lifecycle, updatedAt: now },
          shouldSend: false,
          project,
          request,
        };
      }
      return { handoff: existing, shouldSend: false, project, request };
    }

    const connection = await ctx.db.get(args.connectionId);
    if (
      !connection ||
      connection.projectId !== args.projectId ||
      connection.provider !== args.provider ||
      connection.updatedAt !== args.connectionUpdatedAt ||
      connection.health !== "active" ||
      isWorkTrackerCredentialLeaseActive(
        connection.data.provider === "linear" ? connection.data.credentialLease : undefined,
        now,
      )
    ) {
      throw new Error("Work Tracker connection changed; reload and try again");
    }
    if (connection.data.provider === "linear" && connection.data.credentialLease) {
      await ctx.db.patch(connection._id, {
        data: { ...connection.data, credentialLease: undefined },
        updatedAt: now,
      });
    }
    const attemptCount = existing ? existing.attemptCount + 1 : 1;
    const lifecycle = {
      state: "pending" as const,
      leaseExpiresAt: now + WORK_ITEM_HANDOFF_LEASE_MS,
    };
    let handoffId = existing?._id;
    if (existing) {
      await ctx.db.patch(existing._id, {
        attemptCount,
        reconciliationCount: 0,
        recovery: args.recovery,
        lifecycle,
        updatedAt: now,
      });
    } else {
      handoffId = await ctx.db.insert("workItemHandoffs", {
        projectId: args.projectId,
        requestId: args.requestId,
        provider: args.provider,
        attemptCount,
        reconciliationCount: 0,
        recovery: args.recovery,
        lifecycle,
        createdAt: now,
        updatedAt: now,
      });
    }
    if (!handoffId) throw new Error("Work Item Handoff reservation failed");

    await ctx.scheduler.runAfter(
      WORK_ITEM_HANDOFF_LEASE_MS,
      internal.workItemHandoffs.expirePendingInternal,
      { handoffId, attemptCount },
    );
    const handoff = await ctx.db.get(handoffId);
    if (!handoff) throw new Error("Work Item Handoff reservation failed");
    return { handoff, shouldSend: true, project, request };
  },
});

export const expirePendingInternal = internalMutation({
  args: { handoffId: v.id("workItemHandoffs"), attemptCount: v.number() },
  handler: async (ctx, args) => {
    const handoff = await ctx.db.get(args.handoffId);
    const now = Date.now();
    if (
      !handoff ||
      handoff.attemptCount !== args.attemptCount ||
      handoff.lifecycle.state !== "pending" ||
      !isPendingLeaseExpired(handoff.lifecycle.leaseExpiresAt, now)
    ) {
      return false;
    }
    await ctx.db.patch(handoff._id, {
      lifecycle: {
        state: "unknown",
        errorCode: "handoff_lease_expired",
        errorMessage: "Wish could not confirm whether the External Work Item was created",
      },
      updatedAt: now,
    });
    await scheduleReconciliation(ctx, handoff._id, WORK_ITEM_HANDOFF_RECONCILIATION_DELAYS_MS[0]);
    return true;
  },
});

export const completeSucceededInternal = internalMutation({
  args: {
    handoffId: v.id("workItemHandoffs"),
    attemptCount: v.number(),
    externalIdentity: externalWorkItemIdentityValidator,
  },
  handler: async (ctx, args) => {
    const handoff = await ctx.db.get(args.handoffId);
    if (
      !handoff ||
      handoff.attemptCount !== args.attemptCount ||
      handoff.lifecycle.state !== "pending" ||
      args.externalIdentity.provider !== handoff.provider
    ) {
      return false;
    }
    const now = Date.now();
    await ctx.db.patch(handoff._id, {
      lifecycle: { state: "succeeded", externalIdentity: args.externalIdentity, succeededAt: now },
      updatedAt: now,
    });
    return true;
  },
});

export const completeFailedInternal = internalMutation({
  args: {
    handoffId: v.id("workItemHandoffs"),
    attemptCount: v.number(),
    errorCode: v.string(),
    errorMessage: v.string(),
    providerCorrelationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const handoff = await ctx.db.get(args.handoffId);
    if (
      !handoff ||
      handoff.attemptCount !== args.attemptCount ||
      handoff.lifecycle.state !== "pending"
    ) {
      return false;
    }
    const now = Date.now();
    await ctx.db.patch(handoff._id, {
      lifecycle: {
        state: "failed",
        errorCode: args.errorCode,
        errorMessage: args.errorMessage,
        providerCorrelationId: args.providerCorrelationId,
      },
      updatedAt: now,
    });
    return true;
  },
});

export const completeUnknownInternal = internalMutation({
  args: {
    handoffId: v.id("workItemHandoffs"),
    attemptCount: v.number(),
    errorCode: v.string(),
    errorMessage: v.string(),
    providerCorrelationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const handoff = await ctx.db.get(args.handoffId);
    if (
      !handoff ||
      handoff.attemptCount !== args.attemptCount ||
      handoff.lifecycle.state !== "pending"
    ) {
      return false;
    }
    const now = Date.now();
    await ctx.db.patch(handoff._id, {
      lifecycle: {
        state: "unknown",
        errorCode: args.errorCode,
        errorMessage: args.errorMessage,
        providerCorrelationId: args.providerCorrelationId,
      },
      updatedAt: now,
    });
    await scheduleReconciliation(ctx, handoff._id, WORK_ITEM_HANDOFF_RECONCILIATION_DELAYS_MS[0]);
    return true;
  },
});

export const completeReconciliationInternal = internalMutation({
  args: {
    handoffId: v.id("workItemHandoffs"),
    expectedReconciliationCount: v.number(),
    externalIdentity: v.optional(externalWorkItemIdentityValidator),
  },
  handler: async (ctx, args) => {
    const handoff = await ctx.db.get(args.handoffId);
    if (!handoff || handoff.lifecycle.state !== "unknown") {
      return false;
    }
    if (args.externalIdentity && args.externalIdentity.provider !== handoff.provider) {
      return false;
    }
    if (
      !args.externalIdentity &&
      handoff.reconciliationCount !== args.expectedReconciliationCount
    ) {
      return false;
    }
    const now = Date.now();
    const reconciliationCount = args.externalIdentity
      ? Math.max(handoff.reconciliationCount, args.expectedReconciliationCount + 1)
      : handoff.reconciliationCount + 1;
    if (args.externalIdentity) {
      await ctx.db.patch(handoff._id, {
        reconciliationCount,
        lifecycle: {
          state: "succeeded",
          externalIdentity: args.externalIdentity,
          succeededAt: now,
        },
        updatedAt: now,
      });
      return true;
    }

    await ctx.db.patch(handoff._id, { reconciliationCount, updatedAt: now });
    const nextDelay = WORK_ITEM_HANDOFF_RECONCILIATION_DELAYS_MS[reconciliationCount];
    if (nextDelay !== undefined) {
      await scheduleReconciliation(ctx, handoff._id, nextDelay);
    }
    return true;
  },
});

export const send = action({
  args: {
    projectId: v.id("projects"),
    requestId: v.id("requests"),
    provider: workTrackerProviderValidator,
  },
  handler: async (ctx, args): Promise<Doc<"workItemHandoffs">> => {
    switch (args.provider) {
      case "linear":
        return await sendLinearHandoff(ctx, args);
      case "github":
        return await sendGitHubHandoff(ctx, args);
    }
  },
});

export const reconcileInternal = internalAction({
  args: { handoffId: v.id("workItemHandoffs") },
  handler: async (ctx, args): Promise<Doc<"workItemHandoffs"> | null> => {
    const handoff: Doc<"workItemHandoffs"> | null = await ctx.runQuery(
      internal.workItemHandoffs.getByIdInternal,
      args,
    );
    if (!handoff || handoff.lifecycle.state !== "unknown") return handoff;

    switch (handoff.provider) {
      case "linear":
        return await ctx.runAction(internal.linearWorkItemHandoffs.reconcileInternal, args);
      case "github":
        return await ctx.runAction(internal.githubWorkItemHandoffs.reconcileInternal, args);
    }
  },
});

export const check = action({
  args: {
    projectId: v.id("projects"),
    requestId: v.id("requests"),
    provider: workTrackerProviderValidator,
  },
  handler: async (ctx, args): Promise<Doc<"workItemHandoffs"> | null> => {
    const handoff: Doc<"workItemHandoffs"> | null = await ctx.runQuery(
      internal.workItemHandoffs.getOwnedInternal,
      args,
    );
    if (!handoff || handoff.lifecycle.state !== "unknown") {
      throw new Error("Work Item Handoff is not awaiting reconciliation");
    }
    return await ctx.runAction(internal.workItemHandoffs.reconcileInternal, {
      handoffId: handoff._id,
    });
  },
});
