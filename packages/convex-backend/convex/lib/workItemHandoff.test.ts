import { describe, expect, it } from "vite-plus/test";

import {
  WORK_ITEM_HANDOFF_STATES,
  canTransitionHandoff,
  isHandoffBlocking,
  isPendingLeaseExpired,
} from "./workItemHandoff";

describe("Work Item Handoff lifecycle", () => {
  it("allows only the agreed lifecycle transitions", () => {
    const allowed = new Set([
      "pending:succeeded",
      "pending:failed",
      "pending:unknown",
      "failed:pending",
      "unknown:succeeded",
    ]);

    for (const from of WORK_ITEM_HANDOFF_STATES) {
      for (const to of WORK_ITEM_HANDOFF_STATES) {
        expect(canTransitionHandoff(from, to)).toBe(allowed.has(`${from}:${to}`));
      }
    }
  });

  it("blocks destructive connection changes only for unresolved Handoffs", () => {
    expect(isHandoffBlocking("pending")).toBe(true);
    expect(isHandoffBlocking("unknown")).toBe(true);
    expect(isHandoffBlocking("failed")).toBe(false);
    expect(isHandoffBlocking("succeeded")).toBe(false);
  });

  it("expires a pending lease when its deadline passes", () => {
    expect(isPendingLeaseExpired(999, 1000)).toBe(true);
    expect(isPendingLeaseExpired(1000, 1000)).toBe(true);
    expect(isPendingLeaseExpired(1001, 1000)).toBe(false);
  });
});
