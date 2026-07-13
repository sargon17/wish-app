export function getInitialLinearTeamId(teams: { id: string }[], currentTeamId?: string) {
  if (currentTeamId && teams.some((team) => team.id === currentTeamId)) return currentTeamId;
  return teams.length === 1 ? teams[0].id : "";
}

const callbackResults = [
  "authorized",
  "authorization_denied",
  "invalid_callback",
  "invalid_state",
  "linear_exchange_failed",
  "linear_discovery_failed",
  "linear_persistence_failed",
] as const;

export function parseLinearCallbackResult(value?: string | null) {
  return callbackResults.find((result) => result === value);
}
