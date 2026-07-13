import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { createLinearIssue, findLinearIssue } from "./linearIssue";

afterEach(() => vi.unstubAllGlobals());

describe("Linear issue delivery", () => {
  it("creates an issue with the preallocated id and minimum payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        data: {
          issueCreate: {
            success: true,
            issue: {
              id: "issue-id",
              identifier: "ENG-42",
              url: "https://linear.app/acme/issue/ENG-42/export-reports",
            },
          },
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createLinearIssue({
        accessToken: "access-token",
        issueId: "issue-id",
        teamId: "team-id",
        title: "Export reports",
        description: "Description with source link",
      }),
    ).resolves.toEqual({
      state: "succeeded",
      needsAttention: false,
      externalIdentity: {
        provider: "linear",
        id: "issue-id",
        identifier: "ENG-42",
        url: "https://linear.app/acme/issue/ENG-42/export-reports",
      },
    });

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(request.headers).toEqual({
      authorization: "Bearer access-token",
      "content-type": "application/json",
    });
    expect(JSON.parse(String(request.body))).toMatchObject({
      variables: {
        input: {
          id: "issue-id",
          teamId: "team-id",
          title: "Export reports",
          description: "Description with source link",
        },
      },
    });
    expect(String(request.body)).not.toContain("requester");
    expect(String(request.body)).not.toContain("clientId");
  });

  it("allows retry only for definite provider rejections", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response(null, { status: 401 }))
        .mockResolvedValueOnce(new Response(null, { status: 429 }))
        .mockResolvedValueOnce(new Response(null, { status: 503 }))
        .mockResolvedValueOnce(
          Response.json({ errors: [{ extensions: { code: "INTERNAL_ERROR" } }] }),
        ),
    );

    const args = {
      accessToken: "access",
      issueId: "issue-id",
      teamId: "team-id",
      title: "Export reports",
      description: "Description",
    };
    await expect(createLinearIssue(args)).resolves.toMatchObject({
      state: "failed",
      errorCode: "linear_connection_invalid",
      needsAttention: true,
    });
    await expect(createLinearIssue(args)).resolves.toMatchObject({
      state: "failed",
      errorCode: "linear_rate_limited",
      needsAttention: false,
    });
    await expect(createLinearIssue(args)).resolves.toMatchObject({ state: "unknown" });
    await expect(createLinearIssue(args)).resolves.toMatchObject({ state: "unknown" });
  });

  it("treats malformed and contradictory success responses as unknown", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response("not-json"))
        .mockResolvedValueOnce(
          Response.json({
            data: {
              issueCreate: {
                success: true,
                issue: {
                  id: "different-id",
                  identifier: "ENG-42",
                  url: "https://linear.app/acme/issue/ENG-42",
                },
              },
            },
          }),
        )
        .mockResolvedValueOnce(
          Response.json({
            errors: [{ message: "Unexpected provider error" }],
            data: {
              issueCreate: {
                success: true,
                issue: {
                  id: "issue-id",
                  identifier: "ENG-42",
                  url: "https://linear.app/acme/issue/ENG-42",
                },
              },
            },
          }),
        )
        .mockResolvedValueOnce(
          Response.json({
            errors: [{ extensions: { code: "FORBIDDEN" } }],
            data: {
              issueCreate: {
                success: true,
                issue: {
                  id: "issue-id",
                  identifier: "ENG-42",
                  url: "https://linear.app/acme/issue/ENG-42",
                },
              },
            },
          }),
        ),
    );

    const args = {
      accessToken: "access",
      issueId: "issue-id",
      teamId: "team-id",
      title: "Export reports",
      description: "Description",
    };
    await expect(createLinearIssue(args)).resolves.toMatchObject({ state: "unknown" });
    await expect(createLinearIssue(args)).resolves.toMatchObject({ state: "unknown" });
    await expect(createLinearIssue(args)).resolves.toMatchObject({ state: "unknown" });
    await expect(createLinearIssue(args)).resolves.toMatchObject({ state: "succeeded" });
  });

  it("reconciles a matching issue and distinguishes a confirmed absence", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json({
            data: {
              issue: {
                id: "issue-id",
                identifier: "ENG-42",
                url: "https://linear.app/acme/issue/ENG-42",
              },
            },
          }),
        )
        .mockResolvedValueOnce(Response.json({ data: { issue: null } })),
    );

    await expect(findLinearIssue({ accessToken: "access", issueId: "issue-id" })).resolves.toEqual({
      state: "succeeded",
      needsAttention: false,
      externalIdentity: {
        provider: "linear",
        id: "issue-id",
        identifier: "ENG-42",
        url: "https://linear.app/acme/issue/ENG-42",
      },
    });
    await expect(findLinearIssue({ accessToken: "access", issueId: "issue-id" })).resolves.toEqual({
      state: "absent",
      needsAttention: false,
    });
  });
});
