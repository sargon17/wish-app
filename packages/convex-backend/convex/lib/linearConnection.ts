import {
  getWorkTrackerEncryptionKey,
  validateWishAppBaseUrl,
} from "./workTrackerConfig";

export const LINEAR_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
export const LINEAR_AUTHORIZED_SETUP_TTL_MS = 30 * 60 * 1000;
export const LINEAR_REFRESH_EARLY_MS = 7 * 60 * 1000;
export const LINEAR_CREDENTIAL_LEASE_MS = 30 * 1000;

export function validateLinearRedirectUri(value: string) {
  try {
    const url = new URL(value);
    const localHttp = url.protocol === "http:" && url.hostname === "localhost";
    if (
      (url.protocol !== "https:" && !localHttp) ||
      url.pathname !== "/work-trackers/linear/callback" ||
      url.search ||
      url.hash ||
      url.username ||
      url.password
    ) {
      throw new Error();
    }
    return url.toString();
  } catch {
    throw new Error("Linear OAuth redirect URI is invalid");
  }
}

export function getLinearConfig() {
  const clientId = process.env.LINEAR_CLIENT_ID?.trim();
  const clientSecret = process.env.LINEAR_CLIENT_SECRET?.trim();
  const redirectUri = process.env.LINEAR_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Linear OAuth is not configured");
  }
  const baseUrl = validateWishAppBaseUrl(process.env.WISH_APP_BASE_URL?.trim() ?? "");
  return {
    clientId,
    clientSecret,
    redirectUri: validateLinearRedirectUri(redirectUri),
    encryptionKey: getWorkTrackerEncryptionKey(),
    baseUrl,
  };
}

export function isLinearHandoffCreationEnabled() {
  return process.env.LINEAR_HANDOFF_CREATION_ENABLED?.trim().toLowerCase() === "true";
}

export function isLinearConfigured() {
  try {
    getLinearConfig();
    return true;
  } catch {
    return false;
  }
}

export function parseStoredCredentials(value: string) {
  try {
    const credentials = JSON.parse(value) as Record<string, unknown>;
    if (
      typeof credentials.accessToken === "string" &&
      credentials.accessToken.length > 0 &&
      typeof credentials.refreshToken === "string" &&
      credentials.refreshToken.length > 0 &&
      typeof credentials.expiresAt === "number" &&
      Number.isSafeInteger(credentials.expiresAt) &&
      credentials.expiresAt > 0 &&
      Array.isArray(credentials.scopes) &&
      credentials.scopes.every((scope) => typeof scope === "string") &&
      credentials.scopes.includes("read") &&
      credentials.scopes.includes("issues:create")
    ) {
      return {
        accessToken: credentials.accessToken,
        refreshToken: credentials.refreshToken,
        expiresAt: credentials.expiresAt,
        scopes: credentials.scopes as string[],
      };
    }
  } catch {
    // Use the stable error below without leaking secret contents.
  }
  throw new Error("Invalid stored Linear credentials");
}

export function serializeCredentials(
  credentials: { accessToken: string; refreshToken: string; expiresIn: number; scopes: string[] },
  now: number,
) {
  return JSON.stringify({
    accessToken: credentials.accessToken,
    refreshToken: credentials.refreshToken,
    expiresAt: now + credentials.expiresIn * 1000,
    scopes: credentials.scopes,
  });
}
