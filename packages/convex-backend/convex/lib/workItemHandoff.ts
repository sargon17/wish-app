export const WORK_ITEM_HANDOFF_STATES = ["pending", "succeeded", "failed", "unknown"] as const;
export const WORK_ITEM_HANDOFF_LEASE_MS = 60_000;
export const WORK_ITEM_HANDOFF_RECONCILIATION_DELAYS_MS = [5_000, 15_000, 40_000, 240_000] as const;

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

export function handoffDelayWithJitter(delay: number, handoffId: string) {
  const spread = Math.floor(delay * 0.1);
  let hash = 0;
  for (const character of handoffId) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return delay - spread + (hash % (spread * 2 + 1));
}
