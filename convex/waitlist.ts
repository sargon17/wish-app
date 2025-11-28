import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    try {
      const identity = await ctx.auth.getUserIdentity();

      if (identity === null) {
        throw new Error("Not authenticated");
      }

      const entries = await ctx.db.query("waitlist").collect();

      return entries
        .map((entry) => ({
          ...entry,
          appliedAt: entry.appliedAt ?? 0,
        }))
        .sort((a, b) => b.appliedAt - a.appliedAt);
    } catch (error) {
      console.error(error);
      throw new Error("Failed to load waitlist");
    }
  },
});

export const join = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error("Email is required");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("waitlist")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .unique();

    if (existing) {
      if (existing.email !== normalizedEmail) {
        await ctx.db.patch(existing._id, { email: normalizedEmail });
      }
      return existing._id;
    }

    return await ctx.db.insert("waitlist", {
      email: normalizedEmail,
      appliedAt: now,
    });
  },
});

export const markInvited = mutation({
  args: { email: v.string(), invitedAt: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      throw new Error("Not authenticated");
    }

    const normalizedEmail = args.email.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error("Email is required");
    }

    const timestamp = args.invitedAt ?? Date.now();
    const existing = await ctx.db
      .query("waitlist")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: normalizedEmail,
        invitedAt: timestamp,
        appliedAt: existing.appliedAt ?? timestamp,
      });
      return existing._id;
    }

    return await ctx.db.insert("waitlist", {
      email: normalizedEmail,
      appliedAt: timestamp,
      invitedAt: timestamp,
    });
  },
});

export const setStatus = mutation({
  args: {
    id: v.id("waitlist"),
    status: v.union(v.literal("pending"), v.literal("invited")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      throw new Error("Not authenticated");
    }

    const entry = await ctx.db.get(args.id);

    if (!entry) {
      throw new Error("Waitlist entry not found");
    }

    await ctx.db.patch(args.id, {
      invitedAt: args.status === "invited" ? Date.now() : undefined,
      appliedAt: entry.appliedAt ?? Date.now(),
    });

    return args.id;
  },
});
