import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { assertProjectOwner, getCurrentUser, getCurrentUserOrNull } from "./lib/authorization";

// export const getForCurrentUser = query({
//   args: {},
//   handler: async (ctx) => {
//     const identity = await ctx.auth.getUserIdentity()
//     if (identity === null) {
//       throw new Error('Not authenticated')
//     }
//     return await ctx.db
//       .query('projects')
//       .filter(q => q.eq(q.field('user'), identity.email))
//       .collect()
//   },
// })

export const getProjectById = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.id as Id<"projects">);
    if (!project) {
      return null;
    }

    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      return project;
    }

    if (project.user !== user._id) {
      return null;
    }

    return project;
  },
});

export const getProjectsForUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      return [];
    }

    return await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("user", user._id))
      .collect();
  },
});

export const createProject = mutation({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    await ctx.db.insert("projects", { title: args.title, user: user._id });
  },
});

export const deleteProject = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertProjectOwner(ctx, args.id, user._id);

    await ctx.db.delete(args.id);
  },
});
