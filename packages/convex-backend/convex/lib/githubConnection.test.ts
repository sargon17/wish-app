import { exportPKCS8, generateKeyPair } from "jose";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import {
  getGitHubAppAuthConfig,
  getGitHubConfig,
  getGitHubWebhookConfig,
  isGitHubConfigured,
  validateGitHubRedirectUri,
} from "./githubConnection";

afterEach(() => vi.unstubAllEnvs());

describe("GitHub App configuration", () => {
  it("accepts only the fixed callback and complete server configuration", () => {
    vi.stubEnv("GITHUB_APP_CLIENT_ID", "Iv1.client");
    vi.stubEnv("GITHUB_APP_CLIENT_SECRET", "secret");
    vi.stubEnv("GITHUB_APP_SLUG", "wish-work-tracker");
    vi.stubEnv(
      "GITHUB_APP_PRIVATE_KEY",
      "-----BEGIN PRIVATE KEY-----\\na2V5\\n-----END PRIVATE KEY-----",
    );
    vi.stubEnv("GITHUB_APP_REDIRECT_URI", "https://wish.example/work-trackers/github/callback");
    vi.stubEnv("GITHUB_APP_WEBHOOK_SECRET", "a".repeat(32));
    vi.stubEnv(
      "WORK_TRACKER_ENCRYPTION_KEY",
      btoa(String.fromCharCode(...new Uint8Array(32).fill(7))),
    );
    vi.stubEnv("WISH_APP_BASE_URL", "https://wish.example");

    expect(getGitHubConfig()).toMatchObject({
      clientId: "Iv1.client",
      slug: "wish-work-tracker",
      redirectUri: "https://wish.example/work-trackers/github/callback",
      baseUrl: "https://wish.example",
    });
    expect(() =>
      validateGitHubRedirectUri("https://wish.example/work-trackers/github/callback?next=x"),
    ).toThrow("GitHub App redirect URI is invalid");
  });

  it("reports configured only when the PKCS#8 key can be imported", async () => {
    vi.stubEnv("GITHUB_APP_CLIENT_ID", "Iv1.client");
    vi.stubEnv("GITHUB_APP_CLIENT_SECRET", "secret");
    vi.stubEnv("GITHUB_APP_SLUG", "wish-work-tracker");
    vi.stubEnv(
      "GITHUB_APP_PRIVATE_KEY",
      "-----BEGIN PRIVATE KEY-----\na2V5\n-----END PRIVATE KEY-----",
    );
    vi.stubEnv("GITHUB_APP_REDIRECT_URI", "https://wish.example/work-trackers/github/callback");
    vi.stubEnv("GITHUB_APP_WEBHOOK_SECRET", "a".repeat(32));
    vi.stubEnv(
      "WORK_TRACKER_ENCRYPTION_KEY",
      btoa(String.fromCharCode(...new Uint8Array(32).fill(7))),
    );
    vi.stubEnv("WISH_APP_BASE_URL", "https://wish.example");

    await expect(isGitHubConfigured()).resolves.toBe(false);
    const { privateKey } = await generateKeyPair("RS256", { extractable: true });
    vi.stubEnv("GITHUB_APP_PRIVATE_KEY", await exportPKCS8(privateKey));
    await expect(isGitHubConfigured()).resolves.toBe(true);
  });

  it("loads webhook verification independently from OAuth configuration", () => {
    vi.stubEnv("GITHUB_APP_WEBHOOK_SECRET", "w".repeat(32));

    expect(getGitHubWebhookConfig()).toEqual({ webhookSecret: "w".repeat(32) });
  });

  it("loads installation authentication independently from setup configuration", () => {
    vi.stubEnv("GITHUB_APP_CLIENT_ID", "Iv1.client");
    vi.stubEnv(
      "GITHUB_APP_PRIVATE_KEY",
      "-----BEGIN PRIVATE KEY-----\na2V5\n-----END PRIVATE KEY-----",
    );

    expect(getGitHubAppAuthConfig()).toMatchObject({ clientId: "Iv1.client" });
  });

});
