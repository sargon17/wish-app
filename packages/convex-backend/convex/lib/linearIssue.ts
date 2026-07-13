import { readBoundedJson } from "./linearOAuth";

const LINEAR_GRAPHQL_URL = "https://api.linear.app/graphql";
const LINEAR_TIMEOUT_MS = 10_000;

const createIssueMutation = `mutation CreateLinearIssue($input: IssueCreateInput!) {
  issueCreate(input: $input) {
    success
    issue { id identifier url }
  }
}`;

const findIssueQuery = `query FindLinearIssue($id: String!) {
  issue(id: $id) { id identifier url }
}`;

const definiteRejectionCodes = new Set([
  "AUTHENTICATION_ERROR",
  "BAD_USER_INPUT",
  "FORBIDDEN",
  "RATELIMITED",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown, maxLength: number) {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength
    ? value
    : undefined;
}

function readCorrelationId(response: Response) {
  const value = response.headers.get("x-request-id");
  return value && /^[A-Za-z0-9._:-]{1,200}$/.test(value) ? value : undefined;
}

function readGraphQLErrors(value: unknown) {
  if (!isRecord(value) || value.errors === undefined) return { present: false as const };
  if (!Array.isArray(value.errors)) return { present: true as const };
  if (value.errors.length === 0) return { present: false as const };

  const codes = value.errors.map((error) => {
    if (!isRecord(error) || !isRecord(error.extensions)) return;
    return readString(error.extensions.code, 100);
  });
  return codes.every(Boolean)
    ? { present: true as const, codes: codes as string[] }
    : { present: true as const };
}

function readIssue(value: unknown, expectedId: string) {
  if (!isRecord(value)) return;

  const id = readString(value.id, 100);
  const identifier = readString(value.identifier, 100);
  const urlValue = readString(value.url, 2_000);
  if (id !== expectedId || !identifier || !urlValue) return;

  try {
    const url = new URL(urlValue);
    if (url.protocol !== "https:" || url.hostname !== "linear.app") return;
    return { provider: "linear" as const, id, identifier, url: url.toString() };
  } catch {
    return;
  }
}

function unknownResult(correlationId?: string, needsAttention = false) {
  return {
    state: "unknown" as const,
    errorCode: "linear_outcome_unknown",
    errorMessage: "Wish could not confirm whether Linear created the issue",
    providerCorrelationId: correlationId,
    needsAttention,
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

async function requestLinear(accessToken: string, query: string, variables: unknown) {
  return await fetch(LINEAR_GRAPHQL_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(LINEAR_TIMEOUT_MS),
  });
}

export function buildLinearIssueDescription(description: string | undefined, sourceUrl: string) {
  const sourceLink = `[View original in Wish](${sourceUrl})`;
  return description ? `${description}\n\n---\n\n${sourceLink}` : sourceLink;
}

export function buildWishSourceUrl(
  baseUrl: string,
  projectId: string,
  projectSlug: string | undefined,
  kind: "request" | "complaint",
  requestId: string,
) {
  const source = kind === "complaint" ? "complaints" : "requests";
  const path = ["dashboard", "project", projectId, projectSlug ?? "project", source]
    .map(encodeURIComponent)
    .join("/");
  const url = new URL(`/${path}`, baseUrl);
  url.searchParams.set("item", requestId);
  return url.toString();
}

export async function createLinearIssue(args: {
  accessToken: string;
  issueId: string;
  teamId: string;
  title: string;
  description: string;
}) {
  let response: Response;
  try {
    response = await requestLinear(args.accessToken, createIssueMutation, {
      input: {
        id: args.issueId,
        teamId: args.teamId,
        title: args.title,
        description: args.description,
      },
    });
  } catch {
    return unknownResult();
  }

  const correlationId = readCorrelationId(response);
  if (response.status >= 500) return unknownResult(correlationId);
  if (response.status === 401 || response.status === 403) {
    return failedResult(
      "linear_connection_invalid",
      "Linear rejected the connection or destination",
      correlationId,
      true,
    );
  }
  if (response.status === 429) {
    return failedResult("linear_rate_limited", "Linear rate limited the request", correlationId);
  }

  let body: unknown;
  try {
    body = await readBoundedJson(response);
  } catch {
    return unknownResult(correlationId);
  }

  const errors = readGraphQLErrors(body);
  if (!response.ok || !isRecord(body) || !isRecord(body.data)) {
    return unknownResult(correlationId);
  }

  const result = body.data.issueCreate;
  if (!isRecord(result) || typeof result.success !== "boolean") {
    return unknownResult(correlationId);
  }
  if (result.success) {
    const externalIdentity = readIssue(result.issue, args.issueId);
    if (!externalIdentity || (errors.present && !errors.codes)) {
      return unknownResult(correlationId);
    }
    return { state: "succeeded" as const, externalIdentity, needsAttention: false };
  }
  if (errors.present) {
    if (!errors.codes || !errors.codes.every((code) => definiteRejectionCodes.has(code))) {
      return unknownResult(correlationId);
    }
    if (result.issue !== null && result.issue !== undefined) return unknownResult(correlationId);

    const needsAttention = errors.codes.some((code) => code !== "RATELIMITED");
    return failedResult(
      needsAttention ? "linear_connection_invalid" : "linear_rate_limited",
      needsAttention
        ? "Linear rejected the connection or destination"
        : "Linear rate limited the request",
      correlationId,
      needsAttention,
    );
  }
  if (!result.success && (result.issue === null || result.issue === undefined)) {
    return failedResult("linear_rejected", "Linear rejected the issue", correlationId);
  }
  return unknownResult(correlationId);
}

export async function findLinearIssue(args: { accessToken: string; issueId: string }) {
  let response: Response;
  try {
    response = await requestLinear(args.accessToken, findIssueQuery, { id: args.issueId });
  } catch {
    return { state: "unknown" as const, needsAttention: false };
  }

  if (response.status === 401 || response.status === 403) {
    return { state: "unknown" as const, needsAttention: true };
  }
  if (!response.ok) return { state: "unknown" as const, needsAttention: false };

  let body: unknown;
  try {
    body = await readBoundedJson(response);
  } catch {
    return { state: "unknown" as const, needsAttention: false };
  }
  if (readGraphQLErrors(body).present || !isRecord(body) || !isRecord(body.data)) {
    return { state: "unknown" as const, needsAttention: false };
  }
  if (body.data.issue === null) {
    return { state: "absent" as const, needsAttention: false };
  }

  const externalIdentity = readIssue(body.data.issue, args.issueId);
  return externalIdentity
    ? { state: "succeeded" as const, externalIdentity, needsAttention: false }
    : { state: "unknown" as const, needsAttention: false };
}
