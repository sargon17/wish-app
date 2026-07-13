import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { internalQuery, mutation, query } from "./_generated/server";
import { createApiKeyRecord } from "./apiKeys";
import { assertProjectOwner, getCurrentUser } from "./lib/authorization";
import { ensureProjectPublicChangelogSlug } from "./lib/projectChangelog";
import { toPublicProject } from "./lib/projectPublic";
import { createUniqueProjectSlug } from "./lib/projectSlug";
import { STARTER_PROJECT_STATUSES } from "./lib/requestStatusStarterData";

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
    const title = args.title.trim();

    if (title.length < 3) {
      throw new Error("Project title must be at least 3 characters long");
    }

    const projectSlug = await createUniqueProjectSlug(ctx, title);

    const projectId = await ctx.db.insert("projects", {
      title,
      user: user._id,
      projectSlug,
    });

    for (const [position, status] of STARTER_PROJECT_STATUSES.entries()) {
      await ctx.db.insert("requestStatuses", {
        name: status.name,
        displayName: status.displayName,
        project: projectId,
        type: "default",
        color: status.color,
        position,
      });
    }

    await ensureProjectPublicChangelogSlug(ctx, projectId);

    const { apiKey } = await createApiKeyRecord(ctx, {
      projectId,
      createdBy: user._id,
      name: "Default key",
      scopes: ["admin"],
    });

    return { projectId, apiKey };
  },
});

export const publishSuggestionPortal = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const project = await assertProjectOwner(ctx, args.id, user._id);
    const projectSlug = project.projectSlug ?? (await createUniqueProjectSlug(ctx, project.title));
    const suggestionPortalPublishedAt = project.suggestionPortalPublishedAt ?? Date.now();

    await ctx.db.patch(project._id, {
      projectSlug,
      suggestionPortalPublishedAt,
    });

    return toPublicProject({
      ...project,
      projectSlug,
      suggestionPortalPublishedAt,
    });
  },
});

export const unpublishSuggestionPortal = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const project = await assertProjectOwner(ctx, args.id, user._id);

    await ctx.db.patch(project._id, {
      suggestionPortalPublishedAt: undefined,
    });

    return toPublicProject({
      ...project,
      suggestionPortalPublishedAt: undefined,
    });
  },
});

export const updateProject = mutation({
  args: {
    id: v.id("projects"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const project = await assertProjectOwner(ctx, args.id, user._id);
    const title = args.title.trim();

    if (title.length < 3) {
      throw new Error("Project title must be at least 3 characters long");
    }

    await ctx.db.patch(project._id, { title });

    return toPublicProject({
      ...project,
      title,
    });
  },
});

export const ensurePublicChangelogSlug = mutation({
  args: {
    id: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertProjectOwner(ctx, args.id, user._id);

    const project = await ensureProjectPublicChangelogSlug(ctx, args.id);
    return toPublicProject(project);
  },
});

export const getProjectByPublicChangelogSlugInternal = internalQuery({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_public_changelog_slug", (q) => q.eq("publicChangelogSlug", args.slug))
      .unique();
  },
});

export const backfillMissingProjectSlugs = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("user", user._id))
      .collect();

    let updated = 0;

    for (const project of projects) {
      if (project.projectSlug) {
        continue;
      }

      await ctx.db.patch(project._id, {
        projectSlug: await createUniqueProjectSlug(ctx, project.title),
      });
      updated += 1;
    }

    return { updated };
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
    const apiKeys = await ctx.db
      .query("apiKeys")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();
    const changelogEntries = await ctx.db
      .query("changelogEntries")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();
    const workTrackerConnection = await ctx.db
      .query("workTrackerConnections")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .first();
    const workTrackerSetup = await ctx.db
      .query("workTrackerOAuthSetups")
      .withIndex("by_project_provider", (q) =>
        q.eq("projectId", args.id).eq("provider", "linear"),
      )
      .unique();
    if (
      workTrackerConnection ||
      (workTrackerSetup && workTrackerSetup.data.stage !== "pending")
    ) {
      throw new Error("Disconnect Work Trackers before deleting this project");
    }

    await Promise.all(upvotes.map((upvote) => ctx.db.delete(upvote._id)));
    await Promise.all(comments.map((comment) => ctx.db.delete(comment._id)));
    await Promise.all(requests.map((request) => ctx.db.delete(request._id)));
    await Promise.all(statuses.map((status) => ctx.db.delete(status._id)));
    await Promise.all(apiKeys.map((apiKey) => ctx.db.delete(apiKey._id)));
    await Promise.all(changelogEntries.map((entry) => ctx.db.delete(entry._id)));
    if (workTrackerSetup) await ctx.db.delete(workTrackerSetup._id);

    await ctx.db.delete(args.id);
  },
});

export const rotateApiKey = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    try {
      const user = await getCurrentUser(ctx);
      await assertProjectOwner(ctx, args.id, user._id);

      const activeApiKeys = await ctx.db
        .query("apiKeys")
        .withIndex("by_project_status", (q) => q.eq("projectId", args.id).eq("status", "active"))
        .collect();

      await Promise.all(
        activeApiKeys.map((apiKeyDoc) =>
          ctx.db.patch(apiKeyDoc._id, {
            status: "revoked",
            revokedAt: Date.now(),
          }),
        ),
      );

      const { apiKey } = await createApiKeyRecord(ctx, {
        projectId: args.id,
        createdBy: user._id,
        name: "Rotated key",
        scopes: ["admin"],
      });

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

      const missing = projects.filter((project) => !!project.apiKeyHash);
      const generatedKeys: Array<{ projectId: Id<"projects">; apiKey: string }> = [];

      await Promise.all(
        missing.map(async (project) => {
          const existingApiKeys = await ctx.db
            .query("apiKeys")
            .withIndex("by_project", (q) => q.eq("projectId", project._id))
            .collect();

          if (existingApiKeys.length > 0) {
            return;
          }

          await ctx.db.insert("apiKeys", {
            projectId: project._id,
            name: "Legacy key",
            keyPrefix: "wish_pk_legacy",
            keyHash: project.apiKeyHash!,
            scopes: ["read", "write", "admin"],
            status: "active",
            createdAt: Date.now(),
            createdBy: project.user,
          });
        }),
      );

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
