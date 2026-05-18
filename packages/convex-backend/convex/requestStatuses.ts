import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { assertProjectOwner, getCurrentUser } from "./lib/authorization";
import { STARTER_PROJECT_STATUSES } from "./lib/requestStatusStarterData";
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
  isStarterProjectStatusName,
  getStatusesWithAssignedWorkflowPositions,
  getNextWorkflowStatusPosition,
  normalizeStatusDescription,
} from "./lib/requestStatusWorkflow";
import { getStatusById } from "./services/queries/status/getStatusById";

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
  const legacyStatusesByCanonicalName = new Map<string, Doc<"requestStatuses">>();
  const orderedStarterStatuses: Doc<"requestStatuses">[] = [];

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
  }

  const remainingStatuses = [...projectStatuses]
    .filter((status) => {
      const canonicalName = getCanonicalStatusName(status.name);
      return !starterNames.has(canonicalName as (typeof STARTER_PROJECT_STATUSES)[number]["name"]);
    })
    .sort(sortProjectStatuses);

  return {
    orderedStatuses: [...orderedStarterStatuses, ...remainingStatuses],
    projectStatusByCanonicalName,
    legacyStatusesByCanonicalName,
  };
}

function sortLegacyStatusesForMigration(statuses: Doc<"requestStatuses">[]) {
  return [...statuses].sort((a, b) => {
    return (
      getCanonicalStatusName(a.name).localeCompare(getCanonicalStatusName(b.name)) ||
      a._creationTime - b._creationTime ||
      a._id.toString().localeCompare(b._id.toString())
    );
  });
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

export async function migrateProjectStatuses(ctx: MutationCtx, projectId: Id<"projects">) {
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

  const sortedLegacyStatusesInUse = sortLegacyStatusesForMigration(legacyStatusesInUse);
  const migrationPlan = buildProjectStatusMigrationOrder(existingProjectStatuses, sortedLegacyStatusesInUse);
  const projectStatusIdByCanonicalName = new Map<string, Id<"requestStatuses">>();
  const projectOwnedStatusIds = new Set(existingProjectStatuses.map((status) => status._id.toString()));
  const legacyStatusById = new Map(legacyStatusesInUse.map((status) => [status._id.toString(), status] as const));
  const orderedLegacyCanonicalNames: string[] = [];
  const duplicateStarterStatuses: Doc<"requestStatuses">[] = [];
  const exactStarterStatusByCanonicalName = new Map<string, Doc<"requestStatuses">>();
  let statusesInserted = 0;
  let statusesReused = 0;
  let changed = false;

  for (const starterStatus of STARTER_PROJECT_STATUSES) {
    const exactStarterStatus = existingProjectStatuses.find(
      (status) => status.name === starterStatus.name && status.type === "default",
    );

    if (exactStarterStatus) {
      exactStarterStatusByCanonicalName.set(starterStatus.name, exactStarterStatus);
    }
  }

  for (const [position, starterStatus] of STARTER_PROJECT_STATUSES.entries()) {
    const canonicalName = starterStatus.name;
    const existingStatus = exactStarterStatusByCanonicalName.get(canonicalName);

    if (existingStatus) {
      if (
        existingStatus.displayName !== starterStatus.displayName ||
        existingStatus.type !== "default" ||
        existingStatus.name !== starterStatus.name
      ) {
        await ctx.db.patch(existingStatus._id, {
          name: starterStatus.name,
          displayName: starterStatus.displayName,
          type: "default",
        });
        migrationPlan.projectStatusByCanonicalName.set(canonicalName, {
          ...existingStatus,
          name: starterStatus.name,
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

  const selectedStarterStatusIds = new Map(
    STARTER_PROJECT_STATUSES.map((starterStatus) => {
      const statusId = projectStatusIdByCanonicalName.get(starterStatus.name);

      return [starterStatus.name, statusId?.toString()] as const;
    }),
  );

  for (const status of existingProjectStatuses) {
    const canonicalName = getCanonicalStatusName(status.name);

    if (!isStarterProjectStatusName(canonicalName)) {
      continue;
    }

    const selectedStarterStatusId = selectedStarterStatusIds.get(canonicalName);
    if (!selectedStarterStatusId || selectedStarterStatusId === status._id.toString()) {
      continue;
    }

    duplicateStarterStatuses.push(status);
    projectOwnedStatusIds.delete(status._id.toString());
  }

  for (const legacyStatus of sortedLegacyStatusesInUse) {
    const canonicalName = getCanonicalStatusName(legacyStatus.name);
    if (isStarterProjectStatusName(canonicalName)) {
      const replacement = projectStatusIdByCanonicalName.get(canonicalName);
      if (replacement) {
        projectStatusIdByCanonicalName.set(getCanonicalStatusName(legacyStatus.name), replacement);
      }
      continue;
    }

    const existingStatus = migrationPlan.projectStatusByCanonicalName.get(canonicalName);
    if (existingStatus) {
      projectStatusIdByCanonicalName.set(canonicalName, existingStatus._id);
      orderedLegacyCanonicalNames.push(canonicalName);
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
    orderedLegacyCanonicalNames.push(canonicalName);
    statusesInserted += 1;
    changed = true;
  }

  const requestPatches: Array<{ id: Id<"requests">; status: Id<"requestStatuses"> }> = [];

  for (const request of projectRequests) {
    if (projectOwnedStatusIds.has(request.status.toString())) {
      continue;
    }

    const duplicateStarter = duplicateStarterStatuses.find((status) => status._id.toString() === request.status.toString());
    if (duplicateStarter) {
      const canonicalName = getCanonicalStatusName(duplicateStarter.name);
      const replacementStatusId = projectStatusIdByCanonicalName.get(canonicalName);
      if (replacementStatusId && replacementStatusId !== request.status) {
        requestPatches.push({ id: request._id, status: replacementStatusId });
      }
      continue;
    }

    const legacyStatus = legacyStatusById.get(request.status.toString()) ?? await ctx.db.get(request.status);
    const canonicalName =
      legacyStatus && !legacyStatus.project ? getCanonicalStatusName(legacyStatus.name) : undefined;
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

  for (const canonicalName of orderedLegacyCanonicalNames) {
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

  for (const duplicateStarterStatus of duplicateStarterStatuses.sort(sortProjectStatuses)) {
    const canonicalName = getCanonicalStatusName(duplicateStarterStatus.name);
    const selectedStarterStatusId = projectStatusIdByCanonicalName.get(canonicalName);
    const selectedStarterStatus = selectedStarterStatusId
      ? (existingProjectStatuses.find((item) => item._id === selectedStarterStatusId) ?? (await ctx.db.get(selectedStarterStatusId) ?? undefined))
      : undefined;

    if (!selectedStarterStatus || duplicateStarterStatus._id === selectedStarterStatus._id) {
      continue;
    }

    const suffix = duplicateStarterStatus._id.toString().slice(-6);
    let renamedName = `${canonicalName}-legacy-${suffix}`;
    let attempt = 1;

    while (
      finalOrderedStatuses.some((status) => status.name === renamedName) ||
      existingProjectStatuses.some((status) => status._id !== duplicateStarterStatus._id && status.name === renamedName)
    ) {
      renamedName = `${canonicalName}-legacy-${suffix}-${attempt}`;
      attempt += 1;
    }

    if (duplicateStarterStatus.name !== renamedName || duplicateStarterStatus.type !== "custom") {
      await ctx.db.patch(duplicateStarterStatus._id, {
        name: renamedName,
        type: "custom",
      });
      duplicateStarterStatus.name = renamedName;
      duplicateStarterStatus.type = "custom";
      changed = true;
    }

    finalOrderedStatuses.push(duplicateStarterStatus);
    seen.add(duplicateStarterStatus._id.toString());
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

    const statusesReindexed = summaries.reduce((total, summary) => total + summary.statusesReindexed, 0);
    const changed = summaries.some((summary) => summary.changed);

    return {
      projectsScanned: projects.length,
      projectsChanged: summaries.filter((summary) => summary.changed).length,
      statusesInserted: summaries.reduce((total, summary) => total + summary.statusesInserted, 0),
      statusesReused: summaries.reduce((total, summary) => total + summary.statusesReused, 0),
      requestsPatched: summaries.reduce((total, summary) => total + summary.requestsPatched, 0),
      statusesReindexed,
      changed,
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
