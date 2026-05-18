import type { Doc, Id } from "../_generated/dataModel";

type RequestOverviewReadModelInput = {
  requests: Doc<"requests">[];
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

export function buildRequestOverviewReadModel({
  requests,
  projects,
  statuses,
  now = Date.now(),
}: RequestOverviewReadModelInput): RequestOverviewReadModel {
  const projectIds = new Set(projects.map((project) => project._id.toString()));
  const relevantRequests = requests.filter((request) => projectIds.has(request.project.toString()));
  const statusMap = new Map(
    statuses
      .filter((status) => !status.project || projectIds.has(status.project.toString()))
      .map((status) => [status._id.toString(), status]),
  );

  return {
    totalRequests: relevantRequests.length,
    statusBreakdown: buildStatusBreakdown(relevantRequests, statusMap),
    projectBreakdown: buildProjectBreakdown(relevantRequests, projects),
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

function buildStatusBreakdown(
  requests: Doc<"requests">[],
  statusMap: Map<string, Doc<"requestStatuses">>,
): RequestOverviewReadModel["statusBreakdown"] {
  const counts = new Map<string, RequestOverviewReadModel["statusBreakdown"][number]>();

  for (const request of requests) {
    const statusId = request.status.toString();
    const existing = counts.get(statusId);
    const statusDoc = statusMap.get(statusId);
    const name = statusDoc?.name ?? "unknown";
    const displayName = statusDoc?.displayName ?? "Unknown status";
    const color = statusDoc?.color ?? null;

    if (existing) {
      existing.count += 1;
      continue;
    }

    counts.set(statusId, {
      statusId: request.status,
      name,
      color,
      count: 1,
      displayName,
    });
  }

  return Array.from(counts.values()).sort((a, b) => {
    const countDiff = b.count - a.count;
    if (countDiff !== 0) return countDiff;
    return a.statusId.toString().localeCompare(b.statusId.toString());
  });
}

function buildProjectBreakdown(
  requests: Doc<"requests">[],
  projects: Doc<"projects">[],
): RequestOverviewReadModel["projectBreakdown"] {
  const counts = new Map<string, RequestOverviewReadModel["projectBreakdown"][number]>();
  const projectMap = new Map(projects.map((project) => [project._id.toString(), project.title]));

  for (const request of requests) {
    const projectId = request.project.toString();
    const title = projectMap.get(projectId) ?? "Unknown project";
    const existing = counts.get(projectId);

    if (existing) {
      existing.count += 1;
      continue;
    }

    counts.set(projectId, {
      projectId: request.project,
      title,
      count: 1,
    });
  }

  return Array.from(counts.values()).sort((a, b) => {
    const countDiff = b.count - a.count;
    if (countDiff !== 0) return countDiff;
    return a.projectId.toString().localeCompare(b.projectId.toString());
  });
}

function buildWeeklyTrend(
  requests: Doc<"requests">[],
  now: number,
): RequestOverviewReadModel["weeklyTrend"] {
  const weeksBack = 16;
  const weekMillis = 7 * 24 * 60 * 60 * 1000;

  const bucketStarts = Array.from({ length: weeksBack })
    .map((_, index) => startOfWeekUTC(now - index * weekMillis))
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
