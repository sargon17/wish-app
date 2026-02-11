import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { assertProjectOwner, getCurrentUser, getCurrentUserOrNull } from "./lib/authorization";

export const getByProject = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    const projectId = args.id as Id<"projects">;
    if (user) {
      await assertProjectOwner(ctx, projectId, user._id);
    }

    const requests = await ctx.db
      .query("requests")
      .filter((q) => q.eq(q.field("project"), args.id))
      .collect();

    return requests;
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
    status: v.id("requestStatuses"),
    project: v.id("projects"),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("requests", { ...args, upvoteCount: 0 });
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

    await ctx.db.patch(args.id, { status: args.status });
  },
});

export const deleteRequest = mutation({
  args: { id: v.id("requests") },
  handler: async (ctx, args) => {
    try {
      const user = await getCurrentUser(ctx);
      const request = await ctx.db.get(args.id);
      if (!request) {
        throw new Error("Request not found");
      }
      await assertProjectOwner(ctx, request.project, user._id);

      const upvotes = await ctx.db
        .query("requestUpvotes")
        .withIndex("by_request", (q) => q.eq("requestId", args.id))
        .collect();
      const comments = await ctx.db
        .query("requestComments")
        .withIndex("by_request", (q) => q.eq("requestId", args.id))
        .collect();

      await Promise.all(upvotes.map((upvote) => ctx.db.delete(upvote._id)));
      await Promise.all(comments.map((comment) => ctx.db.delete(comment._id)));
      await ctx.db.delete(args.id);
    } catch (error) {
      console.error(error);
      throw new Error("Failed to delete request");
    }
  },
});
