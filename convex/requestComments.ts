import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const listByRequest = query({
  args: { requestId: v.id("requests") },
  handler: async (ctx, args) => {
    try {
      return await ctx.db
        .query("requestComments")
        .withIndex("by_request_created", (q) => q.eq("requestId", args.requestId))
        .collect();
    } catch (error) {
      console.error(error);
      throw new Error("Failed to load comments");
    }
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

      const identity = await ctx.auth.getUserIdentity();
      if (identity) {
        const user = await ctx.db
          .query("users")
          .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
          .unique();

        if (!user) {
          throw new Error("Unauthenticated call to mutation");
        }

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
