import {
  GITHUB_API_URL,
  GITHUB_TIMEOUT_MS,
  githubHeaders,
  isGitHubRateLimitedResponse,
  readGitHubJson,
} from "./githubApp";
import { buildWorkItemDescription } from "./workItemHandoffPayload";

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

function buildGitHubHandoffSearchTerm(handoffId: string) {
  return `wish-handoff:${handoffId}`;
}

export function buildGitHubHandoffMarker(handoffId: string) {
  return `<!-- ${buildGitHubHandoffSearchTerm(handoffId)} -->`;
}

export function buildGitHubIssueBody(
  description: string | undefined,
  sourceUrl: string,
  handoffId: string,
) {
  return `${buildWorkItemDescription(description, sourceUrl)}\n\n${buildGitHubHandoffMarker(handoffId)}`;
}

function issueSearchUrl(owner: string, repository: string, searchTerm: string) {
  const url = new URL(`${GITHUB_API_URL}/search/issues`);
  url.searchParams.set("q", `repo:${owner}/${repository} is:issue in:body "${searchTerm}"`);
  url.searchParams.set("per_page", "2");
  return url;
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

export async function findGitHubIssueByHandoff(args: {
  accessToken: string;
  repository: { id: string; owner: string; name: string };
  handoffId: string;
}) {
  let response: Response;
  try {
    response = await fetch(
      issueSearchUrl(
        args.repository.owner,
        args.repository.name,
        buildGitHubHandoffSearchTerm(args.handoffId),
      ),
      {
        headers: githubHeaders(args.accessToken),
        signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
      },
    );
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
  if (
    !isRecord(body) ||
    body.total_count !== 1 ||
    body.incomplete_results !== false ||
    !Array.isArray(body.items) ||
    body.items.length !== 1
  ) {
    return { state: "unknown" as const, needsAttention: false };
  }
  const marker = buildGitHubHandoffMarker(args.handoffId);
  const issue = body.items[0];
  if (
    !isRecord(issue) ||
    issue.pull_request !== undefined ||
    typeof issue.body !== "string" ||
    !issue.body.includes(marker)
  ) {
    return { state: "unknown" as const, needsAttention: false };
  }
  const externalIdentity = readGitHubIssueIdentity(issue, args.repository);
  return externalIdentity
    ? { state: "succeeded" as const, externalIdentity, needsAttention: false }
    : { state: "unknown" as const, needsAttention: false };
}
