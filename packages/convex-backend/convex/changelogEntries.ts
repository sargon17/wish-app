import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalQuery, mutation, query } from "./_generated/server";
import { assertProjectOwner, getCurrentUser } from "./lib/authorization";
import { ensureProjectPublicChangelogSlug } from "./lib/projectChangelog";

const changelogTypeValidator = v.union(
  v.literal("feature"),
  v.literal("improvement"),
  v.literal("fix"),
);

function normalizeOptionalText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeVersionLabel(value: string) {
  return value.trim().toLowerCase();
}

function validatePublishedFields(args: {
  versionLabel: string;
  title: string;
  summary?: string;
  body?: string;
}) {
  if (!args.versionLabel) {
    throw new Error("Add a version label before publishing");
  }

  if (!args.title) {
    throw new Error("Add a title before publishing");
  }

  if (!args.summary && !args.body) {
    throw new Error("Add a summary or body before publishing");
  }
}

function sortEntriesByRecent(left: Doc<"changelogEntries">, right: Doc<"changelogEntries">) {
  const leftTimestamp = left.publishedAt ?? left.updatedAt ?? left._creationTime;
  const rightTimestamp = right.publishedAt ?? right.updatedAt ?? right._creationTime;

  return rightTimestamp - leftTimestamp;
}

function toPublicChangelogEntry(entry: Doc<"changelogEntries">) {
  return {
    versionLabel: entry.versionLabel,
    title: entry.title,
    summary: entry.summary,
    body: entry.body,
    type: entry.type,
    publishedAt: entry.publishedAt,
  };
}

async function listEntriesByProject(ctx: QueryCtx, projectId: Id<"projects">) {
  return await ctx.db
    .query("changelogEntries")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();
}

async function findEntryById(ctx: QueryCtx | MutationCtx, entryId: Id<"changelogEntries">) {
  const entry = await ctx.db.get(entryId);

  if (!entry) {
    throw new Error("Changelog entry not found");
  }

  return entry;
}

async function assertUniqueVersionLabel(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">,
  versionLabel: string,
  currentEntryId?: Id<"changelogEntries">,
) {
  const versionLabelNormalized = normalizeVersionLabel(versionLabel);

  if (!versionLabelNormalized) {
    return;
  }

  const duplicates = await ctx.db
    .query("changelogEntries")
    .withIndex("by_project_version_label", (q) =>
      q.eq("projectId", projectId).eq("versionLabelNormalized", versionLabelNormalized),
    )
    .collect();

  const duplicate = duplicates.find((entry) => entry._id !== currentEntryId);

  if (duplicate) {
    throw new Error("Version label must be unique within the project");
  }
}

async function getPublicFeedBySlug(ctx: QueryCtx, slug: string) {
  const project = await ctx.db
    .query("projects")
    .withIndex("by_public_changelog_slug", (q) => q.eq("publicChangelogSlug", slug))
    .unique();

  if (!project?.publicChangelogSlug) {
    return null;
  }

  const entries = await ctx.db
    .query("changelogEntries")
    .withIndex("by_project_status", (q) => q.eq("projectId", project._id).eq("status", "published"))
    .collect();

  return {
    project: {
      title: project.title,
      publicChangelogSlug: project.publicChangelogSlug,
    },
    entries: entries.sort(sortEntriesByRecent).map((entry) => toPublicChangelogEntry(entry)),
  };
}

export const listByProject = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertProjectOwner(ctx, args.projectId, user._id);

    const entries = await listEntriesByProject(ctx, args.projectId);
    return entries.sort(sortEntriesByRecent);
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    versionLabel: v.string(),
    title: v.string(),
    summary: v.optional(v.string()),
    body: v.optional(v.string()),
    type: changelogTypeValidator,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertProjectOwner(ctx, args.projectId, user._id);
    await ensureProjectPublicChangelogSlug(ctx, args.projectId);

    const versionLabel = args.versionLabel.trim();
    const versionLabelNormalized = normalizeVersionLabel(args.versionLabel);
    const title = args.title.trim();
    const summary = normalizeOptionalText(args.summary);
    const body = normalizeOptionalText(args.body);

    await assertUniqueVersionLabel(ctx, args.projectId, versionLabel);

    const now = Date.now();
    return await ctx.db.insert("changelogEntries", {
      projectId: args.projectId,
      versionLabel,
      versionLabelNormalized,
      title,
      summary,
      body,
      type: args.type,
      status: "draft",
      publishedAt: undefined,
      createdAt: now,
      updatedAt: now,
      createdBy: user._id,
      updatedBy: user._id,
    });
  },
});

export const save = mutation({
  args: {
    entryId: v.id("changelogEntries"),
    versionLabel: v.string(),
    title: v.string(),
    summary: v.optional(v.string()),
    body: v.optional(v.string()),
    type: changelogTypeValidator,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const entry = await findEntryById(ctx, args.entryId);
    await assertProjectOwner(ctx, entry.projectId, user._id);
    await ensureProjectPublicChangelogSlug(ctx, entry.projectId);

    const versionLabel = args.versionLabel.trim();
    const versionLabelNormalized = normalizeVersionLabel(args.versionLabel);
    const title = args.title.trim();
    const summary = normalizeOptionalText(args.summary);
    const body = normalizeOptionalText(args.body);

    await assertUniqueVersionLabel(ctx, entry.projectId, versionLabel, entry._id);

    if (entry.status === "published") {
      validatePublishedFields({ versionLabel, title, summary, body });
    }

    await ctx.db.patch(entry._id, {
      versionLabel,
      versionLabelNormalized,
      title,
      summary,
      body,
      type: args.type,
      updatedAt: Date.now(),
      updatedBy: user._id,
    });

    return entry._id;
  },
});

export const publish = mutation({
  args: {
    entryId: v.id("changelogEntries"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const entry = await findEntryById(ctx, args.entryId);
    await assertProjectOwner(ctx, entry.projectId, user._id);
    await ensureProjectPublicChangelogSlug(ctx, entry.projectId);

    const versionLabel = entry.versionLabel.trim();
    const versionLabelNormalized = normalizeVersionLabel(entry.versionLabel);
    const title = entry.title.trim();
    const summary = normalizeOptionalText(entry.summary);
    const body = normalizeOptionalText(entry.body);

    validatePublishedFields({ versionLabel, title, summary, body });

    await assertUniqueVersionLabel(ctx, entry.projectId, versionLabel, entry._id);

    const publishedAt = entry.publishedAt ?? Date.now();
    await ctx.db.patch(entry._id, {
      versionLabel,
      versionLabelNormalized,
      title,
      summary,
      body,
      status: "published",
      publishedAt,
      updatedAt: Date.now(),
      updatedBy: user._id,
    });

    return entry._id;
  },
});

export const unpublish = mutation({
  args: {
    entryId: v.id("changelogEntries"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const entry = await findEntryById(ctx, args.entryId);
    await assertProjectOwner(ctx, entry.projectId, user._id);

    await ctx.db.patch(entry._id, {
      status: "draft",
      publishedAt: undefined,
      updatedAt: Date.now(),
      updatedBy: user._id,
    });

    return entry._id;
  },
});

export const deleteDraft = mutation({
  args: {
    entryId: v.id("changelogEntries"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const entry = await findEntryById(ctx, args.entryId);
    await assertProjectOwner(ctx, entry.projectId, user._id);

    if (entry.status !== "draft") {
      throw new Error("Only draft changelog entries can be deleted");
    }

    await ctx.db.delete(entry._id);
    return { deleted: true };
  },
});

export const getPublicBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    return await getPublicFeedBySlug(ctx, args.slug);
  },
});

export const getPublicBySlugInternal = internalQuery({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    return await getPublicFeedBySlug(ctx, args.slug);
  },
});

export const listPublishedByProjectInternal = internalQuery({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("changelogEntries")
      .withIndex("by_project_status", (q) => q.eq("projectId", args.projectId).eq("status", "published"))
      .collect();

    return entries.sort(sortEntriesByRecent).map((entry) => toPublicChangelogEntry(entry));
  },
});
