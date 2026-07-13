import { importPKCS8 } from "jose";

import {
  getWorkTrackerEncryptionKey,
  getWishAppBaseUrl,
} from "./workTrackerConfig";

export const GITHUB_SETUP_STATE_TTL_MS = 10 * 60 * 1000;
export const GITHUB_READY_SETUP_TTL_MS = 30 * 60 * 1000;
export const GITHUB_REVOCATION_RETRY_MS = 5 * 60 * 1000;
export const GITHUB_CALLBACK_CLAIM_TTL_MS = 60 * 1000;

function isPkcs8PrivateKey(value: string | undefined): value is string {
  return Boolean(
    value &&
      /^-----BEGIN PRIVATE KEY-----\n(?:[A-Za-z0-9+/=]+\n?)+-----END PRIVATE KEY-----$/.test(
        value,
      ),
  );
}

export function validateGitHubRedirectUri(value: string) {
  try {
    const url = new URL(value);
    const localHttp = url.protocol === "http:" && url.hostname === "localhost";
    if (
      (url.protocol !== "https:" && !localHttp) ||
      url.pathname !== "/work-trackers/github/callback" ||
      url.search ||
      url.hash ||
      url.username ||
      url.password
    ) {
      throw new Error();
    }
    return url.toString();
  } catch {
    throw new Error("GitHub App redirect URI is invalid");
  }
}

export function getGitHubConfig() {
  const revocation = getGitHubRevocationConfig();
  const appAuth = getGitHubAppAuthConfig();
  const { webhookSecret } = getGitHubWebhookConfig();
  const slug = process.env.GITHUB_APP_SLUG?.trim();
  const redirectUri = process.env.GITHUB_APP_REDIRECT_URI?.trim();
  if (
    !slug ||
    !/^[a-z0-9-]+$/.test(slug) ||
    !redirectUri
  ) {
    throw new Error("GitHub App is not configured");
  }
  return {
    ...revocation,
    ...appAuth,
    slug,
    redirectUri: validateGitHubRedirectUri(redirectUri),
    webhookSecret,
    baseUrl: getWishAppBaseUrl(),
  };
}

export function getGitHubAppAuthConfig() {
  const clientId = process.env.GITHUB_APP_CLIENT_ID?.trim();
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY?.replaceAll("\\r\\n", "\n")
    .replaceAll("\\n", "\n")
    .replaceAll("\r\n", "\n")
    .trim();
  if (!clientId || !isPkcs8PrivateKey(privateKey)) {
    throw new Error("GitHub App authentication is not configured");
  }
  return { clientId, privateKey };
}

export function getGitHubWebhookConfig() {
  const webhookSecret = process.env.GITHUB_APP_WEBHOOK_SECRET?.trim();
  if (!webhookSecret || webhookSecret.length < 32) {
    throw new Error("GitHub App webhook is not configured");
  }
  return { webhookSecret };
}

export function getGitHubRevocationConfig() {
  const clientId = process.env.GITHUB_APP_CLIENT_ID?.trim();
  const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("GitHub App revocation is not configured");
  }
  return {
    clientId,
    clientSecret,
    encryptionKey: getWorkTrackerEncryptionKey(),
  };
}

export async function validateGitHubPrivateKey(privateKey: string) {
  await importPKCS8(privateKey, "RS256");
}

export async function isGitHubConfigured() {
  try {
    const config = getGitHubConfig();
    await validateGitHubPrivateKey(config.privateKey);
    return true;
  } catch {
    return false;
  }
}

export function isGitHubHandoffCreationEnabled() {
  return process.env.GITHUB_HANDOFF_CREATION_ENABLED?.trim().toLowerCase() === "true";
}
