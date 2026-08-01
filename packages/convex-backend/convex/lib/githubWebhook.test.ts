import { describe, expect, it } from "vite-plus/test";

import {
  parseGitHubWebhook,
  readGitHubWebhookBody,
  verifyGitHubWebhookSignature,
} from "./githubWebhook";

function hex(value: Uint8Array) {
  return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

describe("GitHub webhooks", () => {
  it("verifies the raw body and extracts connection-invalidating events", async () => {
    const secret = "s".repeat(32);
    const body = new TextEncoder().encode('{"action":"suspend"}');
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, body));

    await expect(
      verifyGitHubWebhookSignature(secret, body, `sha256=${hex(signature)}`),
    ).resolves.toBe(true);
    await expect(
      verifyGitHubWebhookSignature(secret, body, `sha256=${"0".repeat(64)}`),
    ).resolves.toBe(false);
    expect(
      parseGitHubWebhook(
        { action: "suspend", installation: { id: 7 } },
        "installation",
      ),
    ).toEqual({ kind: "installation_unavailable", installationId: "7" });
    expect(
      parseGitHubWebhook(
        {
          installation: { id: 7 },
          repositories_removed: [{ id: 42 }, { id: 43 }],
        },
        "installation_repositories",
      ),
    ).toEqual({
      kind: "repositories_removed",
      installationId: "7",
      repositoryIds: ["42", "43"],
    });
    expect(
      parseGitHubWebhook(
        { action: "revoked", sender: { login: "owner" } },
        "github_app_authorization",
      ),
    ).toEqual({ kind: "ignored" });
  });

  it("rejects a body before buffering beyond the limit", async () => {
    const request = new Request("https://wish.example/work-trackers/github/webhook", {
      method: "POST",
      body: "12345",
    });
    await expect(readGitHubWebhookBody(request, 4)).rejects.toThrow(
      "GitHub webhook payload exceeded the size limit",
    );
  });
});
