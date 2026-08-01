export function isWorkTrackerCredentialLeaseActive(
  lease: { expiresAt: number } | undefined,
  now: number,
) {
  return Boolean(lease && lease.expiresAt > now);
}
