import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { createGitHubIssue, findGitHubIssueBySource } from "./githubIssue";

const repository = { id: "101", owner: "wishco", name: "product" };
const issue = {
  id: 42,
  node_id: "I_42",
  number: 7,
  html_url: "https://github.com/wishco/product/issues/7",
};

afterEach(() => vi.unstubAllGlobals());

describe("GitHub issue delivery", () => {
  it("creates an issue with the minimum payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(issue, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createGitHubIssue({
        accessToken: "installation-token",
        repository,
        title: "Export reports",
        body: "Description with source link",
      }),
    ).resolves.toEqual({
      state: "succeeded",
      needsAttention: false,
      externalIdentity: {
        provider: "github",
        id: "42",
        nodeId: "I_42",
        number: 7,
        repositoryId: "101",
        identifier: "wishco/product#7",
        url: "https://github.com/wishco/product/issues/7",
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/repos/wishco/product/issues",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          title: "Export reports",
          body: "Description with source link",
        }),
      }),
    );
  });

  it("distinguishes unknown outcomes from definite connection failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response(null, { status: 503 }))
        .mockResolvedValueOnce(new Response(null, { status: 410 }))
        .mockResolvedValueOnce(new Response(null, { status: 403 }))
        .mockResolvedValueOnce(
          new Response(null, {
            status: 403,
            headers: { "x-ratelimit-remaining": "0" },
          }),
        ),
    );
    const args = {
      accessToken: "installation-token",
      repository,
      title: "Export reports",
      body: "Description",
    };

    await expect(createGitHubIssue(args)).resolves.toMatchObject({
      state: "unknown",
      needsAttention: false,
    });
    await expect(createGitHubIssue(args)).resolves.toMatchObject({
      state: "failed",
      errorCode: "github_connection_invalid",
      needsAttention: true,
    });
    await expect(createGitHubIssue(args)).resolves.toMatchObject({
      errorCode: "github_connection_invalid",
      needsAttention: true,
    });
    await expect(createGitHubIssue(args)).resolves.toMatchObject({
      errorCode: "github_rate_limited",
      needsAttention: false,
    });
  });

  it("finds the exact Wish source marker and ignores pull requests", async () => {
    const sourceUrl = "https://wish.example/dashboard/project/p/project/requests?item=r";
    const createdAt = new Date().toISOString();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json([
          {
            ...issue,
            number: 6,
            html_url: "https://github.com/wishco/product/issues/6",
            body: `[View original in Wish](${sourceUrl})`,
            created_at: createdAt,
            pull_request: {},
          },
          { body: "First unrelated issue", created_at: createdAt },
          { body: "Second unrelated issue", created_at: createdAt },
        ]),
      )
      .mockResolvedValueOnce(
        Response.json([
          {
            ...issue,
            body: `Description\n\n---\n\n[View original in Wish](${sourceUrl})`,
            created_at: createdAt,
          },
        ]),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      findGitHubIssueBySource({
        accessToken: "installation-token",
        repository,
        sourceUrl,
        startedAt: Date.now() - 1_000,
      }),
    ).resolves.toMatchObject({
      state: "succeeded",
      externalIdentity: { identifier: "wishco/product#7" },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("per_page=3");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("page=2");
  });

  it("confirms absence only after scanning past the creation window", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json([
          {
            ...issue,
            body: "Unrelated issue",
            created_at: new Date(0).toISOString(),
          },
        ]),
      ),
    );

    await expect(
      findGitHubIssueBySource({
        accessToken: "installation-token",
        repository,
        sourceUrl: "https://wish.example/source",
        startedAt: Date.now(),
      }),
    ).resolves.toEqual({ state: "absent", needsAttention: false });
  });
});
