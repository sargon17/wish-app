import type { Doc, Id } from "../_generated/dataModel";
import { getRequestKind } from "./requestKind";

type RequestOverviewReadModelInput = {
  requests: Doc<"requests">[];
  ownedProjectIds: Id<"projects">[];
  projects: Doc<"projects">[];
  statuses: Doc<"requestStatuses">[];
  now?: number;
};

type RequestOverviewReadModel = {
  totalRequests: number;
  statusBreakdown: Array<{
    statusId: Id<"requestStatuses">;
    name: string;
    count: number;
    color?: string | null;
    displayName?: string | null;
  }>;
  projectBreakdown: Array<{
    projectId: Id<"projects">;
    title: string;
    count: number;
  }>;
  weeklyTrend: Array<{ weekStart: number; label: string; count: number }>;
  lastUpdated: number;
};

const UNKNOWN_STATUS_NAME = "unknown";
const UNKNOWN_STATUS_LABEL = "Unknown status";
const UNKNOWN_PROJECT_LABEL = "Unknown project";
const WEEKS_IN_TREND = 16;
const WEEK_MILLIS = 7 * 24 * 60 * 60 * 1000;

export function buildRequestOverviewReadModel({
  requests,
  ownedProjectIds,
  projects,
  statuses,
  now = Date.now(),
}: RequestOverviewReadModelInput): RequestOverviewReadModel {
  const ownedProjectIdSet = new Set(ownedProjectIds.map((projectId) => projectId.toString()));
  const relevantRequests = filterOwnedRequests(requests, ownedProjectIdSet);
  const statusLookup = buildStatusLookup(statuses, ownedProjectIdSet);
  const projectLookup = buildProjectLookup(projects);

  return {
    totalRequests: relevantRequests.length,
    statusBreakdown: buildStatusBreakdown(relevantRequests, statusLookup),
    projectBreakdown: buildProjectBreakdown(relevantRequests, projectLookup),
    weeklyTrend: buildWeeklyTrend(relevantRequests, now),
    lastUpdated: now,
  };
}

export function startOfWeekUTC(timestamp: number): number {
  const date = new Date(timestamp);
  const utcDay = date.getUTCDay();
  const distanceToMonday = utcDay === 0 ? 6 : utcDay - 1;
  date.setUTCDate(date.getUTCDate() - distanceToMonday);
  date.setUTCHours(0, 0, 0, 0);
  return date.getTime();
}

export function formatWeekLabel(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp));
}

function filterOwnedRequests(requests: Doc<"requests">[], ownedProjectIds: Set<string>) {
  return requests.filter(
    (request) => ownedProjectIds.has(request.project.toString()) && getRequestKind(request) === "request",
  );
}

function buildStatusLookup(statuses: Doc<"requestStatuses">[], ownedProjectIds: Set<string>) {
  return new Map(
    statuses
      .filter((status) => !status.project || ownedProjectIds.has(status.project.toString()))
      .map((status) => [status._id.toString(), status]),
  );
}

function buildProjectLookup(projects: Doc<"projects">[]) {
  return new Map(projects.map((project) => [project._id.toString(), project.title]));
}

function buildStatusBreakdown(
  requests: Doc<"requests">[],
  statusMap: Map<string, Doc<"requestStatuses">>,
): RequestOverviewReadModel["statusBreakdown"] {
  const counts = new Map<
    string,
    {
      statusId: Id<"requestStatuses">;
      name: string;
      count: number;
      color?: string | null;
      displayName?: string | null;
      firstSeen: number;
    }
  >();

  for (const [index, request] of requests.entries()) {
    const statusId = request.status.toString();
    const existing = counts.get(statusId);
    const statusDoc = statusMap.get(statusId);
    const name = statusDoc?.name ?? UNKNOWN_STATUS_NAME;
    const displayName = statusDoc?.displayName ?? UNKNOWN_STATUS_LABEL;
    const color = statusDoc?.color ?? null;

    if (existing) {
      existing.count += 1;
      existing.firstSeen = Math.min(existing.firstSeen, index);
      continue;
    }

    counts.set(statusId, {
      statusId: request.status,
      name,
      color,
      count: 1,
      displayName,
      firstSeen: index,
    });
  }

  return Array.from(counts.values())
    .sort((a, b) => {
      const countDiff = b.count - a.count;
      if (countDiff !== 0) return countDiff;
      return a.firstSeen - b.firstSeen;
    })
    .map(({ firstSeen: _firstSeen, ...status }) => status);
}

function buildProjectBreakdown(
  requests: Doc<"requests">[],
  projectLookup: Map<string, string>,
): RequestOverviewReadModel["projectBreakdown"] {
  const counts = new Map<
    string,
    {
      projectId: Id<"projects">;
      title: string;
      count: number;
      firstSeen: number;
    }
  >();

  for (const [index, request] of requests.entries()) {
    const projectId = request.project.toString();
    const title = projectLookup.get(projectId) ?? UNKNOWN_PROJECT_LABEL;
    const existing = counts.get(projectId);

    if (existing) {
      existing.count += 1;
      existing.firstSeen = Math.min(existing.firstSeen, index);
      continue;
    }

    counts.set(projectId, {
      projectId: request.project,
      title,
      count: 1,
      firstSeen: index,
    });
  }

  return Array.from(counts.values())
    .sort((a, b) => {
      const countDiff = b.count - a.count;
      if (countDiff !== 0) return countDiff;
      return a.firstSeen - b.firstSeen;
    })
    .map(({ firstSeen: _firstSeen, ...project }) => project);
}

function buildWeeklyTrend(
  requests: Doc<"requests">[],
  now: number,
): RequestOverviewReadModel["weeklyTrend"] {
  const bucketStarts = Array.from({ length: WEEKS_IN_TREND })
    .map((_, index) => startOfWeekUTC(now - index * WEEK_MILLIS))
    .reverse();

  const counts = new Map<number, RequestOverviewReadModel["weeklyTrend"][number]>(
    bucketStarts.map((weekStart) => [weekStart, { weekStart, label: formatWeekLabel(weekStart), count: 0 }]),
  );

  for (const request of requests) {
    const bucket = startOfWeekUTC(request._creationTime);
    const entry = counts.get(bucket);
    if (entry) {
      entry.count += 1;
    }
  }

  return Array.from(counts.values());
}
