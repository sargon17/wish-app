export const WORK_ITEM_HANDOFF_STATES = ["pending", "succeeded", "failed", "unknown"] as const;
export const WORK_ITEM_HANDOFF_LEASE_MS = 60_000;

const transitions = {
  pending: ["succeeded", "failed", "unknown"],
  succeeded: [],
  failed: ["pending"],
  unknown: ["succeeded"],
} as const;

export function canTransitionHandoff(
  from: (typeof WORK_ITEM_HANDOFF_STATES)[number],
  to: (typeof WORK_ITEM_HANDOFF_STATES)[number],
) {
  return (transitions[from] as readonly string[]).includes(to);
}

export function isHandoffBlocking(state: (typeof WORK_ITEM_HANDOFF_STATES)[number]) {
  return state === "pending" || state === "unknown";
}

export function isPendingLeaseExpired(leaseExpiresAt: number, now: number) {
  return leaseExpiresAt <= now;
}
