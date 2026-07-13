export function getInitialGitHubRepositoryId(
  repositories: { id: string }[],
  currentRepositoryId?: string,
) {
  if (
    currentRepositoryId &&
    repositories.some((repository) => repository.id === currentRepositoryId)
  ) {
    return currentRepositoryId;
  }
  return repositories.length === 1 ? repositories[0].id : "";
}

const callbackResults = [
  "authorized",
  "authorization_denied",
  "invalid_callback",
  "invalid_state",
  "github_exchange_failed",
  "github_discovery_failed",
  "github_revocation_failed",
  "github_persistence_failed",
] as const;

export function parseGitHubCallbackResult(value?: string | null) {
  return callbackResults.find((result) => result === value);
}
