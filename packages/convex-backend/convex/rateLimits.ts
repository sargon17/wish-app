import { v } from "convex/values";

import { internalMutation } from "./_generated/server";

export const checkRateLimitInternal = internalMutation({
  args: {
    bucket: v.string(),
    limit: v.number(),
    windowMs: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("apiRateLimits")
      .withIndex("by_bucket", (q) => q.eq("bucket", args.bucket))
      .unique();

    if (!existing) {
      await ctx.db.insert("apiRateLimits", {
        bucket: args.bucket,
        windowStartedAt: now,
        count: 1,
      });

      return { allowed: true, retryAfterMs: 0 };
    }

    if (now - existing.windowStartedAt >= args.windowMs) {
      await ctx.db.patch(existing._id, {
        windowStartedAt: now,
        count: 1,
      });

      return { allowed: true, retryAfterMs: 0 };
    }

    if (existing.count >= args.limit) {
      return {
        allowed: false,
        retryAfterMs: Math.max(0, args.windowMs - (now - existing.windowStartedAt)),
      };
    }

    await ctx.db.patch(existing._id, {
      count: existing.count + 1,
    });

    return { allowed: true, retryAfterMs: 0 };
  },
});
