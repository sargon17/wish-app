import { describe, expect, it } from "vite-plus/test";

import {
  assertCustomStatusEditable,
  assertNoDuplicateStatusName,
  assertValidCustomOrderPayload,
  assertValidStatusColor,
  assertValidStatusName,
  getDefaultStatusRank,
  getOrderedStatusesForProject,
  normalizeStatusDisplayName,
  slugifyStatusName,
} from "../../../../../../packages/convex-backend/convex/lib/requestStatusWorkflow";

describe("requestStatusWorkflow", () => {
  it("normalizes and slugifies status names consistently", () => {
    expect(normalizeStatusDisplayName("  In   Review  ")).toBe("In Review");
    expect(slugifyStatusName("Crème Brûlée")).toBe("creme-brulee");
    expect(assertValidStatusName("  In Review  ")).toEqual({ displayName: "In Review", name: "in-review" });
  });

  it("sorts default statuses ahead of custom ones by fixed rank", () => {
    expect(getDefaultStatusRank("open")).toBe(0);
    expect(getDefaultStatusRank("unknown")).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("rejects invalid colors and duplicate names", () => {
    expect(() => assertValidStatusColor("orange")).toThrow("Color must be a 6-digit hex value");

    const statuses = [
      { _id: "1", name: "open" },
      { _id: "2", name: "in-review" },
    ] as any;

    expect(() => assertNoDuplicateStatusName(statuses, "in-review")).toThrow(
      "A status with this name already exists in the project",
    );
  });

  it("validates custom reorder payloads and editable status constraints", () => {
    const projectId = "project-1";
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

    expect(() => assertValidCustomOrderPayload(statuses, ["status-1", "status-1"] as any, projectId)).toThrow(
      "Invalid status order payload",
    );
    expect(() => assertValidCustomOrderPayload(statuses, ["status-1"] as any, projectId)).toThrow(
      "Invalid status order payload",
    );
  });

  it("exposes backend ordering as the only project status ordering path", async () => {
    const collected = [
      { _id: "default-1", type: "default", name: "open" },
      { _id: "custom-1", type: "custom", project: "project-1", position: 1 },
      { _id: "custom-0", type: "custom", project: "project-1", position: 0 },
    ] as any;

    const ctx = {
      db: {
        query: () => ({
          filter: () => ({
            collect: async () => collected,
          }),
        }),
      },
    } as any;

    await expect(getOrderedStatusesForProject(ctx, "project-1")).resolves.toEqual([
      collected[0],
      collected[2],
      collected[1],
    ]);
  });
});
