import { describe, expect, it } from "vite-plus/test";

import { LINEAR_REFRESH_EARLY_MS } from "./linearConnection";
import {
  WORK_ITEM_HANDOFF_RECONCILIATION_DELAYS_MS,
  WORK_ITEM_HANDOFF_STATES,
  canTransitionHandoff,
  handoffDelayWithJitter,
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

  it("adds stable bounded jitter to reconciliation delays", () => {
    const delay = handoffDelayWithJitter(20_000, "handoff-id");
    expect(delay).toBe(handoffDelayWithJitter(20_000, "handoff-id"));
    expect(delay).toBeGreaterThanOrEqual(18_000);
    expect(delay).toBeLessThanOrEqual(22_000);
  });

  it("targets checks at 5 seconds, 20 seconds, 1 minute, and 5 minutes", () => {
    let elapsed = 0;
    expect(
      WORK_ITEM_HANDOFF_RECONCILIATION_DELAYS_MS.map((delay) => {
        elapsed += delay;
        return elapsed;
      }),
    ).toEqual([5_000, 20_000, 60_000, 300_000]);
  });

  it("refreshes credentials before the maximum jittered reconciliation horizon", () => {
    const maximumHorizon = WORK_ITEM_HANDOFF_RECONCILIATION_DELAYS_MS.reduce(
      (elapsed, delay) => elapsed + delay * 1.1,
      0,
    );
    expect(LINEAR_REFRESH_EARLY_MS - maximumHorizon).toBeGreaterThanOrEqual(60_000);
  });
});
