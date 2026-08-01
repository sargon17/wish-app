const LINEAR_AUTHORIZE_URL = "https://linear.app/oauth/authorize";
const LINEAR_TOKEN_URL = "https://api.linear.app/oauth/token";
const LINEAR_REVOKE_URL = "https://api.linear.app/oauth/revoke";
const LINEAR_GRAPHQL_URL = "https://api.linear.app/graphql";
const LINEAR_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 1_000_000;
const MAX_TEAM_PAGES = 10;
const MAX_TEAMS = 500;
const MAX_TOKEN_LIFETIME_SECONDS = 365 * 24 * 60 * 60;

const discoveryQuery = `query ConfigureLinearConnection($first: Int!, $after: String) {
  organization { id name urlKey }
  teams(first: $first, after: $after) {
    nodes { id key name }
    pageInfo { hasNextPage endCursor }
  }
}`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function encodeBase64Url(value: Uint8Array) {
  return btoa(String.fromCharCode(...value))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

export function createLinearOAuthState() {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashLinearOAuthState(state: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(state));
  return encodeBase64Url(new Uint8Array(digest));
}

export function buildLinearAuthorizationUrl(args: {
  clientId: string;
  redirectUri: string;
  state: string;
  promptForWorkspace?: boolean;
}) {
  const url = new URL(LINEAR_AUTHORIZE_URL);
  url.search = new URLSearchParams({
    client_id: args.clientId,
    redirect_uri: args.redirectUri,
    response_type: "code",
    scope: "read,issues:create",
    state: args.state,
    actor: "app",
  }).toString();
  if (args.promptForWorkspace) {
    url.searchParams.set("prompt", "consent");
  }
  return url.toString();
}

export function parseLinearTokenResponse(value: unknown) {
  if (!isRecord(value)) {
    throw new Error("Invalid Linear token response");
  }

  const accessToken = readString(value.access_token);
  const refreshToken = readString(value.refresh_token);
  const tokenType = readString(value.token_type);
  const scope = readString(value.scope);
  const expiresIn = value.expires_in;
  const scopes = scope?.split(/[ ,]+/).filter(Boolean) ?? [];

  if (
    !accessToken ||
    !refreshToken ||
    tokenType?.toLowerCase() !== "bearer" ||
    typeof expiresIn !== "number" ||
    !Number.isSafeInteger(expiresIn) ||
    expiresIn <= 0 ||
    expiresIn > MAX_TOKEN_LIFETIME_SECONDS ||
    !scopes.includes("read") ||
    !scopes.includes("issues:create")
  ) {
    throw new Error("Invalid Linear token response");
  }

  return { accessToken, refreshToken, expiresIn, scopes };
}

export function parseLinearDiscoveryPage(value: unknown) {
  if (!isRecord(value) || (Array.isArray(value.errors) && value.errors.length > 0)) {
    throw new Error("Invalid Linear discovery response");
  }

  const data = value.data;
  if (!isRecord(data) || !isRecord(data.organization) || !isRecord(data.teams)) {
    throw new Error("Invalid Linear discovery response");
  }

  const organizationId = readString(data.organization.id);
  const organizationName = readString(data.organization.name);
  const organizationUrlKey = readString(data.organization.urlKey);
  const nodes = data.teams.nodes;
  const pageInfo = data.teams.pageInfo;
  if (
    !organizationId ||
    !organizationName ||
    !organizationUrlKey ||
    !Array.isArray(nodes) ||
    !isRecord(pageInfo) ||
    typeof pageInfo.hasNextPage !== "boolean"
  ) {
    throw new Error("Invalid Linear discovery response");
  }

  const teams = nodes.map((node) => {
    if (!isRecord(node)) {
      throw new Error("Invalid Linear discovery response");
    }
    const id = readString(node.id);
    const key = readString(node.key);
    const name = readString(node.name);
    if (!id || !key || !name) {
      throw new Error("Invalid Linear discovery response");
    }
    return { id, key, name };
  });
  const endCursor = readString(pageInfo.endCursor) ?? undefined;
  if (pageInfo.hasNextPage && !endCursor) {
    throw new Error("Invalid Linear discovery response");
  }

  return {
    organization: { id: organizationId, name: organizationName, urlKey: organizationUrlKey },
    teams,
    hasNextPage: pageInfo.hasNextPage,
    endCursor,
  };
}

export async function readBoundedJson(response: Response) {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
    throw new Error("Linear response exceeded the size limit");
  }

  if (!response.body) {
    throw new Error("Linear returned an invalid response");
  }
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
      throw new Error("Linear response exceeded the size limit");
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("Linear returned an invalid response");
  }
}

async function requestLinearToken(params: URLSearchParams) {
  const response = await fetch(LINEAR_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: params,
    signal: AbortSignal.timeout(LINEAR_TIMEOUT_MS),
  });
  if (!response.ok) {
    let errorCode: string | null = null;
    try {
      const body = await readBoundedJson(response);
      errorCode = isRecord(body) ? readString(body.error) : null;
    } catch {
      // The fixed error below is sufficient for transient and malformed failures.
    }
    if ((response.status === 400 || response.status === 401) && errorCode === "invalid_grant") {
      throw new Error("Linear authorization is invalid");
    }
    throw new Error("Linear token request failed");
  }
  return parseLinearTokenResponse(await readBoundedJson(response));
}

export async function exchangeLinearAuthorizationCode(args: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
}) {
  return await requestLinearToken(
    new URLSearchParams({
      client_id: args.clientId,
      client_secret: args.clientSecret,
      redirect_uri: args.redirectUri,
      code: args.code,
      grant_type: "authorization_code",
    }),
  );
}

export async function refreshLinearCredentials(args: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}) {
  return await requestLinearToken(
    new URLSearchParams({
      client_id: args.clientId,
      client_secret: args.clientSecret,
      refresh_token: args.refreshToken,
      grant_type: "refresh_token",
    }),
  );
}

export async function revokeLinearCredentials(refreshToken: string) {
  const response = await fetch(LINEAR_REVOKE_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token: refreshToken, token_type_hint: "refresh_token" }),
    signal: AbortSignal.timeout(LINEAR_TIMEOUT_MS),
  });
  if (!response.ok && response.status !== 400 && response.status !== 401) {
    throw new Error("Linear credential revocation failed");
  }
}

export async function discoverLinearWorkspace(accessToken: string) {
  let after: string | undefined;
  let organization: ReturnType<typeof parseLinearDiscoveryPage>["organization"] | undefined;
  const teams: ReturnType<typeof parseLinearDiscoveryPage>["teams"] = [];

  for (let page = 0; page < MAX_TEAM_PAGES; page += 1) {
    const response = await fetch(LINEAR_GRAPHQL_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ query: discoveryQuery, variables: { first: 50, after } }),
      signal: AbortSignal.timeout(LINEAR_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(
        response.status === 401 ? "Linear authorization is invalid" : "Linear discovery failed",
      );
    }

    const result = parseLinearDiscoveryPage(await readBoundedJson(response));
    if (organization && organization.id !== result.organization.id) {
      throw new Error("Linear returned an inconsistent workspace");
    }
    organization = result.organization;
    teams.push(...result.teams);
    if (teams.length > MAX_TEAMS) {
      throw new Error("Linear returned too many teams");
    }
    if (!result.hasNextPage) {
      return { organization, teams };
    }
    after = result.endCursor;
  }

  throw new Error("Linear team pagination exceeded the limit");
}
