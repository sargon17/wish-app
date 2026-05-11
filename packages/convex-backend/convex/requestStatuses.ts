import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { internalQuery, mutation, query } from "./_generated/server";
import { assertProjectOwner, getCurrentUser } from "./lib/authorization";
import {
  assertCustomStatusEditable,
  assertCustomStatusRemovable,
  assertNoDuplicateStatusName,
  assertValidCustomOrderPayload,
  assertValidStatusColor,
  assertValidStatusName,
  getOrderedCustomStatusesForProject,
  getOrderedStatusesForProject,
  normalizeStatusDescription,
} from "./lib/requestStatusWorkflow";
import { getStatusById } from "./services/queries/status/getStatusById";

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

    return await getOrderedStatusesForProject(ctx, args.id);
  },
});

export const getManagementByProject = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertProjectOwner(ctx, args.id, user._id);

    const [statuses, counts] = await Promise.all([
      getOrderedStatusesForProject(ctx, args.id),
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
    return await getOrderedStatusesForProject(ctx, args.id);
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

    const { displayName, name } = assertValidStatusName(args.displayName);
    assertValidStatusColor(args.color);

    const statuses = await getOrderedStatusesForProject(ctx, args.project);
    assertNoDuplicateStatusName(statuses, name);
    const description = normalizeStatusDescription(args.description);

    const customStatuses = await getOrderedCustomStatusesForProject(ctx, args.project);
    const nextPosition = customStatuses.reduce((max, status) => {
      return Math.max(max, status.position ?? -1);
    }, -1) + 1;

    await ctx.db.insert("requestStatuses", {
      ...args,
      name,
      displayName,
      description,
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
    const status = assertCustomStatusEditable(await ctx.db.get(args.id));

    await assertProjectOwner(ctx, status.project, user._id);

    const { displayName, name } = assertValidStatusName(args.displayName);
    const description = normalizeStatusDescription(args.description);
    assertValidStatusColor(args.color);
    const statuses = await getOrderedStatusesForProject(ctx, status.project);
    assertNoDuplicateStatusName(statuses, name, args.id);

    await ctx.db.patch(args.id, {
      displayName,
      name,
      description,
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

    const customStatuses = await getOrderedCustomStatusesForProject(ctx, args.projectId);
    assertValidCustomOrderPayload(customStatuses, args.ids, args.projectId);

    await Promise.all(args.ids.map((id, index) => ctx.db.patch(id, { position: index })));
  },
});

export const remove = mutation({
  args: {
    id: v.id("requestStatuses"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const status = assertCustomStatusEditable(await ctx.db.get(args.id));
    const projectId = status.project;

    await assertProjectOwner(ctx, projectId, user._id);

    const linkedRequest = await ctx.db
      .query("requests")
      .withIndex("by_project_status", (q) => q.eq("project", projectId).eq("status", args.id))
      .first();

    assertCustomStatusRemovable(linkedRequest);

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
    const status = assertCustomStatusEditable(await ctx.db.get(args.id));
    const projectId = status.project;

    await assertProjectOwner(ctx, projectId, user._id);
    assertValidStatusColor(args.color);

    try {
      await ctx.db.patch(args.id, { color: args.color });
    } catch (error) {
      console.error(error);
      throw error;
    }
  },
});
