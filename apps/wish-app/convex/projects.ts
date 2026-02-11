import { v } from "convex/values";

import { internalQuery, mutation, query } from "./_generated/server";
import { assertProjectOwner, getCurrentUser, getCurrentUserOrNull } from "./lib/authorization";

function createProjectApiKey() {
  return `wish_pk_${crypto.randomUUID().replaceAll("-", "")}`;
}

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
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.id);
    if (!project) {
      return null;
    }
    const { apiKey, ...publicProject } = project;
    return publicProject;
  },
});

export const getProjectByIdInternal = internalQuery({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
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

    await ctx.db.insert("projects", {
      title: args.title,
      user: user._id,
      apiKey: createProjectApiKey(),
    });
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

export const rotateApiKey = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    try {
      const user = await getCurrentUser(ctx);
      await assertProjectOwner(ctx, args.id, user._id);

      const apiKey = createProjectApiKey();
      await ctx.db.patch(args.id, { apiKey });

      return { apiKey };
    } catch (error) {
      console.error(error);
      throw new Error("Failed to rotate project API key");
    }
  },
});

export const backfillMissingApiKeys = mutation({
  args: {},
  handler: async (ctx) => {
    try {
      const user = await getCurrentUser(ctx);
      const projects = await ctx.db
        .query("projects")
        .withIndex("by_user", (q) => q.eq("user", user._id))
        .collect();

      const missing = projects.filter((project) => !project.apiKey);

      await Promise.all(
        missing.map((project) =>
          ctx.db.patch(project._id, {
            apiKey: createProjectApiKey(),
          }),
        ),
      );

      return {
        updated: missing.length,
      };
    } catch (error) {
      console.error(error);
      throw new Error("Failed to backfill missing project API keys");
    }
  },
});
