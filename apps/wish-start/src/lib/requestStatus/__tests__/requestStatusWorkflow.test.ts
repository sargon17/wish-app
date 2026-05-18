import { describe, expect, it } from "vite-plus/test";

import type { Id } from "@wish/convex-backend/data-model";

import {
  assertCustomStatusEditable,
  assertCustomStatusRemovable,
  assertNoDuplicateStatusName,
  assertValidCustomOrderPayload,
  assertValidStatusColor,
  assertValidStatusName,
  getCanonicalStatusName,
  getDefaultStatusRank,
  getManagementStatusesForProject,
  getNextWorkflowStatusPosition,
  getStarterProjectStatusNames,
  getStatusesWithAssignedWorkflowPositions,
  getOrderedStatusesForProject,
  normalizeStatusDisplayName,
  normalizeStatusDescription,
  normalizeLegacyStatusName,
  slugifyStatusName,
  sortDefaultStatuses,
} from "../../../../../../packages/convex-backend/convex/lib/requestStatusWorkflow";
import {
  migrateProjectStatuses,
  buildProjectStatusMigrationOrder,
} from "../../../../../../packages/convex-backend/convex/requestStatuses";

describe("requestStatusWorkflow", () => {
  it("normalizes and slugifies status names consistently", () => {
    expect(normalizeStatusDisplayName("  In   Review  ")).toBe("In Review");
    expect(normalizeStatusDescription("  Explain workflow stage  ")).toBe("Explain workflow stage");
    expect(normalizeStatusDescription("   ")).toBeUndefined();
    expect(slugifyStatusName("Crème Brûlée")).toBe("creme-brulee");
    expect(normalizeLegacyStatusName("Under_Review")).toBe("under-review");
    expect(getCanonicalStatusName("completed")).toBe("done");
    expect(getStarterProjectStatusNames()).toEqual(["open", "under-review", "planned", "in-progress", "done"]);
    expect(assertValidStatusName("  In Review  ")).toEqual({ displayName: "In Review", name: "in-review" });
  });

  it("sorts default statuses ahead of custom ones by fixed rank", () => {
    expect(getDefaultStatusRank("open")).toBe(0);
    expect(getDefaultStatusRank("unknown")).toBe(Number.MAX_SAFE_INTEGER);

    const defaultStatuses = [
      { _id: "default-2", type: "default", name: "done", _creationTime: 2 },
      { _id: "default-1", type: "default", name: "open", _creationTime: 1 },
      { _id: "default-3", type: "default", name: "archived", _creationTime: 3 },
    ] as any;

    expect([...defaultStatuses].sort(sortDefaultStatuses).map((status) => status.name)).toEqual([
      "open",
      "done",
      "archived",
    ]);
  });

  it("rejects invalid colors and duplicate names", () => {
    expect(() => assertValidStatusColor("orange")).toThrow("Color must be a 6-digit hex value");
    expect(() => assertValidStatusColor("")).toThrow("Color must be a 6-digit hex value");
    expect(() => assertValidStatusColor("#F97316")).not.toThrow();

    const statuses = [
      { _id: "1", name: "open" },
      { _id: "2", name: "in-review" },
    ] as any;

    expect(() => assertNoDuplicateStatusName(statuses, "in-review")).toThrow(
      "A status with this name already exists in the project",
    );
  });

  it("validates workflow reorder payloads and editable status constraints", () => {
    const projectId = "project-1" as Id<"projects">;
    const status = {
      _id: "status-1",
      type: "custom",
      project: projectId,
      position: 0,
    } as any;

    expect(assertCustomStatusEditable(status)).toBe(status);
    expect(() => assertCustomStatusEditable({ _id: "status-2", type: "default" } as any)).toThrow(
      "Default statuses cannot be updated",
    );

    const statuses = [
      { _id: "status-0", type: "default", project: projectId },
      { _id: "status-1", type: "custom", project: projectId },
      { _id: "status-2", type: "custom", project: projectId },
    ] as any;

    expect(() => assertValidCustomOrderPayload(statuses, ["status-1", "status-0", "status-2"] as any, projectId)).not.toThrow();
    expect(() =>
      assertValidCustomOrderPayload(
        statuses,
        ["status-0", "status-2", "status-2"] as any,
        projectId,
      ),
    ).toThrow("Invalid status order payload");
    expect(() =>
      assertValidCustomOrderPayload(
        statuses,
        ["status-0", "status-2"] as any,
        projectId,
      ),
    ).toThrow("Invalid status order payload");
    expect(() => assertValidCustomOrderPayload(statuses, ["status-1", "status-1", "status-0"] as any, projectId)).toThrow(
      "Invalid status order payload",
    );
    expect(() => assertValidCustomOrderPayload(statuses, ["status-1"] as any, projectId)).toThrow(
      "Invalid status order payload",
    );
    expect(() =>
      assertValidCustomOrderPayload(
        statuses,
        ["status-0", "status-1", "status-2", "status-3"] as any,
        projectId,
      ),
    ).toThrow("Invalid status order payload");

    expect(getNextWorkflowStatusPosition([{ position: 0 }, { position: 4 }, {}] as any)).toBe(5);
  });

  it("rejects removing a status that still has linked requests", () => {
    expect(() => assertCustomStatusRemovable({ _id: "request-1" } as any)).toThrow(
      "Statuses in use cannot be removed",
    );
    expect(() => assertCustomStatusRemovable(undefined)).not.toThrow();
  });

  it("returns only project-owned statuses ordered by workflow position and creation time", async () => {
    const collected = [
      { _id: "default-1", type: "default", name: "open", _creationTime: 1 },
      { _id: "custom-1", type: "custom", project: "project-1", position: 1, _creationTime: 20 },
      { _id: "custom-0-b", type: "custom", project: "project-1", position: 0, _creationTime: 10 },
      { _id: "custom-0-a", type: "custom", project: "project-1", position: 0, _creationTime: 8 },
      { _id: "custom-missing-a", type: "custom", project: "project-1", _creationTime: 25 },
      { _id: "custom-missing-b", type: "custom", project: "project-1", _creationTime: 30 },
      { _id: "other-project", type: "custom", project: "project-2", position: 0, _creationTime: 5 },
    ] as any;
    const projectId = "project-1" as Id<"projects">;
    const withIndexArgs: Array<unknown> = [];

    const ctx = {
      db: {
        query: () => ({
          withIndex: (indexName: string, predicate: (q: { eq: (field: string, value: string) => void }) => void) => {
            withIndexArgs.push(indexName);
            predicate({
              eq: () => undefined,
            });

            return {
              collect: async () =>
                collected.filter((status: (typeof collected)[number]) => status.project === projectId),
            };
          },
        }),
      },
    } as any;

    await expect(getOrderedStatusesForProject(ctx, projectId)).resolves.toEqual([
      collected[3],
      collected[2],
      collected[1],
      collected[4],
      collected[5],
    ]);

    expect(withIndexArgs).toEqual(["by_project"]);
  });

  it("uses the full workflow order for management views and appends new statuses after the last position", async () => {
    const statuses = [
      { _id: "default-1", type: "default", project: "project-1", position: 0, _creationTime: 1 },
      { _id: "custom-1", type: "custom", project: "project-1", position: 1, _creationTime: 2 },
      { _id: "custom-2", type: "custom", project: "project-1", position: 2, _creationTime: 3 },
    ] as any;
    const projectId = "project-1" as Id<"projects">;

    const ctx = {
      db: {
        query: (table: string) => {
          if (table === "requestStatuses") {
            return {
              withIndex: () => ({
                collect: async () => statuses,
              }),
            };
          }

          return {
            withIndex: () => ({
              collect: async () => [],
            }),
          };
        },
      },
    } as any;

    await expect(getManagementStatusesForProject(ctx, projectId)).resolves.toEqual([
      { ...statuses[0], requestCount: 0 },
      { ...statuses[1], requestCount: 0 },
      { ...statuses[2], requestCount: 0 },
    ]);
    expect(getNextWorkflowStatusPosition(statuses)).toBe(3);
  });

  it("reindexes legacy workflow positions before appending a new custom status", () => {
    const statuses = [
      { _id: "status-1", type: "default", project: "project-1", position: 0, _creationTime: 1 },
      { _id: "status-2", type: "custom", project: "project-1", _creationTime: 2 },
      { _id: "status-3", type: "custom", project: "project-1", _creationTime: 3 },
    ] as any;

    expect(getStatusesWithAssignedWorkflowPositions(statuses)).toEqual([
      { ...statuses[0], position: 0 },
      { ...statuses[1], position: 1 },
      { ...statuses[2], position: 2 },
    ]);
    expect(getNextWorkflowStatusPosition(getStatusesWithAssignedWorkflowPositions(statuses))).toBe(3);
  });

  it("returns ordered management statuses with request counts", async () => {
    const statuses = [
      { _id: "status-2", type: "default", project: "project-1", position: 1, _creationTime: 20 },
      { _id: "status-1", type: "custom", project: "project-1", position: 0, _creationTime: 10 },
      { _id: "status-3", type: "custom", project: "project-1", position: 0, _creationTime: 12 },
    ] as any;
    const requests = [
      { _id: "request-1", project: "project-1", status: "status-1" },
      { _id: "request-2", project: "project-1", status: "status-1" },
      { _id: "request-3", project: "project-1", status: "status-3" },
    ] as any;
    const projectId = "project-1" as Id<"projects">;

    const ctx = {
      db: {
        query: (table: string) => {
          if (table === "requestStatuses") {
            return {
              withIndex: () => ({
                collect: async () => statuses,
              }),
            };
          }

          return {
            withIndex: () => ({
              collect: async () => requests,
            }),
          };
        },
      },
    } as any;

    await expect(getManagementStatusesForProject(ctx, projectId)).resolves.toEqual([
      { ...statuses[1], requestCount: 2 },
      { ...statuses[2], requestCount: 1 },
      { ...statuses[0], requestCount: 0 },
    ]);
  });

  it("migrates legacy default request statuses onto project-owned copies without duplicating work", async () => {
    const projectId = "project-1" as Id<"projects">;
    const ids = {
      projectCustom: "status-project-custom",
      legacyCompleted: "status-legacy-completed",
      legacyNeedsReview: "status-legacy-needs-review",
      legacyUnused: "status-legacy-unused",
      requestDone: "request-1",
      requestNeedsReview: "request-2",
    } as const;

    const state = {
      requestStatuses: [
        {
          _id: ids.projectCustom,
          _creationTime: 50,
          name: "feature-ideas",
          displayName: "Feature Ideas",
          description: "Project-owned custom status",
          color: "#123456",
          project: projectId,
          type: "custom",
          position: 0,
        },
        {
          _id: ids.legacyCompleted,
          _creationTime: 1,
          name: "completed",
          displayName: "Completed",
          description: "Legacy done bucket",
          color: "#111111",
          project: undefined,
          type: "default",
          position: undefined,
        },
        {
          _id: ids.legacyNeedsReview,
          _creationTime: 2,
          name: "needs_review",
          displayName: "Needs Review",
          description: "Legacy non-starter bucket",
          color: "#222222",
          project: undefined,
          type: "default",
          position: undefined,
        },
        {
          _id: ids.legacyUnused,
          _creationTime: 3,
          name: "unused",
          displayName: "Unused",
          description: "Should stay global",
          color: "#333333",
          project: undefined,
          type: "default",
          position: undefined,
        },
      ],
      requests: [
        { _id: ids.requestDone, _creationTime: 10, project: projectId, status: ids.legacyCompleted },
        { _id: ids.requestNeedsReview, _creationTime: 11, project: projectId, status: ids.legacyNeedsReview },
      ],
      inserts: [] as Array<{ table: string; value: any }>,
      patches: [] as Array<{ table: string; id: string; value: any }>,
    };

    const ctx = {
      db: {
        query: (table: string) => ({
          withIndex: (indexName: string, predicate: (q: { eq: (field: string, value: string) => void }) => void) => {
            expect(indexName).toBe("by_project");
            predicate({ eq: () => undefined });

            return {
              collect: async () => {
                if (table === "requestStatuses") {
                  return state.requestStatuses.filter((status) => status.project === projectId);
                }

                if (table === "requests") {
                  return state.requests.filter((request) => request.project === projectId);
                }

                return [];
              },
              first: async () => undefined,
            };
          },
        }),
        get: async (id: string) => {
          return (
            state.requestStatuses.find((status) => status._id === id) ??
            state.requests.find((request) => request._id === id)
          );
        },
        insert: async (table: string, value: any) => {
          const id = `${table}-${state.inserts.length + 1}`;
          state.inserts.push({ table, value: { ...value, _id: id } });
          if (table === "requestStatuses") {
            state.requestStatuses.push({
              _id: id,
              _creationTime: 100 + state.inserts.length,
              ...value,
            });
          }
          return id;
        },
        patch: async (id: string, value: any) => {
          state.patches.push({ table: "unknown", id, value });
          const status = state.requestStatuses.find((item) => item._id === id);
          if (status) {
            Object.assign(status, value);
          }
          const request = state.requests.find((item) => item._id === id);
          if (request) {
            Object.assign(request, value);
          }
        },
      },
    } as any;

    const firstPass = await migrateProjectStatuses(ctx, projectId);
    const secondPass = await migrateProjectStatuses(ctx, projectId);

    expect(firstPass).toMatchObject({
      projectId,
      statusesInserted: 6,
      statusesReused: 0,
      requestsPatched: 2,
      statusesReindexed: expect.any(Number),
      changed: true,
    });
    expect(secondPass).toMatchObject({
      statusesInserted: 0,
      requestsPatched: 0,
      changed: false,
    });

    const projectStatuses = state.requestStatuses
      .filter((status) => status.project === projectId)
      .sort((a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER));
    expect(projectStatuses.map((status) => status.name)).toEqual([
      "open",
      "under-review",
      "planned",
      "in-progress",
      "done",
      "needs-review",
      "triaged",
    ]);
    expect(projectStatuses.map((status) => status.position)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(state.requests.map((request) => request.status)).toEqual([
      projectStatuses.find((status) => status.name === "done")?._id,
      projectStatuses.find((status) => status.name === "needs-review")?._id,
    ]);
    expect(state.requestStatuses.some((status) => status._id === ids.legacyCompleted && status.project === undefined)).toBe(true);
    expect(state.requestStatuses.some((status) => status._id === ids.legacyNeedsReview && status.project === undefined)).toBe(true);
    expect(state.requestStatuses.some((status) => status._id === ids.legacyUnused && status.project === undefined)).toBe(true);
  });

  it("normalizes reused starter names and keeps cross-project requests on local statuses", async () => {
    const projectId = "project-1" as Id<"projects">;
    const otherProjectId = "project-2" as Id<"projects">;
    const ids = {
      completedStarter: "status-project-completed",
      localCustom: "status-project-custom",
      crossProjectStatus: "status-other-project",
      requestCompleted: "request-1",
      requestCrossProject: "request-2",
    } as const;

    const state = {
      requestStatuses: [
        {
          _id: ids.completedStarter,
          _creationTime: 5,
          name: "completed",
          displayName: "Completed",
          description: "Project-owned starter from old data",
          color: "#444444",
          project: projectId,
          type: "custom",
          position: 4,
        },
        {
          _id: ids.localCustom,
          _creationTime: 6,
          name: "triaged",
          displayName: "Triaged",
          description: "Local custom status",
          color: "#555555",
          project: projectId,
          type: "custom",
          position: 5,
        },
        {
          _id: ids.crossProjectStatus,
          _creationTime: 7,
          name: "needs-review",
          displayName: "Needs Review",
          description: "Other project's status",
          color: "#666666",
          project: otherProjectId,
          type: "custom",
          position: 0,
        },
      ],
      requests: [
        { _id: ids.requestCompleted, _creationTime: 10, project: projectId, status: ids.completedStarter },
        { _id: ids.requestCrossProject, _creationTime: 11, project: projectId, status: ids.crossProjectStatus },
      ],
      inserts: [] as Array<{ table: string; value: any }>,
      patches: [] as Array<{ table: string; id: string; value: any }>,
    };

    const ctx = {
      db: {
        query: (table: string) => ({
          withIndex: (indexName: string, predicate: (q: { eq: (field: string, value: string) => void }) => void) => {
            expect(indexName).toBe("by_project");
            predicate({ eq: () => undefined });

            return {
              collect: async () => {
                if (table === "requestStatuses") {
                  return state.requestStatuses.filter((status) => status.project === projectId);
                }

                if (table === "requests") {
                  return state.requests.filter((request) => request.project === projectId);
                }

                return [];
              },
              first: async () => undefined,
            };
          },
        }),
        get: async (id: string) => {
          return (
            state.requestStatuses.find((status) => status._id === id) ??
            state.requests.find((request) => request._id === id)
          );
        },
        insert: async (table: string, value: any) => {
          const id = `${table}-${state.inserts.length + 1}`;
          state.inserts.push({ table, value: { ...value, _id: id } });
          if (table === "requestStatuses") {
            state.requestStatuses.push({
              _id: id,
              _creationTime: 100 + state.inserts.length,
              ...value,
            });
          }
          return id;
        },
        patch: async (id: string, value: any) => {
          state.patches.push({ table: "unknown", id, value });
          const status = state.requestStatuses.find((item) => item._id === id);
          if (status) {
            Object.assign(status, value);
          }
          const request = state.requests.find((item) => item._id === id);
          if (request) {
            Object.assign(request, value);
          }
        },
      },
    } as any;

    const result = await migrateProjectStatuses(ctx, projectId);

    expect(result).toMatchObject({
      statusesInserted: 4,
      statusesReused: 1,
      requestsPatched: 2,
      changed: true,
    });

    const projectStatuses = state.requestStatuses
      .filter((status) => status.project === projectId)
      .sort((a, b) => a.position - b.position);
    expect(projectStatuses.map((status) => status.name)).toEqual([
      "open",
      "under-review",
      "planned",
      "in-progress",
      "done",
      "needs-review",
      "feature-ideas",
    ]);
    expect(projectStatuses[4]).toMatchObject({
      name: "done",
      displayName: "Done",
      type: "default",
      position: 4,
    });
    expect(state.requests.map((request) => request.status)).toEqual([
      projectStatuses.find((status) => status.name === "done")?._id,
      projectStatuses.find((status) => status.name === "open")?._id,
    ]);
    expect(state.requestStatuses.some((status) => status._id === ids.crossProjectStatus && status.project === otherProjectId)).toBe(true);
  });

  it("collapses duplicate project-owned starter statuses onto the canonical starter", async () => {
    const projectId = "project-1" as Id<"projects">;
    const ids = {
      canonicalDone: "status-done-canonical",
      duplicateCompleted: "status-completed-duplicate",
      localCustom: "status-local-custom",
      requestCanonical: "request-1",
      requestDuplicate: "request-2",
    } as const;

    const state = {
      requestStatuses: [
        {
          _id: ids.canonicalDone,
          _creationTime: 5,
          name: "done",
          displayName: "Done",
          description: "Canonical starter",
          color: "#444444",
          project: projectId,
          type: "default",
          position: 4,
        },
        {
          _id: ids.duplicateCompleted,
          _creationTime: 6,
          name: "completed",
          displayName: "Completed",
          description: "Duplicate starter",
          color: "#555555",
          project: projectId,
          type: "custom",
          position: 5,
        },
        {
          _id: ids.localCustom,
          _creationTime: 7,
          name: "triaged",
          displayName: "Triaged",
          description: "Local custom status",
          color: "#666666",
          project: projectId,
          type: "custom",
          position: 6,
        },
      ],
      requests: [
        { _id: ids.requestCanonical, _creationTime: 10, project: projectId, status: ids.canonicalDone },
        { _id: ids.requestDuplicate, _creationTime: 11, project: projectId, status: ids.duplicateCompleted },
      ],
      inserts: [] as Array<{ table: string; value: any }>,
      patches: [] as Array<{ table: string; id: string; value: any }>,
    };

    const ctx = {
      db: {
        query: (table: string) => ({
          withIndex: (indexName: string, predicate: (q: { eq: (field: string, value: string) => void }) => void) => {
            expect(indexName).toBe("by_project");
            predicate({ eq: () => undefined });

            return {
              collect: async () => {
                if (table === "requestStatuses") {
                  return state.requestStatuses.filter((status) => status.project === projectId);
                }

                if (table === "requests") {
                  return state.requests.filter((request) => request.project === projectId);
                }

                return [];
              },
              first: async () => undefined,
            };
          },
        }),
        get: async (id: string) => {
          return (
            state.requestStatuses.find((status) => status._id === id) ??
            state.requests.find((request) => request._id === id)
          );
        },
        insert: async (table: string, value: any) => {
          const id = `${table}-${state.inserts.length + 1}`;
          state.inserts.push({ table, value: { ...value, _id: id } });
          if (table === "requestStatuses") {
            state.requestStatuses.push({
              _id: id,
              _creationTime: 100 + state.inserts.length,
              ...value,
            });
          }
          return id;
        },
        patch: async (id: string, value: any) => {
          state.patches.push({ table: "unknown", id, value });
          const status = state.requestStatuses.find((item) => item._id === id);
          if (status) {
            Object.assign(status, value);
          }
          const request = state.requests.find((item) => item._id === id);
          if (request) {
            Object.assign(request, value);
          }
        },
      },
    } as any;

    const result = await migrateProjectStatuses(ctx, projectId);

    expect(result).toMatchObject({
      statusesInserted: 4,
      statusesReused: 1,
      requestsPatched: 1,
      changed: true,
    });

    const projectStatuses = state.requestStatuses
      .filter((status) => status.project === projectId)
      .sort((a, b) => a.position - b.position);

    expect(projectStatuses.slice(0, 5).map((status) => status.name)).toEqual([
      "open",
      "under-review",
      "planned",
      "in-progress",
      "done",
    ]);
    expect(projectStatuses[5].name).toMatch(/^done-legacy-/);
    expect(projectStatuses[6].name).toBe("triaged");
    expect(projectStatuses[4]).toMatchObject({
      name: "done",
      displayName: "Done",
      type: "default",
      position: 4,
    });
    expect(projectStatuses[5]).toMatchObject({
      displayName: "Completed",
      type: "custom",
    });
    expect(state.requests.map((request) => request.status)).toEqual([
      projectStatuses.find((status) => status.name === "done")?._id,
      projectStatuses.find((status) => status.name === "done")?._id,
    ]);
  });

  it("prefers the exact starter record over an older starter alias duplicate", async () => {
    const projectId = "project-1" as Id<"projects">;
    const ids = {
      canonicalDone: "status-done-canonical",
      duplicateCompleted: "status-completed-duplicate",
      localCustom: "status-local-custom",
      requestCanonical: "request-1",
      requestDuplicate: "request-2",
    } as const;

    const state = {
      requestStatuses: [
        {
          _id: ids.canonicalDone,
          _creationTime: 10,
          name: "done",
          displayName: "Done",
          description: "Canonical starter",
          color: "#444444",
          project: projectId,
          type: "default",
          position: 4,
        },
        {
          _id: ids.duplicateCompleted,
          _creationTime: 5,
          name: "completed",
          displayName: "Completed",
          description: "Older duplicate starter alias",
          color: "#555555",
          project: projectId,
          type: "custom",
          position: 0,
        },
        {
          _id: ids.localCustom,
          _creationTime: 7,
          name: "triaged",
          displayName: "Triaged",
          description: "Local custom status",
          color: "#666666",
          project: projectId,
          type: "custom",
          position: 6,
        },
      ],
      requests: [
        { _id: ids.requestCanonical, _creationTime: 10, project: projectId, status: ids.canonicalDone },
        { _id: ids.requestDuplicate, _creationTime: 11, project: projectId, status: ids.duplicateCompleted },
      ],
      inserts: [] as Array<{ table: string; value: any }>,
      patches: [] as Array<{ table: string; id: string; value: any }>,
    };

    const ctx = {
      db: {
        query: (table: string) => ({
          withIndex: (indexName: string, predicate: (q: { eq: (field: string, value: string) => void }) => void) => {
            expect(indexName).toBe("by_project");
            predicate({ eq: () => undefined });

            return {
              collect: async () => {
                if (table === "requestStatuses") {
                  return state.requestStatuses.filter((status) => status.project === projectId);
                }

                if (table === "requests") {
                  return state.requests.filter((request) => request.project === projectId);
                }

                return [];
              },
              first: async () => undefined,
            };
          },
        }),
        get: async (id: string) => {
          return (
            state.requestStatuses.find((status) => status._id === id) ??
            state.requests.find((request) => request._id === id)
          );
        },
        insert: async (table: string, value: any) => {
          const id = `${table}-${state.inserts.length + 1}`;
          state.inserts.push({ table, value: { ...value, _id: id } });
          if (table === "requestStatuses") {
            state.requestStatuses.push({
              _id: id,
              _creationTime: 100 + state.inserts.length,
              ...value,
            });
          }
          return id;
        },
        patch: async (id: string, value: any) => {
          state.patches.push({ table: "unknown", id, value });
          const status = state.requestStatuses.find((item) => item._id === id);
          if (status) {
            Object.assign(status, value);
          }
          const request = state.requests.find((item) => item._id === id);
          if (request) {
            Object.assign(request, value);
          }
        },
      },
    } as any;

    const result = await migrateProjectStatuses(ctx, projectId);

    expect(result).toMatchObject({
      statusesInserted: 4,
      statusesReused: 1,
      requestsPatched: 1,
      changed: true,
    });

    const projectStatuses = state.requestStatuses
      .filter((status) => status.project === projectId)
      .sort((a, b) => a.position - b.position);

    expect(projectStatuses.slice(0, 5).map((status) => status.name)).toEqual([
      "open",
      "under-review",
      "planned",
      "in-progress",
      "done",
    ]);
    expect(projectStatuses[5].name).toMatch(/^done-legacy-/);
    expect(projectStatuses[5]).toMatchObject({
      displayName: "Completed",
      type: "custom",
    });
    expect(projectStatuses[6].name).toBe("triaged");
    expect(projectStatuses[4]).toMatchObject({
      name: "done",
      displayName: "Done",
      type: "default",
      position: 4,
    });
    expect(state.requests.map((request) => request.status)).toEqual([
      projectStatuses.find((status) => status.name === "done")?._id,
      projectStatuses.find((status) => status.name === "done")?._id,
    ]);
  });

  it("builds a deterministic migration order from project-owned and legacy statuses", () => {
    const projectId = "project-1" as Id<"projects">;
    const projectStatuses = [
      {
        _id: "status-done-duplicate",
        _creationTime: 10,
        name: "completed",
        displayName: "Completed",
        project: projectId,
        type: "custom",
        position: 5,
      },
      {
        _id: "status-open",
        _creationTime: 11,
        name: "open",
        displayName: "Open",
        project: projectId,
        type: "default",
        position: 0,
      },
      {
        _id: "status-custom",
        _creationTime: 12,
        name: "triaged",
        displayName: "Triaged",
        project: projectId,
        type: "custom",
        position: 6,
      },
    ] as any;
    const legacyStatuses = [
      {
        _id: "legacy-needs-review",
        _creationTime: 1,
        name: "needs_review",
        displayName: "Needs Review",
        project: undefined,
        type: "default",
      },
      {
        _id: "legacy-unused",
        _creationTime: 2,
        name: "unused",
        displayName: "Unused",
        project: undefined,
        type: "default",
      },
    ] as any;

    const result = buildProjectStatusMigrationOrder(projectStatuses, legacyStatuses);

    expect(result.projectStatusByCanonicalName.get("open")).toBe(projectStatuses[1]);
    expect(result.projectStatusByCanonicalName.get("done")).toBe(projectStatuses[0]);
    expect(result.legacyStatusesByCanonicalName.get("needs-review")).toBe(legacyStatuses[0]);
    expect(result.legacyStatusesByCanonicalName.get("unused")).toBe(legacyStatuses[1]);
    expect(result.orderedStatuses.map((status) => status._id)).toEqual([
      "status-open",
      "status-done-duplicate",
      "status-custom",
    ]);
  });

  it("keeps the planner stable for an empty project and preserves custom status order", () => {
    const projectStatuses = [
      {
        _id: "status-alpha",
        _creationTime: 10,
        name: "alpha",
        displayName: "Alpha",
        project: "project-1",
        type: "custom",
        position: 2,
      },
      {
        _id: "status-beta",
        _creationTime: 11,
        name: "beta",
        displayName: "Beta",
        project: "project-1",
        type: "custom",
        position: 0,
      },
    ] as any;

    const result = buildProjectStatusMigrationOrder(projectStatuses, []);

    expect(result.projectStatusByCanonicalName.size).toBe(2);
    expect(result.legacyStatusesByCanonicalName.size).toBe(0);
    expect(result.orderedStatuses.map((status) => status._id)).toEqual(["status-beta", "status-alpha"]);
  });
});
