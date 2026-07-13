import {
  GITHUB_API_URL,
  GITHUB_API_VERSION,
  GITHUB_TIMEOUT_MS,
  githubHeaders,
  isGitHubRateLimitedResponse,
  readGitHubJson,
} from "./githubApp";

const RECONCILIATION_PAGE_SIZE = 3;
const MAX_RECONCILIATION_PAGES = 34;
const RECONCILIATION_CLOCK_SAFETY_MS = 5_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown, maxLength: number) {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength
    ? value
    : undefined;
}

function readPositiveInteger(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : undefined;
}

function readCorrelationId(response: Response) {
  const value = response.headers.get("x-github-request-id");
  return value && /^[A-Za-z0-9._:-]{1,200}$/.test(value) ? value : undefined;
}

function readGitHubIssueIdentity(
  value: unknown,
  repository: { id: string; owner: string; name: string },
) {
  if (!isRecord(value)) return;
  const id = readPositiveInteger(value.id);
  const nodeId = readString(value.node_id, 200);
  const number = readPositiveInteger(value.number);
  const urlValue = readString(value.html_url, 2_000);
  if (!id || !nodeId || !number || !urlValue) return;
  try {
    const url = new URL(urlValue);
    const expectedPath = `/${repository.owner}/${repository.name}/issues/${number}`;
    if (
      url.protocol !== "https:" ||
      url.hostname !== "github.com" ||
      url.pathname.toLowerCase() !== expectedPath.toLowerCase() ||
      url.search ||
      url.hash ||
      url.username ||
      url.password
    ) {
      return;
    }
    return {
      provider: "github" as const,
      id: String(id),
      nodeId,
      number,
      repositoryId: repository.id,
      identifier: `${repository.owner}/${repository.name}#${number}`,
      url: url.toString(),
    };
  } catch {
    return;
  }
}

function unknownResult(correlationId?: string) {
  return {
    state: "unknown" as const,
    errorCode: "github_outcome_unknown",
    errorMessage: "Wish could not confirm whether GitHub created the issue",
    providerCorrelationId: correlationId,
    needsAttention: false,
  };
}

function failedResult(
  errorCode: string,
  errorMessage: string,
  correlationId?: string,
  needsAttention = false,
) {
  return {
    state: "failed" as const,
    errorCode,
    errorMessage,
    providerCorrelationId: correlationId,
    needsAttention,
  };
}

function issueUrl(owner: string, repository: string) {
  return `${GITHUB_API_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/issues`;
}

export async function createGitHubIssue(args: {
  accessToken: string;
  repository: { id: string; owner: string; name: string };
  title: string;
  body: string;
}) {
  let response: Response;
  try {
    response = await fetch(issueUrl(args.repository.owner, args.repository.name), {
      method: "POST",
      headers: { ...githubHeaders(args.accessToken), "content-type": "application/json" },
      body: JSON.stringify({ title: args.title, body: args.body }),
      signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
    });
  } catch {
    return unknownResult();
  }

  const correlationId = readCorrelationId(response);
  if (response.status >= 500) return unknownResult(correlationId);
  if (
    response.status === 401 ||
    response.status === 403 ||
    response.status === 404 ||
    response.status === 410
  ) {
    if (isGitHubRateLimitedResponse(response)) {
      return failedResult(
        "github_rate_limited",
        "GitHub rate limited the issue request",
        correlationId,
      );
    }
    return failedResult(
      "github_connection_invalid",
      "GitHub rejected the connection or repository",
      correlationId,
      true,
    );
  }
  if (response.status === 429) {
    return failedResult(
      "github_rate_limited",
      "GitHub rate limited the issue request",
      correlationId,
    );
  }
  if (response.status === 422) {
    return failedResult("github_rejected", "GitHub rejected the issue", correlationId);
  }
  if (response.status !== 201) {
    return response.status >= 400
      ? failedResult("github_rejected", "GitHub rejected the issue", correlationId)
      : unknownResult(correlationId);
  }

  let body: unknown;
  try {
    body = await readGitHubJson(response);
  } catch {
    return unknownResult(correlationId);
  }
  const externalIdentity = readGitHubIssueIdentity(body, args.repository);
  return externalIdentity
    ? { state: "succeeded" as const, externalIdentity, needsAttention: false }
    : unknownResult(correlationId);
}

export async function findGitHubIssueBySource(args: {
  accessToken: string;
  repository: { id: string; owner: string; name: string };
  sourceUrl: string;
  startedAt: number;
}) {
  const sourceMarker = `[View original in Wish](${args.sourceUrl})`;
  const cutoff = args.startedAt - RECONCILIATION_CLOCK_SAFETY_MS;
  for (let page = 1; page <= MAX_RECONCILIATION_PAGES; page += 1) {
    const url = new URL(issueUrl(args.repository.owner, args.repository.name));
    url.searchParams.set("state", "all");
    url.searchParams.set("sort", "created");
    url.searchParams.set("direction", "desc");
    // ponytail: small pages keep full issue bodies below the shared 1 MB cap.
    url.searchParams.set("per_page", String(RECONCILIATION_PAGE_SIZE));
    url.searchParams.set("page", String(page));
    url.searchParams.set("since", new Date(cutoff).toISOString());

    let response: Response;
    try {
      response = await fetch(url, {
        headers: githubHeaders(args.accessToken),
        signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
      });
    } catch {
      return { state: "unknown" as const, needsAttention: false };
    }
    if (
      response.status === 401 ||
      response.status === 403 ||
      response.status === 404 ||
      response.status === 410
    ) {
      return {
        state: "unknown" as const,
        needsAttention: !isGitHubRateLimitedResponse(response),
      };
    }
    if (!response.ok) return { state: "unknown" as const, needsAttention: false };

    let body: unknown;
    try {
      body = await readGitHubJson(response);
    } catch {
      return { state: "unknown" as const, needsAttention: false };
    }
    if (!Array.isArray(body)) {
      return { state: "unknown" as const, needsAttention: false };
    }
    for (const issue of body) {
      if (!isRecord(issue)) return { state: "unknown" as const, needsAttention: false };
      const createdAtValue = readString(issue.created_at, 100);
      const createdAt = createdAtValue ? Date.parse(createdAtValue) : Number.NaN;
      if (!Number.isFinite(createdAt)) {
        return { state: "unknown" as const, needsAttention: false };
      }
      if (createdAt < cutoff) return { state: "absent" as const, needsAttention: false };
      if (issue.pull_request !== undefined) continue;
      if (typeof issue.body === "string" && issue.body.includes(sourceMarker)) {
        const externalIdentity = readGitHubIssueIdentity(issue, args.repository);
        return externalIdentity
          ? { state: "succeeded" as const, externalIdentity, needsAttention: false }
          : { state: "unknown" as const, needsAttention: false };
      }
    }
    if (body.length < RECONCILIATION_PAGE_SIZE) {
      return { state: "absent" as const, needsAttention: false };
    }
  }
  return { state: "unknown" as const, needsAttention: false };
}
