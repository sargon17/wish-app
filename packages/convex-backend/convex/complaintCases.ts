import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { assertProjectOwner, getCurrentUser } from "./lib/authorization";
import { getRequestKind } from "./lib/requestKind";

const complaintStageValidator = v.union(
  v.literal("new"),
  v.literal("triaged"),
  v.literal("in_progress"),
  v.literal("awaiting_user"),
  v.literal("closed"),
  v.literal("rejected"),
  v.literal("duplicate"),
);
const complaintSeverityValidator = v.union(v.literal("S1"), v.literal("S2"), v.literal("S3"));
const complaintOutcomeValidator = v.union(
  v.literal("resolved"),
  v.literal("cannot_fix"),
  v.literal("rejected"),
  v.literal("customer_issue"),
  v.literal("duplicate"),
);
const terminalComplaintStages = new Set(["closed", "rejected", "duplicate"]);

function normalizeOptionalText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function assertComplaintTriageFields(args: {
  stage: string;
  ownerUserId?: Id<"users">;
  severity?: "S1" | "S2" | "S3";
  category?: string;
  firstResponseDueAt?: number;
}) {
  if (args.stage === "new") {
    return;
  }

  if (!args.ownerUserId || !args.severity || !args.category || !args.firstResponseDueAt) {
    throw new Error("Owner, severity, category, and first response ETA are required after triage");
  }
}

function assertComplaintClosureFields(args: {
  stage: string;
  outcome?: "resolved" | "cannot_fix" | "rejected" | "customer_issue" | "duplicate";
  outcomeSummary?: string;
}) {
  if (!terminalComplaintStages.has(args.stage)) {
    return;
  }

  if (!args.outcome || !args.outcomeSummary) {
    throw new Error("Outcome and resolution summary are required to close a complaint");
  }
}

export const getByProject = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertProjectOwner(ctx, args.id, user._id);

    const requests = await ctx.db
      .query("requests")
      .withIndex("by_project", (q) => q.eq("project", args.id))
      .collect();
    const complaints = requests
      .filter((request) => getRequestKind(request) === "complaint")
      .sort((a, b) => b._creationTime - a._creationTime);
    const ownerIds = new Set(
      complaints.flatMap((complaint) =>
        complaint.complaintOwnerUserId ? [complaint.complaintOwnerUserId] : [],
      ),
    );
    const owners = await Promise.all([...ownerIds].map((ownerId) => ctx.db.get(ownerId)));
    const ownerNameById = new Map(
      owners.filter((owner): owner is Doc<"users"> => Boolean(owner)).map((owner) => [owner._id, owner.name]),
    );
    const commentCounts = new Map<string, number>();
    const comments = await ctx.db
      .query("requestComments")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();

    for (const comment of comments) {
      const key = comment.requestId.toString();
      commentCounts.set(key, (commentCounts.get(key) ?? 0) + 1);
    }

    return {
      currentUser: { _id: user._id, name: user.name },
      complaints: complaints.map((complaint) => ({
        ...complaint,
        complaintStage: complaint.complaintStage ?? "new",
        ownerName: complaint.complaintOwnerUserId
          ? ownerNameById.get(complaint.complaintOwnerUserId) ?? "Unknown owner"
          : undefined,
        commentCount: commentCounts.get(complaint._id.toString()) ?? 0,
      })),
    };
  },
});

export const getEvents = query({
  args: { requestId: v.id("requests") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request || getRequestKind(request) !== "complaint") {
      throw new Error("Complaint not found");
    }
    await assertProjectOwner(ctx, request.project, user._id);

    const events = await ctx.db
      .query("complaintCaseEvents")
      .withIndex("by_request", (q) => q.eq("requestId", args.requestId))
      .collect();
    const userIds = new Set(
      events.flatMap((event) => [
        event.createdBy,
        ...(event.fromOwnerUserId ? [event.fromOwnerUserId] : []),
        ...(event.toOwnerUserId ? [event.toOwnerUserId] : []),
      ]),
    );
    const users = await Promise.all([...userIds].map((userId) => ctx.db.get(userId)));
    const userNameById = new Map(
      users.filter((item): item is Doc<"users"> => Boolean(item)).map((item) => [item._id, item.name]),
    );

    return events
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((event) => ({
        ...event,
        createdByName: userNameById.get(event.createdBy) ?? "Unknown user",
        fromOwnerName: event.fromOwnerUserId ? userNameById.get(event.fromOwnerUserId) : undefined,
        toOwnerName: event.toOwnerUserId ? userNameById.get(event.toOwnerUserId) : undefined,
      }));
  },
});

export const update = mutation({
  args: {
    id: v.id("requests"),
    stage: complaintStageValidator,
    severity: v.optional(complaintSeverityValidator),
    category: v.optional(v.string()),
    ownerUserId: v.optional(v.id("users")),
    firstResponseDueAt: v.optional(v.number()),
    outcome: v.optional(complaintOutcomeValidator),
    outcomeSummary: v.optional(v.string()),
    handoffReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const request = await ctx.db.get(args.id);
    if (!request || getRequestKind(request) !== "complaint") {
      throw new Error("Complaint not found");
    }
    await assertProjectOwner(ctx, request.project, user._id);

    const category = normalizeOptionalText(args.category);
    const outcomeSummary = normalizeOptionalText(args.outcomeSummary);
    const handoffReason = normalizeOptionalText(args.handoffReason);

    if (args.ownerUserId && args.ownerUserId !== user._id) {
      throw new Error("Only assigning complaints to yourself is supported");
    }

    if (request.complaintOwnerUserId && request.complaintOwnerUserId !== args.ownerUserId && !handoffReason) {
      throw new Error("Handoff reason is required when custody changes");
    }

    assertComplaintTriageFields({
      stage: args.stage,
      ownerUserId: args.ownerUserId,
      severity: args.severity,
      category,
      firstResponseDueAt: args.firstResponseDueAt,
    });
    assertComplaintClosureFields({
      stage: args.stage,
      outcome: args.outcome,
      outcomeSummary,
    });

    const wasTerminal = terminalComplaintStages.has(request.complaintStage ?? "new");
    const isTerminal = terminalComplaintStages.has(args.stage);
    const now = Date.now();

    await ctx.db.patch(args.id, {
      complaintStage: args.stage,
      complaintSeverity: args.severity,
      complaintCategory: category,
      complaintOwnerUserId: args.ownerUserId,
      complaintFirstResponseDueAt: args.firstResponseDueAt,
      complaintOutcome: isTerminal ? args.outcome : undefined,
      complaintOutcomeSummary: isTerminal ? outcomeSummary : undefined,
      complaintClosedAt: isTerminal ? request.complaintClosedAt ?? now : undefined,
    });

    const baseEvent = {
      requestId: request._id,
      projectId: request.project,
      createdBy: user._id,
      createdAt: now,
    };

    if ((request.complaintStage ?? "new") !== args.stage) {
      await ctx.db.insert("complaintCaseEvents", {
        ...baseEvent,
        type: isTerminal
          ? "closure"
          : (request.complaintStage ?? "new") === "new" && args.stage === "triaged"
            ? "triage"
            : "stage",
        fromStage: request.complaintStage ?? "new",
        toStage: args.stage,
        reason: isTerminal ? outcomeSummary : undefined,
      });
    }

    if (request.complaintOwnerUserId !== args.ownerUserId) {
      await ctx.db.insert("complaintCaseEvents", {
        ...baseEvent,
        type: "owner",
        fromOwnerUserId: request.complaintOwnerUserId,
        toOwnerUserId: args.ownerUserId,
        reason: handoffReason,
      });
    }

    if (wasTerminal && !isTerminal) {
      await ctx.db.insert("complaintCaseEvents", {
        ...baseEvent,
        type: "stage",
        fromStage: request.complaintStage,
        toStage: args.stage,
        reason: "Reopened",
      });
    }
  },
});
