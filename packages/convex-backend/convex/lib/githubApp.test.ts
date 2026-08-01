import { decodeJwt, exportPKCS8, generateKeyPair } from "jose";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import {
  buildGitHubInstallationUrl,
  createGitHubAppJwt,
  discoverGitHubInstallation,
  exchangeGitHubUserCode,
  parseGitHubRepositoryPage,
  revokeGitHubUserCredentials,
} from "./githubApp";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const repository = {
  id: 42,
  node_id: "R_repo",
  owner: { login: "acme" },
  name: "product",
  full_name: "acme/product",
  html_url: "https://github.com/acme/product",
  has_issues: true,
  archived: false,
  disabled: false,
};

describe("GitHub App API", () => {
  it("builds the installation URL and validates repository facts", () => {
    expect(
      buildGitHubInstallationUrl({ slug: "wish-work-tracker", state: "state-value" }),
    ).toBe(
      "https://github.com/apps/wish-work-tracker/installations/new?state=state-value",
    );
    expect(parseGitHubRepositoryPage({ repositories: [repository] })).toEqual({
      repositories: [
        {
          id: "42",
          nodeId: "R_repo",
          owner: "acme",
          name: "product",
          fullName: "acme/product",
          url: "https://github.com/acme/product",
        },
      ],
      pageSize: 1,
    });
    expect(
      parseGitHubRepositoryPage({ repositories: [{ ...repository, archived: true }] }),
    ).toEqual({ repositories: [], pageSize: 1 });
  });

  it("exchanges a temporary user code and verifies the installation before listing repositories", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          access_token: "user-token",
          expires_in: 28_800,
          refresh_token: "refresh-token",
          refresh_token_expires_in: 15_897_600,
          token_type: "bearer",
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          installations: [
            {
              id: 7,
              account: { login: "acme" },
              suspended_at: null,
              permissions: { issues: "write" },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(Response.json({ repositories: [repository] }));
    vi.stubGlobal("fetch", fetchMock);

    const credentials = await exchangeGitHubUserCode({
      clientId: "client",
      clientSecret: "secret",
      code: "code",
      redirectUri: "https://wish.example/work-trackers/github/callback",
    });
    await expect(
      discoverGitHubInstallation({
        accessToken: credentials.accessToken,
        installationId: "7",
      }),
    ).resolves.toEqual({
      installationId: "7",
      accountLogin: "acme",
      repositories: [expect.objectContaining({ id: "42", fullName: "acme/product" })],
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("falls back to explicit credential revocation when the access token cannot delete the grant", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);

    await revokeGitHubUserCredentials({
      clientId: "Iv1.client",
      clientSecret: "secret",
      credentials: { accessToken: "user-token", refreshToken: "refresh-token" },
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://api.github.com/applications/Iv1.client/grant",
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ access_token: "user-token" }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.github.com/credentials/revoke",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ credentials: ["refresh-token", "user-token"] }),
      }),
    );
  });

  it("rejects a spoofed callback installation", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ installations: [] })));
    await expect(
      discoverGitHubInstallation({ accessToken: "user-token", installationId: "7" }),
    ).rejects.toThrow("GitHub installation is not available to this user");
  });

  it("signs app JWTs with the configured client ID", async () => {
    const { privateKey } = await generateKeyPair("RS256", { extractable: true });
    const token = await createGitHubAppJwt(
      {
        clientId: "Iv1.client",
        privateKey: await exportPKCS8(privateKey),
      },
      1_800_000,
    );

    expect(decodeJwt(token)).toMatchObject({ iss: "Iv1.client" });
  });
});
