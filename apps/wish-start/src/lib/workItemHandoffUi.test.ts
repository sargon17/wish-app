import type { Doc, Id } from "@wish/convex-backend/data-model";
import { describe, expect, it } from "vite-plus/test";

import { getWorkItemHandoffAction } from "./workItemHandoffUi";

const connection = { health: "active" as const, destinationLabel: "Engineering" };

function handoff(lifecycle: Doc<"workItemHandoffs">["lifecycle"]): Doc<"workItemHandoffs"> {
  return {
    _id: "handoff-id" as Id<"workItemHandoffs">,
    _creationTime: 1,
    projectId: "project-id" as Id<"projects">,
    requestId: "request-id" as Id<"requests">,
    provider: "linear",
    attemptCount: 1,
    reconciliationCount: 0,
    recovery: { provider: "linear", issueId: "issue-id" },
    lifecycle,
    createdAt: 1,
    updatedAt: 1,
  };
}

describe("Work Item Handoff UI", () => {
  it("derives the explicit owner action from normalized facts", () => {
    expect(getWorkItemHandoffAction({ connection: null, handoff: null })).toBe("connect");
    expect(getWorkItemHandoffAction({ connection, handoff: null })).toBe("send");
    expect(
      getWorkItemHandoffAction({
        connection: { ...connection, health: "needs_attention" },
        handoff: null,
      }),
    ).toBe("fix");
    expect(
      getWorkItemHandoffAction({
        connection,
        handoff: handoff({ state: "pending", leaseExpiresAt: 1 }),
      }),
    ).toBe("checking");
    expect(
      getWorkItemHandoffAction({
        connection,
        handoff: handoff({
          state: "unknown",
          errorCode: "linear_outcome_unknown",
          errorMessage: "Outcome unknown",
        }),
      }),
    ).toBe("checking");
    expect(
      getWorkItemHandoffAction({
        connection,
        handoff: handoff({ state: "failed", errorCode: "linear_rejected", errorMessage: "Failed" }),
      }),
    ).toBe("retry");
  });

  it("keeps an existing external link available without a healthy connection", () => {
    expect(
      getWorkItemHandoffAction({
        connection: null,
        handoff: handoff({
          state: "succeeded",
          succeededAt: 1,
          externalIdentity: {
            provider: "linear",
            id: "issue-id",
            identifier: "ENG-42",
            url: "https://linear.app/acme/issue/ENG-42",
          },
        }),
      }),
    ).toBe("open");
  });
});
