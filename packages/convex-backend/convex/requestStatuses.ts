import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { assertProjectOwner, getCurrentUser } from "./lib/authorization";
import {
  assertCustomStatusEditable,
  assertCustomStatusRemovable,
  assertNoDuplicateStatusName,
  assertValidCustomOrderPayload,
  assertValidStatusColor,
  assertValidStatusName,
  getCanonicalStatusName,
  getManagementStatusesForProject,
  getOrderedStatusesForProject,
  getStarterProjectStatusNames,
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

function getLegacyReferencedStatusesForProject(projectStatuses: Doc<"requestStatuses">[], requests: Doc<"requests">[]) {
  const projectStatusIds = new Set(projectStatuses.map((status) => status._id.toString()));
  const referencedLegacyIds = new Set<string>();

  for (const request of requests) {
    if (!projectStatusIds.has(request.status.toString())) {
      referencedLegacyIds.add(request.status.toString());
    }
  }

  return referencedLegacyIds;
}

async function migrateProjectStatuses(ctx: MutationCtx, projectId: Id<"projects">) {
  const existingProjectStatuses = await ctx.db
    .query("requestStatuses")
    .withIndex("by_project", (q) => q.eq("project", projectId))
    .collect();
  const projectRequests = await ctx.db
    .query("requests")
    .withIndex("by_project", (q) => q.eq("project", projectId))
    .collect();

  const projectStatusByCanonicalName = new Map<string, Doc<"requestStatuses">>();
  const projectOwnedStatuses: Doc<"requestStatuses">[] = [...existingProjectStatuses];
  const starterNames = new Set(getStarterProjectStatusNames());
  const legacyStatusById = new Map<string, Doc<"requestStatuses">>();

  for (const status of existingProjectStatuses) {
    const canonicalName = getCanonicalStatusName(status.name);
    const current = projectStatusByCanonicalName.get(canonicalName);

    if (!current || (current.position ?? Number.MAX_SAFE_INTEGER) > (status.position ?? Number.MAX_SAFE_INTEGER)) {
      projectStatusByCanonicalName.set(canonicalName, status);
    }
  }

  const referencedLegacyIds = getLegacyReferencedStatusesForProject(existingProjectStatuses, projectRequests);
  const legacyStatusesInUse: Doc<"requestStatuses">[] = [];

  for (const statusId of referencedLegacyIds) {
    const legacyStatus = await ctx.db.get(statusId as Id<"requestStatuses">);
    if (!legacyStatus || legacyStatus.project) {
      continue;
    }

    legacyStatusById.set(statusId, legacyStatus);
    legacyStatusesInUse.push(legacyStatus);
  }

  legacyStatusesInUse.sort((a, b) => {
    return (
      getCanonicalStatusName(a.name).localeCompare(getCanonicalStatusName(b.name)) ||
      a._creationTime - b._creationTime ||
      a._id.toString().localeCompare(b._id.toString())
    );
  });

  const projectStatusIdByCanonicalName = new Map<string, Id<"requestStatuses">>();
  const includedStatusIds = new Set<string>();
  let statusesInserted = 0;
  let statusesReused = 0;
  let changed = false;

  for (const [position, starterStatus] of STARTER_PROJECT_STATUSES.entries()) {
    const canonicalName = starterStatus.name;
    const existingStatus = projectStatusByCanonicalName.get(canonicalName);

    if (existingStatus) {
      if (existingStatus.displayName !== starterStatus.displayName || existingStatus.type !== "default") {
        await ctx.db.patch(existingStatus._id, {
          displayName: starterStatus.displayName,
          type: "default",
        });
        changed = true;
      }

      projectStatusIdByCanonicalName.set(canonicalName, existingStatus._id);
      includedStatusIds.add(existingStatus._id.toString());
      statusesReused += 1;
      continue;
    }

    const statusId = await ctx.db.insert("requestStatuses", {
      name: starterStatus.name,
      displayName: starterStatus.displayName,
      project: projectId,
      type: "default",
      position,
    });
    const insertedStatus = await ctx.db.get(statusId);
    if (insertedStatus) {
      projectOwnedStatuses.push(insertedStatus);
      projectStatusByCanonicalName.set(canonicalName, insertedStatus);
    }
    projectStatusIdByCanonicalName.set(canonicalName, statusId);
    includedStatusIds.add(statusId.toString());
    statusesInserted += 1;
    changed = true;
  }

  for (const legacyStatus of legacyStatusesInUse) {
    const canonicalName = getCanonicalStatusName(legacyStatus.name);
    if (starterNames.has(canonicalName as (typeof STARTER_PROJECT_STATUSES)[number]["name"])) {
      const replacement = projectStatusIdByCanonicalName.get(canonicalName);
      if (replacement) {
        projectStatusIdByCanonicalName.set(getCanonicalStatusName(legacyStatus.name), replacement);
      }
      continue;
    }

    const existingStatus = projectStatusByCanonicalName.get(canonicalName);
    if (existingStatus) {
      projectStatusIdByCanonicalName.set(canonicalName, existingStatus._id);
      includedStatusIds.add(existingStatus._id.toString());
      continue;
    }

    const statusId = await ctx.db.insert("requestStatuses", {
      name: canonicalName,
      displayName: legacyStatus.displayName,
      description: legacyStatus.description,
      project: projectId,
      type: "custom",
      color: legacyStatus.color,
      position: undefined,
    });
    const insertedStatus = await ctx.db.get(statusId);
    if (insertedStatus) {
      projectOwnedStatuses.push(insertedStatus);
      projectStatusByCanonicalName.set(canonicalName, insertedStatus);
    }
    projectStatusIdByCanonicalName.set(canonicalName, statusId);
    includedStatusIds.add(statusId.toString());
    statusesInserted += 1;
    changed = true;
  }

  const requestPatches: Array<{ id: Id<"requests">; status: Id<"requestStatuses"> }> = [];

  for (const request of projectRequests) {
    if (includedStatusIds.has(request.status.toString())) {
      continue;
    }

    const legacyStatus = legacyStatusById.get(request.status.toString()) ?? await ctx.db.get(request.status);
    const canonicalName = legacyStatus ? getCanonicalStatusName(legacyStatus.name) : undefined;
    const replacementStatusId = canonicalName
      ? projectStatusIdByCanonicalName.get(canonicalName)
      : projectStatusIdByCanonicalName.get("open") ?? projectStatusIdByCanonicalName.get("done");

    if (replacementStatusId && replacementStatusId !== request.status) {
      requestPatches.push({ id: request._id, status: replacementStatusId });
    }
  }

  await Promise.all(requestPatches.map((patch) => ctx.db.patch(patch.id, { status: patch.status })));
  if (requestPatches.length > 0) {
    changed = true;
  }

  const workflowStatuses: Doc<"requestStatuses">[] = [];

  for (const starterStatus of STARTER_PROJECT_STATUSES) {
    const status = projectStatusByCanonicalName.get(starterStatus.name);
    if (status) {
      workflowStatuses.push(status);
    }
  }

  for (const legacyStatus of legacyStatusesInUse) {
    const status = projectStatusByCanonicalName.get(getCanonicalStatusName(legacyStatus.name));
    if (status && !starterNames.has(getCanonicalStatusName(status.name) as (typeof STARTER_PROJECT_STATUSES)[number]["name"])) {
      workflowStatuses.push(status);
    }
  }

  for (const status of projectOwnedStatuses) {
    if (status.project !== projectId || status.type !== "custom") {
      continue;
    }

    const canonicalName = getCanonicalStatusName(status.name);
    if (starterNames.has(canonicalName as (typeof STARTER_PROJECT_STATUSES)[number]["name"])) {
      continue;
    }

    if (!includedStatusIds.has(status._id.toString())) {
      workflowStatuses.push(status);
    }
  }

  const orderedUniqueStatuses: Doc<"requestStatuses">[] = [];
  const seen = new Set<string>();

  for (const status of workflowStatuses) {
    if (seen.has(status._id.toString())) {
      continue;
    }

    seen.add(status._id.toString());
    orderedUniqueStatuses.push(status);
  }

  let statusesReindexed = 0;

  for (const [index, status] of orderedUniqueStatuses.entries()) {
    const original = projectOwnedStatuses.find((item) => item._id === status._id);
    if (!original || original.position !== index) {
      statusesReindexed += 1;
      await ctx.db.patch(status._id, { position: index });
    }
  }
  if (statusesReindexed > 0) {
    changed = true;
  }

  return {
    projectId,
    statusesInserted,
    statusesReused,
    requestsPatched: requestPatches.length,
    statusesReindexed,
    changed,
  };
}

export const repairProjectDefaults = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertProjectOwner(ctx, args.projectId, user._id);

    return await migrateProjectStatuses(ctx, args.projectId);
  },
});

export const repairAllProjectDefaultsInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").collect();
    const summaries: Array<{
      projectId: Id<"projects">;
      statusesInserted: number;
      statusesReused: number;
      requestsPatched: number;
      statusesReindexed: number;
      changed: boolean;
    }> = [];

    for (const project of projects) {
      summaries.push(await migrateProjectStatuses(ctx, project._id));
    }

    return {
      projectsScanned: projects.length,
      projectsReindexed: summaries.filter((summary) => summary.changed).length,
      statusesInserted: summaries.reduce((total, summary) => total + summary.statusesInserted, 0),
      statusesReused: summaries.reduce((total, summary) => total + summary.statusesReused, 0),
      requestsPatched: summaries.reduce((total, summary) => total + summary.requestsPatched, 0),
    };
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
    await ctx.db.patch(args.id, { color: args.color });
  },
});
