import { importPKCS8, SignJWT } from "jose";

import type { getGitHubAppAuthConfig } from "./githubConnection";

export const GITHUB_API_URL = "https://api.github.com";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
export const GITHUB_API_VERSION = "2026-03-10";
export const GITHUB_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 1_000_000;
const MAX_PAGES = 10;

export class GitHubInstallationTokenError extends Error {
  constructor(public readonly needsAttention: boolean) {
    super("GitHub installation token request failed");
    this.name = "GitHubInstallationTokenError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readId(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? String(value)
    : null;
}

export async function readGitHubJson(response: Response) {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
    throw new Error("GitHub response exceeded the size limit");
  }
  if (!response.body) throw new Error("GitHub returned an invalid response");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let byteLength = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteLength += value.byteLength;
    if (byteLength > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("GitHub response exceeded the size limit");
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("GitHub returned an invalid response");
  }
}

export function githubHeaders(token: string) {
  return {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${token}`,
    "x-github-api-version": GITHUB_API_VERSION,
    "user-agent": "Wish-Work-Tracker",
  };
}

export function isGitHubRateLimitedResponse(response: Response) {
  return (
    response.status === 429 ||
    (response.status === 403 &&
      (response.headers.get("x-ratelimit-remaining") === "0" ||
        response.headers.has("retry-after")))
  );
}

async function githubGet(path: string, token: string) {
  const response = await fetch(`${GITHUB_API_URL}${path}`, {
    headers: githubHeaders(token),
    signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error("GitHub request failed");
  return await readGitHubJson(response);
}

function parseRepository(value: unknown) {
  if (!isRecord(value) || !isRecord(value.owner)) {
    throw new Error("Invalid GitHub repository response");
  }
  const id = readId(value.id);
  const nodeId = readString(value.node_id);
  const owner = readString(value.owner.login);
  const name = readString(value.name);
  const fullName = readString(value.full_name);
  const url = readString(value.html_url);
  if (
    !id ||
    !nodeId ||
    !owner ||
    !name ||
    !fullName ||
    !url ||
    typeof value.has_issues !== "boolean" ||
    typeof value.archived !== "boolean" ||
    typeof value.disabled !== "boolean"
  ) {
    throw new Error("Invalid GitHub repository response");
  }
  return {
    repository: { id, nodeId, owner, name, fullName, url },
    available: value.has_issues && !value.archived && !value.disabled,
  };
}

export function parseGitHubRepositoryPage(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.repositories)) {
    throw new Error("Invalid GitHub repository response");
  }
  const repositories = value.repositories
    .map(parseRepository)
    .filter((candidate) => candidate.available)
    .map((candidate) => candidate.repository);
  return { repositories, pageSize: value.repositories.length };
}

export function buildGitHubInstallationUrl(args: { slug: string; state: string }) {
  const url = new URL(`https://github.com/apps/${args.slug}/installations/new`);
  url.searchParams.set("state", args.state);
  return url.toString();
}

export async function exchangeGitHubUserCode(args: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}) {
  const response = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: args.clientId,
      client_secret: args.clientSecret,
      code: args.code,
      redirect_uri: args.redirectUri,
    }),
    signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error("GitHub authorization exchange failed");
  const value = await readGitHubJson(response);
  if (!isRecord(value) || readString(value.token_type)?.toLowerCase() !== "bearer") {
    throw new Error("Invalid GitHub token response");
  }
  const accessToken = readString(value.access_token);
  const refreshToken =
    value.refresh_token === undefined ? undefined : readString(value.refresh_token);
  if (!accessToken || (value.refresh_token !== undefined && !refreshToken)) {
    throw new Error("Invalid GitHub token response");
  }
  return { accessToken, ...(refreshToken ? { refreshToken } : {}) };
}

export async function revokeGitHubUserCredentials(args: {
  clientId: string;
  clientSecret: string;
  credentials: { accessToken: string; refreshToken?: string };
}) {
  try {
    const grantResponse = await fetch(
      `${GITHUB_API_URL}/applications/${args.clientId}/grant`,
      {
        method: "DELETE",
        headers: {
          accept: "application/vnd.github+json",
          authorization: `Basic ${btoa(`${args.clientId}:${args.clientSecret}`)}`,
          "content-type": "application/json",
          "x-github-api-version": GITHUB_API_VERSION,
          "user-agent": "Wish-Work-Tracker",
        },
        body: JSON.stringify({ access_token: args.credentials.accessToken }),
        signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
      },
    );
    if (grantResponse.status === 204) return;
  } catch {
    await revokeGitHubCredentials(args.credentials);
    return;
  }

  await revokeGitHubCredentials(args.credentials);
}

export async function revokeGitHubCredentials(credentials: {
  accessToken: string;
  refreshToken?: string;
}) {
  const credentialResponse = await fetch(`${GITHUB_API_URL}/credentials/revoke`, {
    method: "POST",
    headers: {
      accept: "application/vnd.github+json",
      "content-type": "application/json",
      "x-github-api-version": GITHUB_API_VERSION,
      "user-agent": "Wish-Work-Tracker",
    },
    body: JSON.stringify({
      credentials: [
        ...(credentials.refreshToken ? [credentials.refreshToken] : []),
        credentials.accessToken,
      ],
    }),
    signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
  });
  if (credentialResponse.status !== 202) {
    throw new Error("GitHub user credential revocation failed");
  }
}

export function parseGitHubUserCredentials(value: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("Invalid encrypted GitHub user credentials");
  }
  if (!isRecord(parsed)) throw new Error("Invalid encrypted GitHub user credentials");
  const accessToken = readString(parsed.accessToken);
  const refreshToken =
    parsed.refreshToken === undefined ? undefined : readString(parsed.refreshToken);
  if (!accessToken || (parsed.refreshToken !== undefined && !refreshToken)) {
    throw new Error("Invalid encrypted GitHub user credentials");
  }
  return { accessToken, ...(refreshToken ? { refreshToken } : {}) };
}

export async function discoverGitHubInstallation(args: {
  accessToken: string;
  installationId: string;
}) {
  if (!/^\d+$/.test(args.installationId)) {
    throw new Error("Invalid GitHub installation");
  }
  let accountLogin: string | null = null;
  for (let page = 1; page <= MAX_PAGES && !accountLogin; page += 1) {
    const value = await githubGet(
      `/user/installations?per_page=100&page=${page}`,
      args.accessToken,
    );
    if (!isRecord(value) || !Array.isArray(value.installations)) {
      throw new Error("Invalid GitHub installation response");
    }
    for (const installation of value.installations) {
      if (!isRecord(installation) || !isRecord(installation.account)) continue;
      if (
        readId(installation.id) === args.installationId &&
        installation.suspended_at === null &&
        isRecord(installation.permissions) &&
        installation.permissions.issues === "write"
      ) {
        accountLogin = readString(installation.account.login);
        break;
      }
    }
    if (value.installations.length < 100) break;
    if (page === MAX_PAGES) throw new Error("GitHub installation list is too large");
  }
  if (!accountLogin) throw new Error("GitHub installation is not available to this user");

  const repositories = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const value = await githubGet(
      `/user/installations/${args.installationId}/repositories?per_page=100&page=${page}`,
      args.accessToken,
    );
    const parsed = parseGitHubRepositoryPage(value);
    repositories.push(...parsed.repositories);
    if (parsed.pageSize < 100) break;
    if (page === MAX_PAGES) throw new Error("GitHub repository list is too large");
  }
  return { installationId: args.installationId, accountLogin, repositories };
}

export async function createGitHubAppJwt(
  config: ReturnType<typeof getGitHubAppAuthConfig>,
  now = Date.now(),
) {
  const key = await importPKCS8(config.privateKey, "RS256");
  const issuedAt = Math.floor(now / 1000) - 30;
  return await new SignJWT({})
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + 9 * 60)
    .setIssuer(config.clientId)
    .sign(key);
}

export async function createGitHubInstallationToken(args: {
  config: ReturnType<typeof getGitHubAppAuthConfig>;
  installationId: string;
  repositoryIds?: string[];
}) {
  if (
    !/^\d+$/.test(args.installationId) ||
    args.repositoryIds?.some((id) => !/^\d+$/.test(id))
  ) {
    throw new Error("Invalid GitHub installation token request");
  }
  const jwt = await createGitHubAppJwt(args.config);
  const response = await fetch(
    `${GITHUB_API_URL}/app/installations/${args.installationId}/access_tokens`,
    {
      method: "POST",
      headers: { ...githubHeaders(jwt), "content-type": "application/json" },
      body: JSON.stringify({
        permissions: { issues: "write" },
        ...(args.repositoryIds
          ? { repository_ids: args.repositoryIds.map((id) => Number(id)) }
          : {}),
      }),
      signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
    },
  );
  if (!response.ok) {
    throw new GitHubInstallationTokenError(
      !isGitHubRateLimitedResponse(response) &&
        (response.status === 403 || response.status === 404 || response.status === 410),
    );
  }
  const value = await readGitHubJson(response);
  const token = isRecord(value) ? readString(value.token) : null;
  if (!token) throw new Error("Invalid GitHub installation token response");
  return token;
}

export async function listGitHubInstallationRepositories(accessToken: string) {
  const repositories = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const value = await githubGet(
      `/installation/repositories?per_page=100&page=${page}`,
      accessToken,
    );
    const parsed = parseGitHubRepositoryPage(value);
    repositories.push(...parsed.repositories);
    if (parsed.pageSize < 100) break;
    if (page === MAX_PAGES) throw new Error("GitHub repository list is too large");
  }
  return repositories;
}
