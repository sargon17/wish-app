import type { Doc } from "../_generated/dataModel";

export function isWorkTrackerCredentialLeaseActive(
  lease: { expiresAt: number } | undefined,
  now: number,
) {
  return Boolean(lease && lease.expiresAt > now);
}

export function linearConnectionOrNull(
  connection: Doc<"workTrackerConnections"> | null | undefined,
) {
  if (connection?.provider !== "linear" || connection.data.provider !== "linear") return null;
  return { ...connection, data: connection.data };
}

export function linearSetupOrNull(setup: Doc<"workTrackerOAuthSetups"> | null | undefined) {
  if (setup?.provider !== "linear" || setup.data.provider !== "linear") return null;
  return { ...setup, data: setup.data };
}

export function githubConnectionOrNull(
  connection: Doc<"workTrackerConnections"> | null | undefined,
) {
  if (connection?.provider !== "github" || connection.data.provider !== "github") return null;
  return { ...connection, data: connection.data };
}

export function githubSetupOrNull(setup: Doc<"workTrackerOAuthSetups"> | null | undefined) {
  if (setup?.provider !== "github" || setup.data.provider !== "github") return null;
  return { ...setup, data: setup.data };
}
