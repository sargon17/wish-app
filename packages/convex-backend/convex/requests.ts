import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { assertProjectOwner, getCurrentUser } from "./lib/authorization";
import { normalizeRequestInput, requestInputErrorMessage } from "./lib/requestInput";
import { getRequestKind } from "./lib/requestKind";
import { MAX_BULK_REQUESTS } from "./lib/requestLimits";
import { assertStatusBelongsToProject } from "./lib/requestStatusWorkflow";
import { emitNotificationEvent } from "./notificationEvents";

const requestKindValidator = v.union(v.literal("request"), v.literal("complaint"));

export async function getBulkRequests(
  ctx: Pick<MutationCtx, "db">,
  ids: Id<"requests">[],
): Promise<Doc<"requests">[]> {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) {
    throw new Error("Select at least one request");
  }
  if (uniqueIds.length > MAX_BULK_REQUESTS) {
    throw new Error(`Select no more than ${MAX_BULK_REQUESTS} requests`);
  }

  const requests = await Promise.all(uniqueIds.map((id) => ctx.db.get(id)));
  if (requests.some((request) => !request)) {
    throw new Error("Request not found");
  }

  const existingRequests = requests as Doc<"requests">[];
  const projectId = existingRequests[0].project;
  if (existingRequests.some((request) => request.project !== projectId)) {
    throw new Error("Requests must belong to the same project");
  }

  return existingRequests;
}

async function deleteRequestCascade(ctx: MutationCtx, request: Doc<"requests">) {
  const id = request._id;
  const upvotes = await ctx.db
    .query("requestUpvotes")
    .withIndex("by_request", (q) => q.eq("requestId", id))
    .collect();
  const comments = await ctx.db
    .query("requestComments")
    .withIndex("by_request", (q) => q.eq("requestId", id))
    .collect();

  await Promise.all(upvotes.map((upvote) => ctx.db.delete(upvote._id)));
  await Promise.all(comments.map((comment) => ctx.db.delete(comment._id)));
  await ctx.db.delete(id);
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
  handler: async (ctx, args) =>
    await updateRequestStatuses(ctx, { ids: [args.id], status: args.status }),
});

export async function updateRequestStatuses(
  ctx: MutationCtx,
  args: { ids: Id<"requests">[]; status: Id<"requestStatuses"> },
) {
  const user = await getCurrentUser(ctx);
  const requests = await getBulkRequests(ctx, args.ids);
  const projectId = requests[0].project;

  await assertProjectOwner(ctx, projectId, user._id);
  await assertStatusBelongsToProject(ctx, args.status, projectId);
  await Promise.all(requests.map((request) => ctx.db.patch(request._id, { status: args.status })));
}

export const updateStatuses = mutation({
  args: {
    ids: v.array(v.id("requests")),
    status: v.id("requestStatuses"),
  },
  handler: async (ctx, args) => {
    try {
      await updateRequestStatuses(ctx, args);
    } catch (error) {
      console.error(error);
      throw new Error("Failed to update requests");
    }
  },
});

export const deleteRequest = mutation({
  args: { id: v.id("requests") },
  handler: async (ctx, args) => {
    try {
      await deleteOwnedRequests(ctx, [args.id]);
    } catch (error) {
      console.error(error);
      throw new Error("Failed to delete request");
    }
  },
});

export async function deleteOwnedRequests(ctx: MutationCtx, ids: Id<"requests">[]) {
  const user = await getCurrentUser(ctx);
  const requests = await getBulkRequests(ctx, ids);

  await assertProjectOwner(ctx, requests[0].project, user._id);
  await Promise.all(requests.map((request) => deleteRequestCascade(ctx, request)));
}

export const deleteRequests = mutation({
  args: { ids: v.array(v.id("requests")) },
  handler: async (ctx, args) => {
    try {
      await deleteOwnedRequests(ctx, args.ids);
    } catch (error) {
      console.error(error);
      throw new Error("Failed to delete requests");
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

      await deleteRequestCascade(ctx, request);
    } catch (error) {
      console.error(error);
      throw new Error("Failed to delete request");
    }
  },
});
