import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { assertProjectOwner, getCurrentUserOrNull } from "./lib/authorization";

export const toggle = mutation({
  args: {
    requestId: v.id("requests"),
    projectId: v.id("projects"),
    clientId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const request = await ctx.db.get(args.requestId);
      if (!request) {
        throw new Error("Request not found");
      }

      if (request.project !== args.projectId) {
        throw new Error("Request does not belong to project");
      }

      const identity = await ctx.auth.getUserIdentity();
      let userId: Id<"users"> | undefined;

      if (identity) {
        const user = await getCurrentUserOrNull(ctx);
        if (!user) {
          throw new Error("Unauthenticated call");
        }
        await assertProjectOwner(ctx, args.projectId, user._id);
        userId = user._id;
      }

      if (!userId && !args.clientId) {
        throw new Error("Client id is required for public upvotes");
      }

      const existing = userId
        ? await ctx.db
            .query("requestUpvotes")
            .withIndex("by_request_user", (q) =>
              q.eq("requestId", args.requestId).eq("userId", userId),
            )
            .unique()
        : await ctx.db
            .query("requestUpvotes")
            .withIndex("by_request_client", (q) =>
              q.eq("requestId", args.requestId).eq("clientId", args.clientId),
            )
            .unique();

      const currentCount = request.upvoteCount ?? 0;

      if (existing) {
        await ctx.db.delete(existing._id);
        const nextCount = Math.max(0, currentCount - 1);
        await ctx.db.patch(args.requestId, { upvoteCount: nextCount });
        return { upvoted: false, upvoteCount: nextCount };
      }

      await ctx.db.insert("requestUpvotes", {
        requestId: args.requestId,
        projectId: args.projectId,
        userId,
        clientId: userId ? undefined : args.clientId,
        createdAt: Date.now(),
      });

      const nextCount = currentCount + 1;
      await ctx.db.patch(args.requestId, { upvoteCount: nextCount });

      return { upvoted: true, upvoteCount: nextCount };
    } catch (error) {
      console.error(error);
      throw new Error("Failed to toggle upvote");
    }
  },
});

export const getViewerUpvotesByProject = query({
  args: {
    projectId: v.id("projects"),
    clientId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const identity = await ctx.auth.getUserIdentity();
      let userId: Id<"users"> | undefined;

      if (identity) {
        const user = await getCurrentUserOrNull(ctx);
        if (!user) {
          throw new Error("Unauthenticated call");
        }
        await assertProjectOwner(ctx, args.projectId, user._id);
        userId = user._id;
      }

      if (!userId && !args.clientId) {
        return [];
      }

      const upvotesQuery = ctx.db
        .query("requestUpvotes")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId));

      const upvotes = userId
        ? await upvotesQuery.filter((q) => q.eq(q.field("userId"), userId)).collect()
        : await upvotesQuery
            .filter((q) => q.eq(q.field("clientId"), args.clientId))
            .collect();

      return upvotes.map((upvote) => upvote.requestId);
    } catch (error) {
      console.error(error);
      throw new Error("Failed to load upvotes");
    }
  },
});
