import type { Doc, Id } from "./_generated/dataModel";
import { query } from "./_generated/server";

export const requestOverview = query({
  args: {},
  handler: async (ctx) => {
    try {
      const identity = await ctx.auth.getUserIdentity();

      if (identity === null) {
        throw new Error("Not authenticated");
      }

      const user = await ctx.db
        .query("users")
        .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
        .unique();

      if (!user) {
        throw new Error("Unauthenticated call to query");
      }

      const projects = await ctx.db
        .query("projects")
        .filter((q) => q.eq(q.field("user"), user._id))
        .collect();

      const projectIds = new Set(projects.map((project) => project._id.toString()));

      if (projectIds.size === 0) {
        return {
          totalRequests: 0,
          statusBreakdown: [],
          projectBreakdown: [],
          weeklyTrend: [],
          lastUpdated: Date.now(),
        };
      }

      const requests = await ctx.db.query("requests").collect();
      const relevantRequests = requests.filter((request) =>
        projectIds.has(request.project.toString()),
      );

      const statusDocs = await ctx.db.query("requestStatuses").collect();
      const statusMap = new Map(
        statusDocs
          .filter((status) => !status.project || projectIds.has(status.project.toString()))
          .map((status) => [status._id.toString(), status]),
      );

      const statusBreakdown = buildStatusBreakdown(relevantRequests, statusMap);
      const projectBreakdown = buildProjectBreakdown(relevantRequests, projects);
      const weeklyTrend = buildWeeklyTrend(relevantRequests);

      return {
        totalRequests: relevantRequests.length,
        statusBreakdown,
        projectBreakdown,
        weeklyTrend,
        lastUpdated: Date.now(),
      };
    } catch (error) {
      console.error(error);
      throw new Error("Failed to load request stats");
    }
  },
});

function buildStatusBreakdown(
  requests: Doc<"requests">[],
  statusMap: Map<string, Doc<"requestStatuses">>,
): Array<{
  statusId: Id<"requestStatuses">;
  name: string;
  count: number;
  color?: string | null;
  displayName?: string | null;
}> {
  const counts = new Map<
    string,
    {
      statusId: Id<"requestStatuses">;
      name: string;
      count: number;
      color?: string | null;
      displayName?: string | null;
    }
  >();

  for (const request of requests) {
    const statusId = request.status.toString();
    const existing = counts.get(statusId);
    const statusDoc = statusMap.get(statusId);
    const name = statusDoc?.name ?? "unknown";
    const displayName = statusDoc?.displayName ?? "Unknown status";
    const color = statusDoc?.color ?? null;

    if (existing) {
      existing.count += 1;
    } else {
      counts.set(statusId, {
        statusId: request.status,
        name,
        color,
        count: 1,
        displayName,
      });
    }
  }

  return Array.from(counts.values()).sort((a, b) => b.count - a.count);
}

function buildProjectBreakdown(
  requests: Doc<"requests">[],
  projects: Doc<"projects">[],
): Array<{
  projectId: Id<"projects">;
  title: string;
  count: number;
}> {
  const counts = new Map<
    string,
    {
      projectId: Id<"projects">;
      title: string;
      count: number;
    }
  >();
  const projectMap = new Map(projects.map((project) => [project._id.toString(), project.title]));

  for (const request of requests) {
    const projectId = request.project.toString();
    const title = projectMap.get(projectId) ?? "Unknown project";
    const existing = counts.get(projectId);

    if (existing) {
      existing.count += 1;
    } else {
      counts.set(projectId, {
        projectId: request.project,
        title,
        count: 1,
      });
    }
  }

  return Array.from(counts.values()).sort((a, b) => b.count - a.count);
}

function buildWeeklyTrend(
  requests: Doc<"requests">[],
): Array<{ weekStart: number; label: string; count: number }> {
  const now = Date.now();
  const weeksBack = 16;
  const weekMillis = 7 * 24 * 60 * 60 * 1000;

  const bucketStarts = Array.from({ length: weeksBack })
    .map((_, index) => startOfWeekUTC(now - index * weekMillis))
    .reverse();

  const counts = new Map<number, { weekStart: number; label: string; count: number }>(
    bucketStarts.map((weekStart) => [
      weekStart,
      { weekStart, label: formatWeekLabel(weekStart), count: 0 },
    ]),
  );

  for (const request of requests) {
    const bucket = startOfWeekUTC(request._creationTime);
    if (counts.has(bucket)) {
      const entry = counts.get(bucket);
      if (entry) entry.count += 1;
    }
  }

  return Array.from(counts.values());
}

function startOfWeekUTC(timestamp: number): number {
  const date = new Date(timestamp);
  const utcDay = date.getUTCDay();
  const distanceToMonday = utcDay === 0 ? 6 : utcDay - 1;
  date.setUTCDate(date.getUTCDate() - distanceToMonday);
  date.setUTCHours(0, 0, 0, 0);
  return date.getTime();
}

function formatWeekLabel(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
