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

function sortProjectStatuses(a: Doc<"requestStatuses">, b: Doc<"requestStatuses">) {
  return (
    (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER) ||
    a._creationTime - b._creationTime ||
    a._id.toString().localeCompare(b._id.toString())
  );
}

export function buildProjectStatusMigrationOrder(
  projectStatuses: Doc<"requestStatuses">[],
  legacyStatuses: Doc<"requestStatuses">[],
) {
  const starterNames = new Set(STARTER_PROJECT_STATUSES.map((status) => status.name));
  const projectStatusByCanonicalName = new Map<string, Doc<"requestStatuses">>();
  const projectStatusesById = new Set(projectStatuses.map((status) => status._id.toString()));
  const legacyStatusesByCanonicalName = new Map<string, Doc<"requestStatuses">>();
  const orderedStarterStatuses: Doc<"requestStatuses">[] = [];
  const orderedLegacyStatuses: Doc<"requestStatuses">[] = [];
  const insertedLegacyStatusIds = new Set<string>();

  for (const status of projectStatuses) {
    const canonicalName = getCanonicalStatusName(status.name);
    const current = projectStatusByCanonicalName.get(canonicalName);

    if (
      !current ||
      (current.position ?? Number.MAX_SAFE_INTEGER) > (status.position ?? Number.MAX_SAFE_INTEGER) ||
      ((current.position ?? Number.MAX_SAFE_INTEGER) === (status.position ?? Number.MAX_SAFE_INTEGER) &&
        current._creationTime > status._creationTime)
    ) {
      projectStatusByCanonicalName.set(canonicalName, status);
    }
  }

  for (const starterStatus of STARTER_PROJECT_STATUSES) {
    const existingStarter = projectStatusByCanonicalName.get(starterStatus.name);

    if (existingStarter) {
      orderedStarterStatuses.push(existingStarter);
    }
  }

  const orderedLegacySourceStatuses = [...legacyStatuses].sort((a, b) => {
    return (
      getCanonicalStatusName(a.name).localeCompare(getCanonicalStatusName(b.name)) ||
      a._creationTime - b._creationTime ||
      a._id.toString().localeCompare(b._id.toString())
    );
  });

  for (const legacyStatus of orderedLegacySourceStatuses) {
    const canonicalName = getCanonicalStatusName(legacyStatus.name);
    legacyStatusesByCanonicalName.set(canonicalName, legacyStatus);

    if (starterNames.has(canonicalName as (typeof STARTER_PROJECT_STATUSES)[number]["name"])) {
      continue;
    }

    const existingProjectStatus = projectStatusByCanonicalName.get(canonicalName);
    if (existingProjectStatus) {
      orderedLegacyStatuses.push(existingProjectStatus);
      continue;
    }

    const insertedLegacyStatus = {
      ...legacyStatus,
      name: canonicalName,
      project: legacyStatus.project,
    } as Doc<"requestStatuses">;

    orderedLegacyStatuses.push(insertedLegacyStatus);
    projectStatusByCanonicalName.set(canonicalName, insertedLegacyStatus);
    insertedLegacyStatusIds.add(insertedLegacyStatus._id.toString());
  }

  const remainingStatuses = [...projectStatuses]
    .filter((status) => {
      const canonicalName = getCanonicalStatusName(status.name);
      return !starterNames.has(canonicalName as (typeof STARTER_PROJECT_STATUSES)[number]["name"]) &&
        !orderedLegacyStatuses.some((item) => item._id === status._id);
    })
    .sort(sortProjectStatuses);

  return {
    orderedStatuses: [...orderedStarterStatuses, ...orderedLegacyStatuses, ...remainingStatuses],
    projectStatusByCanonicalName,
    legacyStatusesByCanonicalName,
    insertedLegacyStatusIds,
  };
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

  const referencedLegacyIds = getLegacyReferencedStatusesForProject(existingProjectStatuses, projectRequests);
  const legacyStatusesInUse: Doc<"requestStatuses">[] = [];

  for (const statusId of referencedLegacyIds) {
    const legacyStatus = await ctx.db.get(statusId as Id<"requestStatuses">);
    if (!legacyStatus || legacyStatus.project) {
      continue;
    }

    legacyStatusesInUse.push(legacyStatus);
  }

  const migrationPlan = buildProjectStatusMigrationOrder(existingProjectStatuses, legacyStatusesInUse);
  const projectStatusIdByCanonicalName = new Map<string, Id<"requestStatuses">>();
  const projectOwnedStatusIds = new Set(existingProjectStatuses.map((status) => status._id.toString()));
  let statusesInserted = 0;
  let statusesReused = 0;
  let changed = false;

  for (const [position, starterStatus] of STARTER_PROJECT_STATUSES.entries()) {
    const canonicalName = starterStatus.name;
    const existingStatus = migrationPlan.projectStatusByCanonicalName.get(canonicalName);

    if (existingStatus) {
      if (existingStatus.displayName !== starterStatus.displayName || existingStatus.type !== "default") {
        await ctx.db.patch(existingStatus._id, {
          displayName: starterStatus.displayName,
          type: "default",
        });
        changed = true;
      }

      projectStatusIdByCanonicalName.set(canonicalName, existingStatus._id);
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
      migrationPlan.projectStatusByCanonicalName.set(canonicalName, insertedStatus);
      projectOwnedStatusIds.add(insertedStatus._id.toString());
    }
    projectStatusIdByCanonicalName.set(canonicalName, statusId);
    statusesInserted += 1;
    changed = true;
  }

  for (const legacyStatus of legacyStatusesInUse) {
    const canonicalName = getCanonicalStatusName(legacyStatus.name);
    if (getStarterProjectStatusNames().includes(canonicalName as (typeof STARTER_PROJECT_STATUSES)[number]["name"])) {
      const replacement = projectStatusIdByCanonicalName.get(canonicalName);
      if (replacement) {
        projectStatusIdByCanonicalName.set(getCanonicalStatusName(legacyStatus.name), replacement);
      }
      continue;
    }

    const existingStatus = migrationPlan.projectStatusByCanonicalName.get(canonicalName);
    if (existingStatus) {
      projectStatusIdByCanonicalName.set(canonicalName, existingStatus._id);
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
      migrationPlan.projectStatusByCanonicalName.set(canonicalName, insertedStatus);
      projectOwnedStatusIds.add(insertedStatus._id.toString());
    }
    projectStatusIdByCanonicalName.set(canonicalName, statusId);
    statusesInserted += 1;
    changed = true;
  }

  const requestPatches: Array<{ id: Id<"requests">; status: Id<"requestStatuses"> }> = [];

  for (const request of projectRequests) {
    if (projectOwnedStatusIds.has(request.status.toString())) {
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

  const finalOrderedStatuses: Doc<"requestStatuses">[] = [];
  const seen = new Set<string>();

  for (const starterStatus of STARTER_PROJECT_STATUSES) {
    const statusId = projectStatusIdByCanonicalName.get(starterStatus.name);
    if (!statusId) {
      continue;
    }

    const status = existingProjectStatuses.find((item) => item._id === statusId) ?? (await ctx.db.get(statusId) ?? undefined);
    if (!status || seen.has(status._id.toString())) {
      continue;
    }

    seen.add(status._id.toString());
    finalOrderedStatuses.push(status);
  }

  for (const legacyStatus of legacyStatusesInUse) {
    const canonicalName = getCanonicalStatusName(legacyStatus.name);
    if (getStarterProjectStatusNames().includes(canonicalName as (typeof STARTER_PROJECT_STATUSES)[number]["name"])) {
      continue;
    }

    const statusId = projectStatusIdByCanonicalName.get(canonicalName);
    if (!statusId) {
      continue;
    }

    const status = existingProjectStatuses.find((item) => item._id === statusId) ?? (await ctx.db.get(statusId) ?? undefined);
    if (!status || seen.has(status._id.toString())) {
      continue;
    }

    seen.add(status._id.toString());
    finalOrderedStatuses.push(status);
  }

  const remainingStatuses = [...existingProjectStatuses]
    .sort(sortProjectStatuses)
    .filter((status) => !seen.has(status._id.toString()));

  finalOrderedStatuses.push(...remainingStatuses);

  let statusesReindexed = 0;

  for (const [index, status] of finalOrderedStatuses.entries()) {
    const original = existingProjectStatuses.find((item) => item._id === status._id);
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
