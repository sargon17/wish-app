import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { assertProjectOwner, getCurrentUser } from "./lib/authorization";
import { normalizeRequestInput, requestInputErrorMessage } from "./lib/requestInput";
import { getRequestKind } from "./lib/requestKind";
import { assertStatusBelongsToProject } from "./lib/requestStatusWorkflow";
import { isHandoffBlocking } from "./lib/workItemHandoff";
import { emitNotificationEvent } from "./notificationEvents";

const requestKindValidator = v.union(v.literal("request"), v.literal("complaint"));

async function deleteRequestCascade(ctx: MutationCtx, id: Id<"requests">) {
  const request = await ctx.db.get(id);
  if (!request) {
    throw new Error("Request not found");
  }

  const upvotes = await ctx.db
    .query("requestUpvotes")
    .withIndex("by_request", (q) => q.eq("requestId", id))
    .collect();
  const comments = await ctx.db
    .query("requestComments")
    .withIndex("by_request", (q) => q.eq("requestId", id))
    .collect();

  const handoffs = await ctx.db
    .query("workItemHandoffs")
    .withIndex("by_request", (q) => q.eq("requestId", id))
    .collect();
  if (handoffs.some((handoff) => isHandoffBlocking(handoff.lifecycle.state))) {
    throw new Error("Request cannot be deleted while a Work Item Handoff is unresolved");
  }

  await Promise.all(upvotes.map((upvote) => ctx.db.delete(upvote._id)));
  await Promise.all(comments.map((comment) => ctx.db.delete(comment._id)));
  await Promise.all(handoffs.map((handoff) => ctx.db.delete(handoff._id)));
  await ctx.db.delete(id);

  return request;
}

export const getByProject = query({
  args: { id: v.id("projects"), kind: v.optional(requestKindValidator) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertProjectOwner(ctx, args.id, user._id);
    const kind = args.kind ?? "request";

    const requests = await ctx.db
      .query("requests")
      .withIndex("by_project", (q) => q.eq("project", args.id))
      .collect();

    return requests.filter((request) => getRequestKind(request) === kind);
  },
});

export const getByClientId = query({
  args: {
    projectId: v.id("projects"),
    clientId: v.string(),
    excludeId: v.id("requests"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const user = await getCurrentUser(ctx);
      await assertProjectOwner(ctx, args.projectId, user._id);

      const requests = await ctx.db
        .query("requests")
        .withIndex("by_project", (q) => q.eq("project", args.projectId))
        .filter((q) => q.eq(q.field("clientId"), args.clientId))
        .collect();

      const filtered = requests
        .filter((request) => getRequestKind(request) === "request")
        .filter((request) => request._id !== args.excludeId)
        .sort((a, b) => b._creationTime - a._creationTime);

      const limit = args.limit ?? 5;
      return filtered.slice(0, limit);
    } catch (error) {
      console.error(error);
      throw new Error("Failed to load related requests");
    }
  },
});

export const getRequestByIdInternal = internalQuery({
  args: { id: v.id("requests") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByProjectInternal = internalQuery({
  args: { id: v.id("projects"), kind: v.optional(requestKindValidator) },
  handler: async (ctx, args) => {
    const kind = args.kind ?? "request";
    const requests = await ctx.db
      .query("requests")
      .withIndex("by_project", (q) => q.eq("project", args.id))
      .collect();

    return requests.filter((request) => getRequestKind(request) === kind);
  },
});

// export const createProject = mutation({
//   args: { title: v.string() },
//   handler: async (ctx, args) => {
//     const identity = await ctx.auth.getUserIdentity()

//     if (identity === null) {
//       throw new Error('Not authenticated')
//     }

//     const user = await ctx.db.query('users')
//       .withIndex('by_token', q => q.eq('tokenIdentifier', identity.tokenIdentifier))
//       .unique()

//     if (!user) {
//       throw new Error('Unauthenticated call to mutation')
//     }

//     await ctx.db.insert('projects', { title: args.title, user: user._id })
//     // do something with `taskId`
//   },
// })

export const create = mutation({
  args: {
    text: v.string(),
    description: v.optional(v.string()),
    clientId: v.string(),
    kind: v.optional(requestKindValidator),
    requesterEmail: v.optional(v.string()),
    status: v.id("requestStatuses"),
    project: v.id("projects"),
  },
  handler: async (ctx, args) => {
    await assertStatusBelongsToProject(ctx, args.status, args.project);
    const normalized = normalizeRequestInput({
      text: args.text,
      description: args.description,
      requesterEmail: args.requesterEmail,
    });
    if (!normalized.ok) {
      throw new Error(requestInputErrorMessage(normalized.error));
    }
    const kind = args.kind ?? "request";
    const requestId = await ctx.db.insert("requests", {
      ...normalized.value,
      kind,
      status: args.status,
      project: args.project,
      clientId: args.clientId,
      upvoteCount: 0,
    });

    await emitNotificationEvent(ctx, {
      projectId: args.project,
      type: kind === "complaint" ? "complaint.created" : "request.created",
      requestId,
    });
  },
});

export const edit = mutation({
  args: {
    id: v.id("requests"),
    text: v.string(),
    description: v.optional(v.string()),
    status: v.id("requestStatuses"),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const user = await getCurrentUser(ctx);
    const request = await ctx.db.get(id);
    if (!request) {
      throw new Error("Request not found");
    }
    await assertProjectOwner(ctx, request.project, user._id);
    await assertStatusBelongsToProject(ctx, args.status, request.project);

    await ctx.db.patch(id, { ...fields });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("requests"),
    status: v.id("requestStatuses"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const request = await ctx.db.get(args.id);
    if (!request) {
      throw new Error("Request not found");
    }
    await assertProjectOwner(ctx, request.project, user._id);
    await assertStatusBelongsToProject(ctx, args.status, request.project);

    await ctx.db.patch(args.id, { status: args.status });
  },
});

export const deleteRequest = mutation({
  args: { id: v.id("requests") },
  handler: async (ctx, args) => {
    try {
      const user = await getCurrentUser(ctx);
      const request = await ctx.db.get(args.id);
      if (!request) throw new Error("Request not found");
      await assertProjectOwner(ctx, request.project, user._id);
      await deleteRequestCascade(ctx, args.id);
    } catch (error) {
      console.error(error);
      throw new Error("Failed to delete request");
    }
  },
});

export const deleteRequestByApiKeyInternal = internalMutation({
  args: { id: v.id("requests"), projectId: v.id("projects") },
  handler: async (ctx, args) => {
    try {
      const request = await ctx.db.get(args.id);
      if (!request) {
        throw new Error("Request not found");
      }
      if (request.project !== args.projectId) {
        throw new Error("Request does not belong to project");
      }

      await deleteRequestCascade(ctx, args.id);
    } catch (error) {
      console.error(error);
      throw new Error("Failed to delete request");
    }
  },
});
