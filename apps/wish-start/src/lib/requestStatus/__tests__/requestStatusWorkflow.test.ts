import { describe, expect, it } from "vite-plus/test";

import type { Id } from "@wish/convex-backend/data-model";

import {
  assertCustomStatusEditable,
  assertCustomStatusRemovable,
  assertNoDuplicateStatusName,
  assertValidCustomOrderPayload,
  assertValidStatusColor,
  assertValidStatusName,
  getDefaultStatusRank,
  getNextCustomStatusPosition,
  getOrderedStatusesForProject,
  normalizeStatusDisplayName,
  normalizeStatusDescription,
  slugifyStatusName,
  sortDefaultStatuses,
} from "../../../../../../packages/convex-backend/convex/lib/requestStatusWorkflow";

describe("requestStatusWorkflow", () => {
  it("normalizes and slugifies status names consistently", () => {
    expect(normalizeStatusDisplayName("  In   Review  ")).toBe("In Review");
    expect(normalizeStatusDescription("  Explain workflow stage  ")).toBe("Explain workflow stage");
    expect(normalizeStatusDescription("   ")).toBeUndefined();
    expect(slugifyStatusName("Crème Brûlée")).toBe("creme-brulee");
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

  it("validates custom reorder payloads and editable status constraints", () => {
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
      { _id: "status-1", type: "custom", project: projectId },
      { _id: "status-2", type: "custom", project: projectId },
    ] as any;

    expect(() =>
      assertValidCustomOrderPayload(
        [
          ...statuses,
          { _id: "status-3", type: "default", project: undefined },
        ],
        ["status-1", "status-2"] as any,
        projectId,
      ),
    ).toThrow("Invalid status order payload");
    expect(() => assertValidCustomOrderPayload(statuses, ["status-1", "status-1"] as any, projectId)).toThrow(
      "Invalid status order payload",
    );
    expect(() => assertValidCustomOrderPayload(statuses, ["status-1"] as any, projectId)).toThrow(
      "Invalid status order payload",
    );

    expect(getNextCustomStatusPosition([{ position: 0 }, { position: 4 }, {}] as any)).toBe(5);
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

    const ctx = {
      db: {
        query: () => ({
          withIndex: () => ({
            collect: async () =>
              collected.filter((status: (typeof collected)[number]) => status.project === projectId),
          }),
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
  });
});
