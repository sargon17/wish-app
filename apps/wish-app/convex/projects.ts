import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { internalQuery, mutation, query } from "./_generated/server";
import { generateProjectApiKey, hashProjectApiKey, verifyProjectApiKeyHash } from "./lib/apiKeys";
import { assertProjectOwner, getCurrentUser } from "./lib/authorization";
import { toPublicProject } from "./lib/projectPublic";

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
    const user = await getCurrentUser(ctx);
    const project = await assertProjectOwner(ctx, args.id, user._id);
    return toPublicProject(project);
  },
});

export const getProjectByIdInternal = internalQuery({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const verifyProjectApiKeyHashInternal = internalQuery({
  args: { apiKeyHash: v.optional(v.string()), apiKey: v.string() },
  handler: async (_ctx, args) => {
    if (!args.apiKeyHash) {
      return false;
    }

    return await verifyProjectApiKeyHash(args.apiKeyHash, args.apiKey);
  },
});

export const getProjectsForUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("user", user._id))
      .collect();

    return projects.map((project) => toPublicProject(project));
  },
});

export const createProject = mutation({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const apiKey = generateProjectApiKey();
    const apiKeyHash = await hashProjectApiKey(apiKey);

    const projectId = await ctx.db.insert("projects", {
      title: args.title,
      user: user._id,
      apiKeyHash,
    });

    return { projectId, apiKey };
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

      const apiKey = generateProjectApiKey();
      const apiKeyHash = await hashProjectApiKey(apiKey);
      await ctx.db.patch(args.id, { apiKeyHash });

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

      const missing = projects.filter((project) => !project.apiKeyHash);
      const generatedKeys: Array<{ projectId: Id<"projects">; apiKey: string }> = [];

      await Promise.all(missing.map(async (project) => {
        const legacyProject = project as Record<string, unknown>;
        const existingPlaintextApiKey =
          typeof legacyProject.apiKey === "string" ? legacyProject.apiKey : undefined;
        const apiKeyToHash = existingPlaintextApiKey ?? generateProjectApiKey();
        const hashedApiKey = await hashProjectApiKey(apiKeyToHash);

        await ctx.db.replace(project._id, {
          title: project.title,
          user: project.user,
          apiKeyHash: hashedApiKey,
        });

        if (!existingPlaintextApiKey) {
          generatedKeys.push({ projectId: project._id, apiKey: apiKeyToHash });
        }
      }));

      return {
        updated: missing.length,
        generatedKeys,
      };
    } catch (error) {
      console.error(error);
      throw new Error("Failed to backfill missing project API keys");
    }
  },
});
