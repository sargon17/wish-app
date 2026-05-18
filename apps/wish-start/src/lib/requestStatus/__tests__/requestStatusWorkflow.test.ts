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
});
