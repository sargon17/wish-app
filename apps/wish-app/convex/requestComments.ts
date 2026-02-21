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

export const remove = mutation({
  args: { id: v.id("requestComments") },
  handler: async (ctx, args) => {
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        throw new Error("Not authenticated");
      }

      const comment = await ctx.db.get(args.id);
      if (!comment) {
        throw new Error("Comment not found");
      }

      await ctx.db.delete(args.id);
    } catch (error) {
      console.error(error);
      throw new Error("Failed to delete comment");
    }
  },
});

export const deleteByClient = mutation({
  args: {
    id: v.id("requestComments"),
    clientId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const comment = await ctx.db.get(args.id);
      if (!comment) {
        throw new Error("Comment not found");
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

        await ctx.db.delete(args.id);
        return;
      }

      if (!args.clientId) {
        throw new Error("Client id is required for public comment deletion");
      }

      if (comment.authorType !== "client") {
        throw new Error("Only client comments can be deleted publicly");
      }

      if (comment.authorClientId !== args.clientId) {
        throw new Error("Not allowed to delete this comment");
      }

      await ctx.db.delete(args.id);
    } catch (error) {
      console.error(error);
      throw new Error("Failed to delete comment");
    }
  },
});
