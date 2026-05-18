import { describe, it } from "node:test";
import { deepStrictEqual, equal, ok } from "node:assert/strict";

import type { Doc, Id } from "@wish/convex-backend/data-model";

import {
  buildRequestOverviewReadModel,
  formatWeekLabel,
  startOfWeekUTC,
} from "../../../../packages/convex-backend/convex/lib/requestOverviewReadModel";

const project1 = "project-1" as Id<"projects">;
const project2 = "project-2" as Id<"projects">;
const otherProject = "project-foreign" as Id<"projects">;
const statusOpen = "status-open" as Id<"requestStatuses">;
const statusClosed = "status-closed" as Id<"requestStatuses">;
const statusQueued = "status-queued" as Id<"requestStatuses">;
const statusUnknown = "status-unknown" as Id<"requestStatuses">;

describe("requestOverviewReadModel", () => {
  it("returns empty breakdowns for empty input", () => {
    const overview = buildRequestOverviewReadModel({
      requests: [],
      ownedProjectIds: [],
      projects: [],
      statuses: [],
      now: 0,
    });

    deepStrictEqual(overview, {
      totalRequests: 0,
      statusBreakdown: [],
      projectBreakdown: [],
      weeklyTrend: overview.weeklyTrend,
      lastUpdated: 0,
    });
    equal(overview.weeklyTrend.length, 16);
    ok(overview.weeklyTrend.every((bucket) => bucket.count === 0));
  });

  it("returns empty breakdowns when the user has no owned projects", () => {
    const overview = buildRequestOverviewReadModel({
      requests: [],
      ownedProjectIds: [project1],
      projects: [projectDoc(project1, "Alpha")],
      statuses: [statusDoc(statusOpen, "open", "Open", project1)],
      now: 1_700_000_000_000,
    });

    deepStrictEqual(overview, {
      totalRequests: 0,
      statusBreakdown: [],
      projectBreakdown: [],
      weeklyTrend: overview.weeklyTrend,
      lastUpdated: 1_700_000_000_000,
    });
  });

  it("returns empty breakdowns when the user has no requests", () => {
    const overview = buildRequestOverviewReadModel({
      requests: [],
      ownedProjectIds: [project1],
      projects: [projectDoc(project1, "Alpha")],
      statuses: [
        statusDoc(statusOpen, "open", "Open", project1),
        statusDoc(statusClosed, "closed", "Closed", undefined),
      ],
      now: 1_700_000_000_000,
    });

    deepStrictEqual(overview, {
      totalRequests: 0,
      statusBreakdown: [],
      projectBreakdown: [],
      weeklyTrend: overview.weeklyTrend,
      lastUpdated: 1_700_000_000_000,
    });
  });

  it("filters requests and statuses to owned projects only", () => {
    const now = Date.UTC(2026, 0, 19, 12, 0, 0);
    const overview = buildRequestOverviewReadModel({
      requests: [
        requestDoc("request-1", project1, statusOpen, Date.UTC(2026, 0, 19, 9, 0, 0)),
        requestDoc("request-2", project1, statusClosed, Date.UTC(2026, 0, 12, 9, 0, 0)),
        requestDoc("request-3", project2, statusQueued, Date.UTC(2026, 0, 12, 10, 0, 0)),
        requestDoc("request-4", otherProject, statusUnknown, Date.UTC(2026, 0, 12, 11, 0, 0)),
      ],
      ownedProjectIds: [project1, project2],
      projects: [projectDoc(project1, "Alpha"), projectDoc(project2, "Beta")],
      statuses: [
        statusDoc(statusOpen, "open", "Open", project1, "#f97316"),
        statusDoc(statusClosed, "closed", "Closed", undefined, "#0ea5e9"),
        statusDoc(statusQueued, "queued", "Queued", project2, "#22c55e"),
        statusDoc(statusUnknown, "foreign", "Foreign", otherProject, "#999999"),
      ],
      now,
    });

    equal(overview.totalRequests, 3);
    deepStrictEqual(overview.projectBreakdown, [
      { projectId: project1, title: "Alpha", count: 2 },
      { projectId: project2, title: "Beta", count: 1 },
    ]);
    deepStrictEqual(overview.statusBreakdown, [
      {
        statusId: statusOpen,
        name: "open",
        count: 1,
        color: "#f97316",
        displayName: "Open",
      },
      {
        statusId: statusClosed,
        name: "closed",
        count: 1,
        color: "#0ea5e9",
        displayName: "Closed",
      },
      {
        statusId: statusQueued,
        name: "queued",
        count: 1,
        color: "#22c55e",
        displayName: "Queued",
      },
    ]);
    deepStrictEqual(overview.weeklyTrend.at(-1), {
      weekStart: Date.UTC(2026, 0, 19, 0, 0, 0),
      label: "Jan 19",
      count: 1,
    });
  });

  it("falls back to unknown status and project labels when metadata is missing", () => {
    const overview = buildRequestOverviewReadModel({
      requests: [requestDoc("request-1", project1, statusUnknown, Date.UTC(2026, 0, 19, 9, 0, 0))],
      ownedProjectIds: [project1],
      projects: [projectDoc(project1, "Alpha")],
      statuses: [],
      now: Date.UTC(2026, 0, 19, 12, 0, 0),
    });

    equal(overview.totalRequests, 1);
    deepStrictEqual(overview.statusBreakdown, [
      {
        statusId: statusUnknown,
        name: "unknown",
        count: 1,
        color: null,
        displayName: "Unknown status",
      },
    ]);
    deepStrictEqual(overview.projectBreakdown, [{ projectId: project1, title: "Alpha", count: 1 }]);
  });

  it("keeps owned requests with missing project documents and falls back to unknown project labels", () => {
    const overview = buildRequestOverviewReadModel({
      requests: [requestDoc("request-1", project1, statusOpen, Date.UTC(2026, 0, 19, 9, 0, 0))],
      ownedProjectIds: [project1],
      projects: [],
      statuses: [statusDoc(statusOpen, "open", "Open", project1)],
      now: Date.UTC(2026, 0, 19, 12, 0, 0),
    });

    equal(overview.totalRequests, 1);
    deepStrictEqual(overview.projectBreakdown, [
      {
        projectId: project1,
        title: "Unknown project",
        count: 1,
      },
    ]);
    ok(overview.weeklyTrend.at(-1));
    equal(overview.weeklyTrend.at(-1)?.count, 1);
  });

  it("sorts breakdowns by descending count and deterministic tie order", () => {
    const overview = buildRequestOverviewReadModel({
      requests: [
        requestDoc("request-1", project1, statusOpen, Date.UTC(2026, 0, 19, 9, 0, 0)),
        requestDoc("request-2", project1, statusOpen, Date.UTC(2026, 0, 19, 10, 0, 0)),
        requestDoc("request-3", project1, statusClosed, Date.UTC(2026, 0, 19, 11, 0, 0)),
        requestDoc("request-4", project2, statusClosed, Date.UTC(2026, 0, 19, 12, 0, 0)),
        requestDoc("request-5", project2, statusQueued, Date.UTC(2026, 0, 19, 13, 0, 0)),
      ],
      ownedProjectIds: [project1, project2],
      projects: [projectDoc(project1, "Alpha"), projectDoc(project2, "Beta")],
      statuses: [statusDoc(statusOpen, "open", "Open"), statusDoc(statusClosed, "closed", "Closed")],
      now: Date.UTC(2026, 0, 19, 12, 0, 0),
    });

    deepStrictEqual(overview.statusBreakdown.map((item) => item.statusId), [statusOpen, statusClosed, statusQueued]);
    deepStrictEqual(overview.projectBreakdown.map((item) => item.projectId), [project1, project2]);
  });

  it("produces UTC Monday week buckets and labels from a fixed clock", () => {
    equal(startOfWeekUTC(Date.UTC(2026, 0, 21, 15, 0, 0)), Date.UTC(2026, 0, 19, 0, 0, 0));
    equal(startOfWeekUTC(Date.UTC(2026, 0, 19, 0, 0, 0)), Date.UTC(2026, 0, 19, 0, 0, 0));
    equal(formatWeekLabel(Date.UTC(2026, 0, 19, 0, 0, 0)), "Jan 19");
  });

  it("keeps requests on weekly UTC boundaries in the correct buckets", () => {
    const now = Date.UTC(2026, 0, 26, 12, 0, 0);
    const overview = buildRequestOverviewReadModel({
      requests: [
        requestDoc("request-1", project1, statusOpen, Date.UTC(2026, 0, 19, 0, 0, 0)),
        requestDoc("request-2", project1, statusOpen, Date.UTC(2026, 0, 18, 23, 59, 59, 999)),
      ],
      ownedProjectIds: [project1],
      projects: [projectDoc(project1, "Alpha")],
      statuses: [statusDoc(statusOpen, "open", "Open", project1)],
      now,
    });

    equal(overview.weeklyTrend.length, 16);
    deepStrictEqual(overview.weeklyTrend.at(-2), {
      weekStart: Date.UTC(2026, 0, 19, 0, 0, 0),
      label: "Jan 19",
      count: 1,
    });
    deepStrictEqual(overview.weeklyTrend.at(-3), {
      weekStart: Date.UTC(2026, 0, 12, 0, 0, 0),
      label: "Jan 12",
      count: 1,
    });
  });
});

function projectDoc(id: Id<"projects">, title: string): Doc<"projects"> {
  return {
    _id: id,
    _creationTime: Date.UTC(2026, 0, 1, 0, 0, 0),
    title,
    user: "user-1" as Id<"users">,
  };
}

function statusDoc(
  id: Id<"requestStatuses">,
  name: string,
  displayName: string,
  project?: Id<"projects">,
  color?: string,
): Doc<"requestStatuses"> {
  return {
    _id: id,
    _creationTime: Date.UTC(2026, 0, 1, 0, 0, 0),
    name,
    displayName,
    description: undefined,
    project,
    type: "custom",
    color,
    position: 0,
  };
}

function requestDoc(
  id: string,
  project: Id<"projects">,
  status: Id<"requestStatuses">,
  creationTime: number,
): Doc<"requests"> {
  return {
    _id: id as Id<"requests">,
    _creationTime: creationTime,
    text: id,
    description: undefined,
    clientId: id,
    status,
    project,
    upvoteCount: 0,
  };
}
