import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { assertProjectOwner, getCurrentUser, getCurrentUserOrNull } from "./lib/authorization";

function createProjectApiKey() {
  return `wish_pk_${crypto.randomUUID().replaceAll("-", "")}`;
}

function toPublicProject(project: Doc<"projects">) {
  const { apiKey, ...publicProject } = project;
  return publicProject;
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

    const user = await getCurrentUserOrNull(ctx);
    if (user && project.user === user._id) {
      return project;
    }

    return toPublicProject(project);
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

    const requests = await ctx.db
      .query("requests")
      .withIndex("by_project", (q) => q.eq("project", args.id))
      .collect();
    const statuses = await ctx.db
      .query("requestStatuses")
      .withIndex("by_project", (q) => q.eq("project", args.id))
      .collect();
    const upvotes = await ctx.db
      .query("requestUpvotes")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();
    const comments = await ctx.db
      .query("requestComments")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();

    await Promise.all(upvotes.map((upvote) => ctx.db.delete(upvote._id)));
    await Promise.all(comments.map((comment) => ctx.db.delete(comment._id)));
    await Promise.all(requests.map((request) => ctx.db.delete(request._id)));
    await Promise.all(statuses.map((status) => ctx.db.delete(status._id)));

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

export const ensureProjectApiKeyInternal = internalMutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.id);
    if (!project) {
      return null;
    }

    if (project.apiKey) {
      return project.apiKey;
    }

    const apiKey = createProjectApiKey();
    await ctx.db.patch(args.id, { apiKey });
    return apiKey;
  },
});
