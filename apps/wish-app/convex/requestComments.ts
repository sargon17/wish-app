import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { internalQuery, mutation, query } from "./_generated/server";
import { assertProjectOwner, getCurrentUser, getCurrentUserOrNull } from "./lib/authorization";

async function listCommentsByRequestId(ctx: QueryCtx, requestId: Id<"requests">) {
  return await ctx.db
    .query("requestComments")
    .withIndex("by_request_created", (q) => q.eq("requestId", requestId))
    .collect();
}

export const listByRequest = query({
  args: { requestId: v.id("requests") },
  handler: async (ctx, args) => {
    try {
      const request = await ctx.db.get(args.requestId);
      if (!request) {
        throw new Error("Request not found");
      }

      const user = await getCurrentUser(ctx);
      await assertProjectOwner(ctx, request.project, user._id);

      return await listCommentsByRequestId(ctx, args.requestId);
    } catch (error) {
      console.error(error);
      throw new Error("Failed to load comments");
    }
  },
});

export const listByRequestInternal = internalQuery({
  args: { requestId: v.id("requests") },
  handler: async (ctx, args) => {
    return await listCommentsByRequestId(ctx, args.requestId);
  },
});

export const create = mutation({
  args: {
    requestId: v.id("requests"),
    projectId: v.id("projects"),
    body: v.string(),
    clientId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const trimmed = args.body.trim();
      if (trimmed.length === 0) {
        throw new Error("Comment cannot be empty");
      }

      if (trimmed.length > 1000) {
        throw new Error("Comment is too long");
      }

      const request = await ctx.db.get(args.requestId);
      if (!request) {
        throw new Error("Request not found");
      }

      if (request.project !== args.projectId) {
        throw new Error("Request does not belong to project");
      }

      const user = await getCurrentUserOrNull(ctx);
      if (user) {
        return await ctx.db.insert("requestComments", {
          requestId: args.requestId,
          projectId: args.projectId,
          authorType: "developer",
          authorUserId: user._id,
          body: trimmed,
          createdAt: Date.now(),
        });
      }

      if (!args.clientId) {
        throw new Error("Client id is required for public comments");
      }

      return await ctx.db.insert("requestComments", {
        requestId: args.requestId,
        projectId: args.projectId,
        authorType: "client",
        authorClientId: args.clientId,
        body: trimmed,
        createdAt: Date.now(),
      });
    } catch (error) {
      console.error(error);
      throw new Error("Failed to create comment");
    }
  },
});

export const remove = mutation({
  args: { id: v.id("requestComments") },
  handler: async (ctx, args) => {
    try {
      const user = await getCurrentUser(ctx);

      const comment = await ctx.db.get(args.id);
      if (!comment) {
        throw new Error("Comment not found");
      }
      await assertProjectOwner(ctx, comment.projectId, user._id);

      await ctx.db.delete(args.id);
    } catch (error) {
      console.error(error);
      throw new Error("Failed to delete comment");
    }
  },
});
