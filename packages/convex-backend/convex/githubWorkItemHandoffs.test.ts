import { convexTest } from "convex-test";
import { exportPKCS8, generateKeyPair } from "jose";
import { afterEach, beforeAll, describe, expect, it, vi } from "vite-plus/test";

import { api, internal } from "./_generated/api";
import { buildGitHubHandoffMarker } from "./lib/githubIssue";
import schema from "./schema";

const modules = {
  "./_generated/server.ts": () => import("./_generated/server"),
  "./githubWorkItemHandoffs.ts": () => import("./githubWorkItemHandoffs"),
  "./workItemHandoffs.ts": () => import("./workItemHandoffs"),
};

let privateKey = "";

beforeAll(async () => {
  const keyPair = await generateKeyPair("RS256", { extractable: true });
  privateKey = await exportPKCS8(keyPair.privateKey);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function seed() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      name: "Owner",
      tokenIdentifier: "owner-token",
    });
    const projectId = await ctx.db.insert("projects", {
      title: "Project",
      projectSlug: "project",
      user: userId,
    });
    const statusId = await ctx.db.insert("requestStatuses", {
      name: "open",
      displayName: "Open",
      project: projectId,
      type: "custom",
    });
    const requestId = await ctx.db.insert("requests", {
      text: "Export reports",
      description: "Let customers export reports",
      clientId: "client",
      status: statusId,
      project: projectId,
    });
    const connectionId = await ctx.db.insert("workTrackerConnections", {
      projectId,
      provider: "github",
      health: "active",
      destinationLabel: "wishco/product",
      data: {
        provider: "github",
        installationId: "501",
        accountLogin: "wishco",
        repository: {
          id: "101",
          nodeId: "R_101",
          owner: "wishco",
          name: "product",
          fullName: "wishco/product",
          url: "https://github.com/wishco/product",
        },
      },
      createdBy: userId,
      createdAt: 1,
      updatedAt: 1,
    });
    return { connectionId, projectId, requestId };
  });
  vi.stubEnv("GITHUB_APP_CLIENT_ID", "Iv1.client");
  vi.stubEnv("GITHUB_APP_PRIVATE_KEY", privateKey);
  vi.stubEnv("GITHUB_HANDOFF_CREATION_ENABLED", "true");
  vi.stubEnv("WISH_APP_BASE_URL", "https://wish.example");
  return { ids, owner: t.withIdentity({ tokenIdentifier: "owner-token" }), t };
}

function issueResponse() {
  return Response.json(
    {
      id: 42,
      node_id: "I_42",
      number: 7,
      html_url: "https://github.com/wishco/product/issues/7",
    },
    { status: 201 },
  );
}

describe("GitHub Work Item Handoff delivery", () => {
  it("creates once and persists the GitHub issue link", async () => {
    const { ids, owner } = await seed();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ token: "installation-token" }))
      .mockResolvedValueOnce(issueResponse());
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const args = {
      projectId: ids.projectId,
      requestId: ids.requestId,
      provider: "github" as const,
    };

    const first = await owner.action(api.workItemHandoffs.send, args);
    const second = await owner.action(api.workItemHandoffs.send, args);

    expect(first.lifecycle).toMatchObject({
      state: "succeeded",
      externalIdentity: {
        provider: "github",
        identifier: "wishco/product#7",
        url: "https://github.com/wishco/product/issues/7",
      },
    });
    expect(second._id).toBe(first._id);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const body = String(fetchMock.mock.calls[1]?.[1]?.body);
    expect(body).toContain("[View original in Wish](https://wish.example/dashboard/project/");
    expect(body).toContain(buildGitHubHandoffMarker(first._id));
    expect(body).not.toContain("client");
  });

  it("never repeats an uncertain creation and reconciles by the handoff marker", async () => {
    const { ids, owner } = await seed();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ token: "installation-token" }))
      .mockResolvedValueOnce(new Response(null, { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const args = {
      projectId: ids.projectId,
      requestId: ids.requestId,
      provider: "github" as const,
    };

    const first = await owner.action(api.workItemHandoffs.send, args);
    const second = await owner.action(api.workItemHandoffs.send, args);
    expect(first.lifecycle.state).toBe("unknown");
    expect(second.lifecycle.state).toBe("unknown");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fetchMock
      .mockResolvedValueOnce(Response.json({ token: "installation-token" }))
      .mockResolvedValueOnce(
        Response.json({
          total_count: 1,
          incomplete_results: false,
          items: [
            {
              id: 42,
              node_id: "I_42",
              number: 7,
              html_url: "https://github.com/wishco/product/issues/7",
              body: buildGitHubHandoffMarker(first._id),
            },
          ],
        }),
      );

    await expect(owner.action(api.workItemHandoffs.check, args)).resolves.toMatchObject({
      lifecycle: { state: "succeeded" },
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("schedules the next reconciliation after a transient token failure", async () => {
    const { ids, owner } = await seed();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ token: "installation-token" }))
      .mockResolvedValueOnce(new Response(null, { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const args = {
      projectId: ids.projectId,
      requestId: ids.requestId,
      provider: "github" as const,
    };
    const handoff = await owner.action(api.workItemHandoffs.send, args);
    expect(handoff.lifecycle.state).toBe("unknown");
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));

    await expect(owner.action(api.workItemHandoffs.check, args)).resolves.toMatchObject({
      reconciliationCount: 1,
      lifecycle: { state: "unknown" },
    });
  });

  it("reconciles against current repository metadata after a rename", async () => {
    const { ids, owner, t } = await seed();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ token: "installation-token" }))
      .mockResolvedValueOnce(new Response(null, { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const args = {
      projectId: ids.projectId,
      requestId: ids.requestId,
      provider: "github" as const,
    };
    const handoff = await owner.action(api.workItemHandoffs.send, args);
    await t.run(async (ctx) => {
      const connection = await ctx.db.get(ids.connectionId);
      if (!connection || connection.data.provider !== "github") {
        throw new Error("Expected GitHub connection");
      }
      await ctx.db.patch(connection._id, {
        destinationLabel: "wishhq/renamed",
        data: {
          ...connection.data,
          repository: {
            ...connection.data.repository,
            owner: "wishhq",
            name: "renamed",
            fullName: "wishhq/renamed",
            url: "https://github.com/wishhq/renamed",
          },
        },
        updatedAt: connection.updatedAt + 1,
      });
    });
    fetchMock
      .mockResolvedValueOnce(Response.json({ token: "installation-token" }))
      .mockResolvedValueOnce(
        Response.json({
          total_count: 1,
          incomplete_results: false,
          items: [
            {
              id: 42,
              node_id: "I_42",
              number: 7,
              html_url: "https://github.com/wishhq/renamed/issues/7",
              body: buildGitHubHandoffMarker(handoff._id),
            },
          ],
        }),
      );

    await expect(owner.action(api.workItemHandoffs.check, args)).resolves.toMatchObject({
      lifecycle: {
        state: "succeeded",
        externalIdentity: { identifier: "wishhq/renamed#7" },
      },
    });
    expect(String(fetchMock.mock.calls[3]?.[0])).toContain("/search/issues");
  });

  it("marks the connection when GitHub rejects repository access", async () => {
    const { ids, owner, t } = await seed();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(Response.json({ token: "installation-token" }))
        .mockResolvedValueOnce(new Response(null, { status: 410 })),
    );
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    await expect(
      owner.action(api.workItemHandoffs.send, {
        projectId: ids.projectId,
        requestId: ids.requestId,
        provider: "github",
      }),
    ).resolves.toMatchObject({ lifecycle: { state: "failed" } });
    await expect(t.run(async (ctx) => ctx.db.get(ids.connectionId))).resolves.toMatchObject({
      health: "needs_attention",
    });
  });

  it("marks the connection when GitHub rejects installation-token access", async () => {
    const { ids, owner, t } = await seed();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));

    await expect(
      owner.action(api.workItemHandoffs.send, {
        projectId: ids.projectId,
        requestId: ids.requestId,
        provider: "github",
      }),
    ).resolves.toMatchObject({ lifecycle: { state: "failed" } });
    await expect(t.run(async (ctx) => ctx.db.get(ids.connectionId))).resolves.toMatchObject({
      health: "needs_attention",
    });
  });

  it("does not mark a repaired connection from a stale delivery result", async () => {
    const { ids, t } = await seed();
    const connection = await t.run(async (ctx) => ctx.db.get(ids.connectionId));
    if (!connection || connection.data.provider !== "github") {
      throw new Error("Expected GitHub connection");
    }
    await t.run(async (ctx) => {
      await ctx.db.patch(connection._id, {
        health: "active",
        updatedAt: connection.updatedAt + 1,
      });
    });

    await expect(
      t.mutation(internal.githubWorkItemHandoffs.markConnectionNeedsAttentionInternal, {
        connectionId: connection._id,
        installationId: connection.data.installationId,
        repositoryId: connection.data.repository.id,
        connectionUpdatedAt: connection.updatedAt,
      }),
    ).resolves.toBe(false);
    await expect(t.run(async (ctx) => ctx.db.get(connection._id))).resolves.toMatchObject({
      health: "active",
    });
  });
});
