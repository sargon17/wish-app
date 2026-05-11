import { describe, expect, it } from "vite-plus/test";

import type { Doc, Id } from "@wish/convex-backend/data-model";

import { getRequestDialogDefaultStatus } from "../defaultStatus";

describe("requestBoard defaultStatus", () => {
  it("prefers edit request status, explicit create status, then ordered project status", () => {
    const requestStatus = "status-request" as Id<"requestStatuses">;
    const explicitStatus = "status-explicit" as Id<"requestStatuses">;
    const statuses = [
      { _id: "status-first" },
      { _id: "status-second" },
    ] as Doc<"requestStatuses">[];

    expect(
      getRequestDialogDefaultStatus({
        method: "edit",
        request: { status: requestStatus } as Doc<"requests">,
        explicitStatus,
        statuses,
      }),
    ).toBe(requestStatus);

    expect(
      getRequestDialogDefaultStatus({
        method: "create",
        explicitStatus,
        statuses,
      }),
    ).toBe(explicitStatus);

    expect(
      getRequestDialogDefaultStatus({
        method: "create",
        statuses,
      }),
    ).toBe("status-first");

    expect(
      getRequestDialogDefaultStatus({
        method: "create",
      }),
    ).toBe("");
  });
});
