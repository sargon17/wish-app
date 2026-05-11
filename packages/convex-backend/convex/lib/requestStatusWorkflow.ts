import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export const DEFAULT_STATUS_ORDER = ["open", "planned", "under-review", "in-progress", "completed", "done", "closed"] as const;

export function getDefaultStatusRank(name: string) {
  const index = DEFAULT_STATUS_ORDER.indexOf(name as (typeof DEFAULT_STATUS_ORDER)[number]);

  if (index === -1) {
    return Number.MAX_SAFE_INTEGER;
  }

  return index;
}

export function sortDefaultStatuses(a: Doc<"requestStatuses">, b: Doc<"requestStatuses">) {
  return getDefaultStatusRank(a.name) - getDefaultStatusRank(b.name) || a.name.localeCompare(b.name);
}

function sortProjectOwnedStatuses(a: Doc<"requestStatuses">, b: Doc<"requestStatuses">) {
  return (
    (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER) ||
    a._creationTime - b._creationTime ||
    a._id.toString().localeCompare(b._id.toString())
  );
}

export function normalizeStatusDisplayName(label: string) {
  return label.trim().replace(/\s+/g, " ");
}

export function normalizeStatusDescription(description?: string) {
  const trimmed = description?.trim();

  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

export function slugifyStatusName(label: string) {
  return normalizeStatusDisplayName(label)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function assertValidStatusName(displayName: string): { displayName: string; name: string } {
  const normalized = normalizeStatusDisplayName(displayName);
  const slug = slugifyStatusName(normalized);

  if (normalized.length < 2 || !slug) {
    throw new Error("Status name must contain at least 2 readable characters");
  }

  return { displayName: normalized, name: slug };
}

export function assertValidStatusColor(color?: string) {
  if (color === undefined) {
    return;
  }

  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    throw new Error("Color must be a 6-digit hex value");
  }
}

export function assertCustomStatusEditable(
  status: Doc<"requestStatuses"> | null | undefined,
): Doc<"requestStatuses"> & { project: Id<"projects"> } {
  if (!status) {
    throw new Error("Status not found");
  }

  if (status.type === "default") {
    throw new Error("Default statuses cannot be updated");
  }

  if (!status.project) {
    throw new Error("Status is not linked to a project");
  }

  return status as Doc<"requestStatuses"> & { project: Id<"projects"> };
}

export function assertCustomStatusRemovable(linkedRequest: Doc<"requests"> | null | undefined) {
  if (linkedRequest) {
    throw new Error("Statuses in use cannot be removed");
  }
}

export async function assertStatusBelongsToProject(
  ctx: QueryCtx | MutationCtx,
  statusId: Id<"requestStatuses">,
  projectId: Id<"projects">,
) {
  const status = await ctx.db.get(statusId);

  if (!status) {
    throw new Error("Status not found");
  }

  if (status.project !== projectId) {
    throw new Error("Status does not belong to project");
  }

  return status;
}

function sortByCustomWorkflowPosition(a: Doc<"requestStatuses">, b: Doc<"requestStatuses">) {
  return (
    (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER) ||
    a._creationTime - b._creationTime ||
    a._id.toString().localeCompare(b._id.toString())
  );
}

export function getNextCustomStatusPosition(statuses: Doc<"requestStatuses">[]) {
  return statuses.reduce((max, status) => {
    return Math.max(max, status.position ?? -1);
  }, -1) + 1;
}

async function getRequestCountsByStatusId(ctx: QueryCtx | MutationCtx, projectId: Id<"projects">) {
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

export async function getManagementStatusesForProject(ctx: QueryCtx | MutationCtx, projectId: Id<"projects">) {
  const [statuses, counts] = await Promise.all([
    getOrderedStatusesForProject(ctx, projectId),
    getRequestCountsByStatusId(ctx, projectId),
  ]);

  return statuses.map((status) => ({
    ...status,
    requestCount: counts.get(status._id.toString()) ?? 0,
  }));
}

export async function getOrderedCustomStatusesForProject(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">,
  statuses?: Doc<"requestStatuses">[],
): Promise<Doc<"requestStatuses">[]> {
  const projectStatuses =
    statuses ??
    (await ctx.db
      .query("requestStatuses")
      .withIndex("by_project", (q) => q.eq("project", projectId))
      .collect());

  return projectStatuses.filter((status) => status.type === "custom").sort(sortByCustomWorkflowPosition);
}

export async function getOrderedStatusesForProject(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">,
): Promise<Doc<"requestStatuses">[]> {
  const projectStatuses = await ctx.db
    .query("requestStatuses")
    .withIndex("by_project", (q) => q.eq("project", projectId))
    .collect();

  return projectStatuses.sort(sortProjectOwnedStatuses);
}

export function assertNoDuplicateStatusName(
  statuses: Doc<"requestStatuses">[],
  name: string,
  currentStatusId?: Id<"requestStatuses">,
) {
  const duplicate = statuses.find((status) => status.name === name && status._id !== currentStatusId);

  if (duplicate) {
    throw new Error("A status with this name already exists in the project");
  }
}

export function assertValidCustomOrderPayload(
  statuses: Doc<"requestStatuses">[],
  ids: Id<"requestStatuses">[],
  projectId: Id<"projects">,
) {
  if (statuses.length !== ids.length) {
    throw new Error("Invalid status order payload");
  }

  const expectedIds = new Set(statuses.map((status) => status._id.toString()));
  const receivedIds = new Set<string>();

  for (const id of ids) {
    const status = statuses.find((item) => item._id === id);

    if (!status || status.type !== "custom" || status.project !== projectId) {
      throw new Error("Invalid status order payload");
    }

    const key = id.toString();
    if (receivedIds.has(key)) {
      throw new Error("Invalid status order payload");
    }
    receivedIds.add(key);
  }

  if (expectedIds.size !== receivedIds.size) {
    throw new Error("Invalid status order payload");
  }

  for (const id of expectedIds) {
    if (!receivedIds.has(id)) {
      throw new Error("Invalid status order payload");
    }
  }
}
