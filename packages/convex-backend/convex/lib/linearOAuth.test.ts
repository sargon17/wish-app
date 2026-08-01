import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import {
  buildLinearAuthorizationUrl,
  createLinearOAuthState,
  hashLinearOAuthState,
  parseLinearDiscoveryPage,
  parseLinearTokenResponse,
  readBoundedJson,
  refreshLinearCredentials,
  revokeLinearCredentials,
} from "./linearOAuth";

afterEach(() => vi.unstubAllGlobals());

describe("Linear OAuth", () => {
  it("builds the minimum app-actor authorization request", async () => {
    const state = createLinearOAuthState();
    const secondState = createLinearOAuthState();
    const url = new URL(
      buildLinearAuthorizationUrl({
        clientId: "linear-client",
        redirectUri: "https://api.example.com/work-trackers/linear/callback",
        state,
      }),
    );

    expect(url.origin + url.pathname).toBe("https://linear.app/oauth/authorize");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      actor: "app",
      client_id: "linear-client",
      redirect_uri: "https://api.example.com/work-trackers/linear/callback",
      response_type: "code",
      scope: "read,issues:create",
      state,
    });
    expect(state).not.toBe(secondState);
    expect(await hashLinearOAuthState(state)).toBe(await hashLinearOAuthState(state));
  });

  it("validates token and discovery responses before persistence", () => {
    expect(
      parseLinearTokenResponse({
        access_token: "access",
        refresh_token: "refresh",
        expires_in: 86_400,
        scope: "read issues:create",
        token_type: "Bearer",
      }),
    ).toMatchObject({ accessToken: "access", refreshToken: "refresh", expiresIn: 86_400 });

    expect(() => parseLinearTokenResponse({ access_token: "access" })).toThrow(
      "Invalid Linear token response",
    );
    expect(() =>
      parseLinearTokenResponse({
        access_token: "access",
        refresh_token: "refresh",
        expires_in: Number.MAX_SAFE_INTEGER,
        scope: "read issues:create",
        token_type: "Bearer",
      }),
    ).toThrow("Invalid Linear token response");

    expect(
      parseLinearDiscoveryPage({
        data: {
          organization: { id: "org", name: "Acme", urlKey: "acme" },
          teams: {
            nodes: [{ id: "team", key: "ENG", name: "Engineering" }],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        },
      }),
    ).toEqual({
      organization: { id: "org", name: "Acme", urlKey: "acme" },
      teams: [{ id: "team", key: "ENG", name: "Engineering" }],
      hasNextPage: false,
      endCursor: undefined,
    });

    expect(() => parseLinearDiscoveryPage({ data: { teams: { nodes: [] } } })).toThrow(
      "Invalid Linear discovery response",
    );
  });

  it("bounds declared and chunked response bodies", async () => {
    await expect(
      readBoundedJson(
        new Response("{}", { headers: { "content-length": "1000001" } }),
      ),
    ).rejects.toThrow("Linear response exceeded the size limit");

    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(1_000_001));
        controller.close();
      },
    });
    await expect(readBoundedJson(new Response(body))).rejects.toThrow(
      "Linear response exceeded the size limit",
    );
  });

  it("distinguishes invalid credentials from transient token and revoke failures", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 }),
      )
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 400 }))
      .mockResolvedValueOnce(new Response(null, { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      refreshLinearCredentials({
        clientId: "client",
        clientSecret: "secret",
        refreshToken: "invalid",
      }),
    ).rejects.toThrow("Linear authorization is invalid");
    await expect(
      refreshLinearCredentials({
        clientId: "client",
        clientSecret: "secret",
        refreshToken: "valid",
      }),
    ).rejects.toThrow("Linear token request failed");
    await expect(revokeLinearCredentials("already-revoked")).resolves.toBeUndefined();
    await expect(revokeLinearCredentials("rate-limited")).rejects.toThrow(
      "Linear credential revocation failed",
    );
  });
});
