import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import {
  buildGitHubHandoffMarker,
  buildGitHubIssueBody,
  createGitHubIssue,
  findGitHubIssueByHandoff,
} from "./githubIssue";

const repository = { id: "101", owner: "wishco", name: "product" };
const issue = {
  id: 42,
  node_id: "I_42",
  number: 7,
  html_url: "https://github.com/wishco/product/issues/7",
};

afterEach(() => vi.unstubAllGlobals());

describe("GitHub issue delivery", () => {
  it("builds a body with the canonical handoff marker", () => {
    expect(
      buildGitHubIssueBody(
        undefined,
        "https://wish.example/source",
        "handoff-1",
      ),
    ).toBe(
      "[View original in Wish](https://wish.example/source)\n\n<!-- wish-handoff:handoff-1 -->",
    );
  });

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

  it("finds the exact handoff marker in a consistent issue response", async () => {
    const handoffId = "handoff-1";
    const marker = buildGitHubHandoffMarker(handoffId);
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        total_count: 1,
        incomplete_results: false,
        items: [
          {
            ...issue,
            body: `Description\n\n---\n\n${marker}`,
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      findGitHubIssueByHandoff({
        accessToken: "installation-token",
        repository,
        handoffId,
      }),
    ).resolves.toMatchObject({
      state: "succeeded",
      externalIdentity: { identifier: "wishco/product#7" },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const searchUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(searchUrl.pathname).toBe("/search/issues");
    expect(searchUrl.searchParams.get("q")).toBe(
      `repo:wishco/product is:issue in:body "wish-handoff:${handoffId}"`,
    );
  });

  it("rejects contradictory search results and pull requests", async () => {
    const handoffId = "handoff-invalid";
    const marker = buildGitHubHandoffMarker(handoffId);
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        total_count: 1,
        incomplete_results: false,
        items: [
          {
            ...issue,
            html_url: "https://github.com/wishco/product/pull/7",
            body: marker,
            pull_request: {},
          },
          { ...issue, body: marker },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      findGitHubIssueByHandoff({
        accessToken: "installation-token",
        repository,
        handoffId,
      }),
    ).resolves.toEqual({ state: "unknown", needsAttention: false });
  });

  it("does not choose between duplicate handoff markers", async () => {
    const handoffId = "handoff-duplicate";
    const marker = buildGitHubHandoffMarker(handoffId);
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        total_count: 2,
        incomplete_results: false,
        items: [
          { ...issue, body: marker },
          { ...issue, number: 8, html_url: "https://github.com/wishco/product/issues/8", body: marker },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      findGitHubIssueByHandoff({
        accessToken: "installation-token",
        repository,
        handoffId,
      }),
    ).resolves.toEqual({ state: "unknown", needsAttention: false });
  });

  it("keeps uncertain outcomes bounded when the marker is not indexed", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({ total_count: 0, incomplete_results: false, items: [] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      findGitHubIssueByHandoff({
        accessToken: "installation-token",
        repository,
        handoffId: "handoff-missing",
      }),
    ).resolves.toEqual({ state: "unknown", needsAttention: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
