import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalQuery, mutation, query } from "./_generated/server";
import { assertProjectOwner, getCurrentUser } from "./lib/authorization";
import { getStatusById } from "./services/queries/status/getStatusById";

const DEFAULT_STATUS_ORDER = ["open", "planned", "under-review", "in-progress", "completed", "done", "closed"] as const;

function getDefaultStatusRank(name: string) {
  const index = DEFAULT_STATUS_ORDER.indexOf(name as (typeof DEFAULT_STATUS_ORDER)[number]);

  if (index === -1) {
    return Number.MAX_SAFE_INTEGER;
  }

  return index;
}

async function listStatusesByProjectId(ctx: QueryCtx, projectId: Id<"projects">) {
  const statuses = await ctx.db
    .query("requestStatuses")
    .filter((q) =>
      q.or(q.eq(q.field("project"), projectId), q.eq(q.field("type"), "default")),
    )
    .collect();

  const defaultStatuses = statuses
    .filter((status) => status.type === "default")
    .sort((a, b) => getDefaultStatusRank(a.name) - getDefaultStatusRank(b.name) || a.name.localeCompare(b.name));
  const customStatuses = statuses
    .filter((status) => status.type === "custom")
    .sort((a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER) || a._creationTime - b._creationTime);

  return [...defaultStatuses, ...customStatuses];
}

async function getRequestCountsByStatusId(ctx: QueryCtx, projectId: Id<"projects">) {
  const requests = await ctx.db
    .query("requests")
    .withIndex("by_project", (q) => q.eq("project", projectId))
    .collect();

  const counts = new Map<string, number>();

  for (const request of requests) {
    const key = request.status.toString();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

async function getCustomStatusesByProjectId(ctx: QueryCtx | MutationCtx, projectId: Id<"projects">) {
  return await ctx.db
    .query("requestStatuses")
    .withIndex("by_project", (q) => q.eq("project", projectId))
    .collect();
}

function slugifyStatusName(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function assertHexColor(color?: string) {
  if (!color) {
    return;
  }

  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    throw new Error("Color must be a 6-digit hex value");
  }
}

export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    return getStatusById(ctx, { id: args.id });
  },
});

export const getByProject = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertProjectOwner(ctx, args.id, user._id);

    return await listStatusesByProjectId(ctx, args.id);
  },
});

export const getManagementByProject = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertProjectOwner(ctx, args.id, user._id);

    const [statuses, counts] = await Promise.all([
      listStatusesByProjectId(ctx, args.id),
      getRequestCountsByStatusId(ctx, args.id),
    ]);

    return statuses.map((status) => ({
      ...status,
      requestCount: counts.get(status._id.toString()) ?? 0,
    }));
  },
});

export const getByProjectInternal = internalQuery({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    return await listStatusesByProjectId(ctx, args.id);
  },
});

export const create = mutation({
  args: {
    displayName: v.string(),
    description: v.optional(v.string()),
    project: v.id("projects"),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertProjectOwner(ctx, args.project, user._id);

    const displayName = args.displayName.trim();
    const name = slugifyStatusName(displayName);
    assertHexColor(args.color);

    const existingStatus = (await listStatusesByProjectId(ctx, args.project))
      .find((status) => status.name === name);

    if (displayName.length < 2 || !name) {
      throw new Error("Status name must contain at least 2 readable characters");
    }

    if (existingStatus) {
      throw new Error("A status with this name already exists in the project");
    }

    const customStatuses = await getCustomStatusesByProjectId(ctx, args.project);

    const nextPosition = customStatuses.reduce((max, status) => {
      return Math.max(max, status.position ?? -1);
    }, -1) + 1;

    await ctx.db.insert("requestStatuses", {
      ...args,
      name,
      displayName,
      type: "custom",
      position: nextPosition,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("requestStatuses"),
    displayName: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const status = await ctx.db.get(args.id);

    if (!status) {
      throw new Error("Status not found");
    }
    if (status.type === "default") {
      throw new Error("Default statuses cannot be updated");
    }
    if (!status.project) {
      throw new Error("Status is not linked to a project");
    }

    await assertProjectOwner(ctx, status.project, user._id);

    const displayName = args.displayName.trim();
    const name = slugifyStatusName(displayName);
    const description = args.description?.trim();
    assertHexColor(args.color);
    const duplicateStatus = (await listStatusesByProjectId(ctx, status.project))
      .find((item) => item.name === name && item._id !== args.id);

    if (displayName.length < 2 || !name) {
      throw new Error("Status name must contain at least 2 readable characters");
    }
    if (duplicateStatus) {
      throw new Error("A status with this name already exists in the project");
    }

    await ctx.db.patch(args.id, {
      displayName,
      name,
      description: description && description.length > 0 ? description : undefined,
      color: args.color,
    });
  },
});

export const reorderCustom = mutation({
  args: {
    projectId: v.id("projects"),
    ids: v.array(v.id("requestStatuses")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertProjectOwner(ctx, args.projectId, user._id);

    const customStatuses = (await getCustomStatusesByProjectId(ctx, args.projectId))
      .sort((a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER) || a._creationTime - b._creationTime);

    if (customStatuses.length !== args.ids.length) {
      throw new Error("Invalid status order payload");
    }

    const expectedIds = new Set(customStatuses.map((status) => status._id.toString()));
    const receivedIds = new Set(args.ids.map((id) => id.toString()));

    if (expectedIds.size !== receivedIds.size) {
      throw new Error("Invalid status order payload");
    }

    for (const id of expectedIds) {
      if (!receivedIds.has(id)) {
        throw new Error("Invalid status order payload");
      }
    }

    await Promise.all(args.ids.map((id, index) => ctx.db.patch(id, { position: index })));
  },
});

export const remove = mutation({
  args: {
    id: v.id("requestStatuses"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const status = await ctx.db.get(args.id);

    if (!status) {
      throw new Error("Status not found");
    }
    if (status.type === "default") {
      throw new Error("Default statuses cannot be removed");
    }
    if (!status.project) {
      throw new Error("Status is not linked to a project");
    }

    const projectId = status.project;

    await assertProjectOwner(ctx, projectId, user._id);

    const linkedRequest = await ctx.db
      .query("requests")
      .withIndex("by_project_status", (q) => q.eq("project", projectId).eq("status", args.id))
      .first();

    if (linkedRequest) {
      throw new Error("Statuses in use cannot be removed");
    }

    await ctx.db.delete(args.id);
  },
});

export const updateColor = mutation({
  args: {
    id: v.id("requestStatuses"),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const status = await ctx.db.get(args.id);

    if (!status) {
      throw new Error("Status not found");
    }

    if (status.type === "default") {
      throw new Error("Default statuses cannot be updated");
    }
    if (!status.project) {
      throw new Error("Status is not linked to a project");
    }

    const projectId = status.project;

    await assertProjectOwner(ctx, projectId, user._id);
    assertHexColor(args.color);

    try {
      await ctx.db.patch(args.id, { color: args.color });
    } catch (error) {
      console.error(error);
      throw error;
    }
  },
});
