import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { internalQuery, mutation, query } from "./_generated/server";
import { assertProjectOwner, getCurrentUser } from "./lib/authorization";
import {
  assertProjectCanRemoveStatus,
  assertProjectStatusEditable,
  assertNoDuplicateStatusName,
  assertValidCustomOrderPayload,
  assertValidStatusColor,
  assertValidStatusName,
  assertReplacementStatusCanBeUsed,
  getManagementStatusesForProject,
  getOrderedStatusesForProject,
  getStatusesWithAssignedWorkflowPositions,
  getNextWorkflowStatusPosition,
  normalizeStatusDescription,
} from "./lib/requestStatusWorkflow";
import { getStatusById } from "./services/queries/status/getStatusById";

export const STARTER_PROJECT_STATUSES = [
  { name: "open", displayName: "Open" },
  { name: "under-review", displayName: "Under Review" },
  { name: "planned", displayName: "Planned" },
  { name: "in-progress", displayName: "In Progress" },
  { name: "done", displayName: "Done" },
] as const;
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

    return await getManagementStatusesForProject(ctx, args.id);
  },
});

export const getByProjectInternal = internalQuery({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    return await getOrderedStatusesForProject(ctx, args.id);
  },
});

export const repairProjectDefaults = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertProjectOwner(ctx, args.projectId, user._id);

    const existingProjectStatuses = await ctx.db
      .query("requestStatuses")
      .withIndex("by_project", (q) => q.eq("project", args.projectId))
      .collect();
    const projectStatusIdByName = new Map(existingProjectStatuses.map((status) => [status.name, status._id]));
    const existingProjectStatusByName = new Map(existingProjectStatuses.map((status) => [status.name, status]));

    for (const [position, starterStatus] of STARTER_PROJECT_STATUSES.entries()) {
      const existingStatus = existingProjectStatusByName.get(starterStatus.name);

      if (existingStatus) {
        await ctx.db.patch(existingStatus._id, {
          displayName: starterStatus.displayName,
          type: "default",
          position: existingStatus.position ?? position,
        });
        continue;
      }

      const statusId = await ctx.db.insert("requestStatuses", {
        name: starterStatus.name,
        displayName: starterStatus.displayName,
        project: args.projectId,
        type: "default",
        position,
      });
      projectStatusIdByName.set(starterStatus.name, statusId);
    }

    const projectRequests = await ctx.db
      .query("requests")
      .withIndex("by_project", (q) => q.eq("project", args.projectId))
      .collect();
    const projectStatusIds = new Set(Array.from(projectStatusIdByName.values()).map((statusId) => statusId.toString()));
    const fallbackStatusId = projectStatusIdByName.get("open") ?? Array.from(projectStatusIdByName.values())[0];

    for (const request of projectRequests) {
      if (projectStatusIds.has(request.status.toString())) {
        continue;
      }

      const legacyStatus = await ctx.db.get(request.status);
      const legacyStatusName = legacyStatus?.name.replaceAll("_", "-");
      const replacementStatusId = legacyStatusName
        ? projectStatusIdByName.get(legacyStatusName) ?? projectStatusIdByName.get(legacyStatusName === "completed" ? "done" : legacyStatusName)
        : fallbackStatusId;

      if (replacementStatusId) {
        await ctx.db.patch(request._id, { status: replacementStatusId });
      }
    }
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
    const normalizedStatuses = getStatusesWithAssignedWorkflowPositions(statuses);
    assertNoDuplicateStatusName(statuses, name);
    const description = normalizeStatusDescription(args.description);
    const nextPosition = getNextWorkflowStatusPosition(normalizedStatuses);

    if (normalizedStatuses !== statuses) {
      const originalPositions = new Map(statuses.map((status) => [status._id.toString(), status.position]));

      await Promise.all(
        normalizedStatuses.map((status) => {
          if (status.position === originalPositions.get(status._id.toString())) {
            return Promise.resolve();
          }

          return ctx.db.patch(status._id, { position: status.position });
        }),
      );
    }

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
    const status = assertProjectStatusEditable(await ctx.db.get(args.id));

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

export const reorder = mutation({
  args: {
    projectId: v.id("projects"),
    ids: v.array(v.id("requestStatuses")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertProjectOwner(ctx, args.projectId, user._id);

    const statuses = await getOrderedStatusesForProject(ctx, args.projectId);
    assertValidCustomOrderPayload(statuses, args.ids, args.projectId);

    await Promise.all(args.ids.map((id, index) => ctx.db.patch(id, { position: index })));
  },
});

export const remove = mutation({
  args: {
    statusId: v.id("requestStatuses"),
    replacementStatusId: v.optional(v.id("requestStatuses")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const status = assertProjectStatusEditable(await ctx.db.get(args.statusId));
    const projectId = status.project;

    await assertProjectOwner(ctx, projectId, user._id);
    const statuses = await getOrderedStatusesForProject(ctx, projectId);
    assertProjectCanRemoveStatus(statuses);

    const linkedRequests = await ctx.db
      .query("requests")
      .withIndex("by_project_status", (q) => q.eq("project", projectId).eq("status", args.statusId))
      .collect();

    if (linkedRequests.length > 0) {
      if (!args.replacementStatusId) {
        throw new Error("Choose a replacement status to delete this status");
      }

      const replacementStatus = assertProjectStatusEditable(await ctx.db.get(args.replacementStatusId));
      assertReplacementStatusCanBeUsed(replacementStatus, status, projectId);

      await Promise.all(linkedRequests.map((request) => ctx.db.patch(request._id, { status: replacementStatus._id })));
    }

    await ctx.db.delete(args.statusId);
  },
});

export const updateColor = mutation({
  args: {
    id: v.id("requestStatuses"),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const status = assertProjectStatusEditable(await ctx.db.get(args.id));
    const projectId = status.project;

    await assertProjectOwner(ctx, projectId, user._id);
    assertValidStatusColor(args.color);
    await ctx.db.patch(args.id, { color: args.color });
  },
});
