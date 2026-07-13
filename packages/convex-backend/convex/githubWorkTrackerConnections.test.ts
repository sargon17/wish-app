import { convexTest } from "convex-test";
import { exportPKCS8, generateKeyPair } from "jose";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { api, internal } from "./_generated/api";
import { unresolvedWorkItemHandoffError } from "./lib/workTrackerErrors";
import { hashWorkTrackerOAuthState } from "./lib/workTrackerOAuthState";
import schema from "./schema";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const modules = {
  "./_generated/server.ts": () => import("./_generated/server"),
  "./githubWorkTrackerConnections.ts": () => import("./githubWorkTrackerConnections"),
  "./githubWorkTrackerCleanup.ts": () => import("./githubWorkTrackerCleanup"),
  "./githubWorkTrackerOAuth.ts": () => import("./githubWorkTrackerOAuth"),
  "./githubWorkTrackerSettings.ts": () => import("./githubWorkTrackerSettings"),
  "./githubWorkTrackerWebhooks.ts": () => import("./githubWorkTrackerWebhooks"),
  "./projects.ts": () => import("./projects"),
};

const firstRepository = {
  id: "101",
  nodeId: "R_101",
  owner: "wishco",
  name: "product",
  fullName: "wishco/product",
  url: "https://github.com/wishco/product",
};

const secondRepository = {
  id: "102",
  nodeId: "R_102",
  owner: "wishco",
  name: "platform",
  fullName: "wishco/platform",
  url: "https://github.com/wishco/platform",
};

const encryptionKey = btoa(String.fromCharCode(...new Uint8Array(32).fill(7)));

function stubGitHubConfig(privateKey: string) {
  vi.stubEnv("GITHUB_APP_CLIENT_ID", "Iv1.client");
  vi.stubEnv("GITHUB_APP_CLIENT_SECRET", "secret");
  vi.stubEnv("GITHUB_APP_SLUG", "wish-work-tracker");
  vi.stubEnv("GITHUB_APP_PRIVATE_KEY", privateKey);
  vi.stubEnv(
    "GITHUB_APP_REDIRECT_URI",
    "https://api.example.com/work-trackers/github/callback",
  );
  vi.stubEnv("GITHUB_APP_WEBHOOK_SECRET", "s".repeat(32));
  vi.stubEnv("WORK_TRACKER_ENCRYPTION_KEY", encryptionKey);
  vi.stubEnv("WISH_APP_BASE_URL", "https://wish.example");
}

async function seed() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      name: "Owner",
      tokenIdentifier: "owner-token",
    });
    const projectId = await ctx.db.insert("projects", {
      title: "Project",
      user: userId,
      projectSlug: "project",
    });
    const statusId = await ctx.db.insert("requestStatuses", {
      name: "open",
      displayName: "Open",
      project: projectId,
      type: "custom",
    });
    const requestId = await ctx.db.insert("requests", {
      text: "Export reports",
      clientId: "client",
      status: statusId,
      project: projectId,
    });
    const setupId = await ctx.db.insert("workTrackerOAuthSetups", {
      projectId,
      provider: "github",
      stateHash: "state-hash",
      data: {
        provider: "github",
        stage: "ready",
        redirectUri: "https://api.example.com/work-trackers/github/callback",
        installationId: "501",
        accountLogin: "wishco",
        repositories: [firstRepository, secondRepository],
      },
      createdBy: userId,
      createdAt: 1,
      expiresAt: Date.now() + 60_000,
      consumedAt: 2,
    });
    return { projectId, requestId, setupId, userId };
  });
  return { ids, owner: t.withIdentity({ tokenIdentifier: "owner-token" }), t };
}

describe("GitHub Work Tracker connections", () => {
  it("consumes setup state once", async () => {
    const { ids, t } = await seed();
    await t.run(async (ctx) => {
      await ctx.db.patch(ids.setupId, {
        consumedAt: undefined,
        data: {
          provider: "github",
          stage: "pending",
          redirectUri: "https://api.example.com/work-trackers/github/callback",
        },
      });
    });

    await expect(
      t.mutation(internal.githubWorkTrackerOAuth.claimGitHubSetupInternal, {
        stateHash: "state-hash",
        now: Date.now(),
      }),
    ).resolves.toMatchObject({ setupId: ids.setupId, projectId: ids.projectId });
    await expect(
      t.mutation(internal.githubWorkTrackerOAuth.claimGitHubSetupInternal, {
        stateHash: "state-hash",
        now: Date.now(),
      }),
    ).rejects.toThrow("Invalid or expired GitHub setup state");
  });

  it("verifies the callback installation and revokes temporary user credentials", async () => {
    const { ids, t } = await seed();
    const state = "a".repeat(48);
    await t.run(async (ctx) => {
      await ctx.db.patch(ids.setupId, {
        consumedAt: undefined,
        stateHash: await hashWorkTrackerOAuthState(state),
        data: {
          provider: "github",
          stage: "pending",
          redirectUri: "https://api.example.com/work-trackers/github/callback",
        },
      });
    });
    stubGitHubConfig("-----BEGIN PRIVATE KEY-----\na2V5\n-----END PRIVATE KEY-----");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          access_token: "temporary-user-token",
          expires_in: 28_800,
          refresh_token: "temporary-refresh-token",
          refresh_token_expires_in: 15_897_600,
          token_type: "bearer",
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          installations: [
            {
              id: 501,
              account: { login: "wishco" },
              suspended_at: null,
              permissions: { issues: "write" },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          repositories: [
            {
              id: 101,
              node_id: "R_101",
              owner: { login: "wishco" },
              name: "product",
              full_name: "wishco/product",
              html_url: "https://github.com/wishco/product",
              has_issues: true,
              archived: false,
              disabled: false,
            },
          ],
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      t.action(internal.githubWorkTrackerOAuth.completeGitHubSetupInternal, {
        code: "temporary-code",
        state,
        installationId: "501",
      }),
    ).resolves.toMatchObject({ ok: true, projectId: ids.projectId });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    const setup = await t.run(async (ctx) => await ctx.db.get(ids.setupId));
    expect(setup?.data).toMatchObject({
      provider: "github",
      stage: "ready",
      installationId: "501",
      repositories: [firstRepository],
    });
    expect(fetchMock.mock.calls[3]?.[0]).toBe(
      "https://api.github.com/applications/Iv1.client/grant",
    );
    expect(fetchMock.mock.calls[3]?.[1]?.body).toBe(
      JSON.stringify({ access_token: "temporary-user-token" }),
    );
    expect(JSON.stringify(setup?.data)).not.toContain("temporary-refresh-token");
  });

  it("persists failed user-credential revocation for durable cleanup", async () => {
    const { ids, t } = await seed();
    const state = "b".repeat(48);
    await t.run(async (ctx) => {
      await ctx.db.patch(ids.setupId, {
        consumedAt: undefined,
        stateHash: await hashWorkTrackerOAuthState(state),
        data: {
          provider: "github",
          stage: "pending",
          redirectUri: "https://api.example.com/work-trackers/github/callback",
        },
      });
    });
    stubGitHubConfig("-----BEGIN PRIVATE KEY-----\na2V5\n-----END PRIVATE KEY-----");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json({
            access_token: "temporary-user-token",
            expires_in: 28_800,
            refresh_token: "temporary-refresh-token",
            refresh_token_expires_in: 15_897_600,
            token_type: "bearer",
          }),
        )
        .mockResolvedValueOnce(
          Response.json({
            installations: [
              {
                id: 501,
                account: { login: "wishco" },
                suspended_at: null,
                permissions: { issues: "write" },
              },
            ],
          }),
        )
        .mockResolvedValueOnce(
          Response.json({
            repositories: [
              {
                id: 101,
                node_id: "R_101",
                owner: { login: "wishco" },
                name: "product",
                full_name: "wishco/product",
                html_url: "https://github.com/wishco/product",
                has_issues: true,
                archived: false,
                disabled: false,
              },
            ],
          }),
        )
        .mockResolvedValueOnce(new Response(null, { status: 500 }))
        .mockResolvedValueOnce(new Response(null, { status: 500 }))
        .mockResolvedValueOnce(new Response(null, { status: 500 }))
        .mockResolvedValueOnce(new Response(null, { status: 500 })),
    );

    await expect(
      t.action(internal.githubWorkTrackerOAuth.completeGitHubSetupInternal, {
        code: "temporary-code",
        state,
        installationId: "501",
      }),
    ).resolves.toMatchObject({ ok: false, errorCode: "github_revocation_failed" });
    let setup = await t.run(async (ctx) => await ctx.db.get(ids.setupId));
    expect(setup?.data).toMatchObject({ provider: "github", stage: "discarding" });
    expect(JSON.stringify(setup?.data)).not.toContain("temporary-user-token");
    expect(JSON.stringify(setup?.data)).not.toContain("temporary-refresh-token");

    await t.run(async (ctx) => {
      await ctx.db.patch(ids.setupId, { expiresAt: Date.now() - 1 });
    });
    vi.unstubAllEnvs();
    vi.stubEnv("WORK_TRACKER_ENCRYPTION_KEY", encryptionKey);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(new Response(null, { status: 202 })),
    );
    await t.action(internal.githubWorkTrackerCleanup.cleanupExpiredGitHubSetupsInternal, {});
    setup = await t.run(async (ctx) => await ctx.db.get(ids.setupId));
    expect(setup).toBeNull();
  });

  it("selects only a repository verified during setup", async () => {
    const { ids, owner, t } = await seed();
    await expect(
      owner.mutation(internal.githubWorkTrackerConnections.selectGitHubRepositoryInternal, {
        projectId: ids.projectId,
        setupId: ids.setupId,
        repository: { ...firstRepository, id: "missing" },
        connectionSnapshot: null,
      }),
    ).rejects.toThrow("GitHub repository is not available");

    await expect(
      owner.mutation(internal.githubWorkTrackerConnections.selectGitHubRepositoryInternal, {
        projectId: ids.projectId,
        setupId: ids.setupId,
        repository: firstRepository,
        connectionSnapshot: null,
      }),
    ).resolves.toEqual({ accountLogin: "wishco", repository: firstRepository });

    const settings = await owner.query(api.githubWorkTrackerSettings.getGitHubSettings, {
      projectId: ids.projectId,
    });
    expect(settings.connection).toMatchObject({
      health: "active",
      installationId: "501",
      repository: firstRepository,
    });
    expect(settings.setup).toBeNull();
  });

  it("does not overwrite a connection changed during initial selection", async () => {
    const { ids, owner, t } = await seed();
    const connectionId = await t.run(async (ctx) =>
      await ctx.db.insert("workTrackerConnections", {
        projectId: ids.projectId,
        provider: "github",
        health: "active",
        destinationLabel: firstRepository.fullName,
        data: {
          provider: "github",
          installationId: "501",
          accountLogin: "wishco",
          repository: firstRepository,
        },
        createdBy: ids.userId,
        createdAt: 10,
        updatedAt: 10,
      }),
    );
    await t.run(async (ctx) => {
      await ctx.db.patch(connectionId, { updatedAt: 11 });
    });

    await expect(
      owner.mutation(
        internal.githubWorkTrackerConnections.selectGitHubRepositoryInternal,
        {
          projectId: ids.projectId,
          setupId: ids.setupId,
          repository: secondRepository,
          connectionSnapshot: { id: connectionId, updatedAt: 10 },
        },
      ),
    ).rejects.toThrow("GitHub connection changed; reload and try again");
  });

  it("does not create a connection when one appeared during initial selection", async () => {
    const { ids, owner, t } = await seed();
    await t.run(async (ctx) => {
      await ctx.db.insert("workTrackerConnections", {
        projectId: ids.projectId,
        provider: "github",
        health: "active",
        destinationLabel: firstRepository.fullName,
        data: {
          provider: "github",
          installationId: "501",
          accountLogin: "wishco",
          repository: firstRepository,
        },
        createdBy: ids.userId,
        createdAt: 10,
        updatedAt: 10,
      });
    });

    await expect(
      owner.mutation(
        internal.githubWorkTrackerConnections.selectGitHubRepositoryInternal,
        {
          projectId: ids.projectId,
          setupId: ids.setupId,
          repository: secondRepository,
          connectionSnapshot: null,
        },
      ),
    ).rejects.toThrow("GitHub connection changed; reload and try again");
  });

  it("revalidates repository access immediately before selection", async () => {
    const { ids, owner, t } = await seed();
    const { privateKey } = await generateKeyPair("RS256", { extractable: true });
    stubGitHubConfig(await exportPKCS8(privateKey));
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(Response.json({ token: "installation-token" }))
        .mockResolvedValueOnce(Response.json({ repositories: [] })),
    );

    await expect(
      owner.action(api.githubWorkTrackerConnections.selectGitHubRepository, {
        projectId: ids.projectId,
        setupId: ids.setupId,
        repositoryId: firstRepository.id,
      }),
    ).rejects.toThrow("GitHub repository is no longer available");
    const connections = await t.run(async (ctx) =>
      ctx.db
        .query("workTrackerConnections")
        .withIndex("by_project", (q) => q.eq("projectId", ids.projectId))
        .collect(),
    );
    expect(connections).toEqual([]);
    expect(await t.run(async (ctx) => await ctx.db.get(ids.setupId))).not.toBeNull();
  });

  it("changes destinations and disconnects locally before GitHub delivery exists", async () => {
    const { ids, owner, t } = await seed();
    await owner.mutation(
      internal.githubWorkTrackerConnections.selectGitHubRepositoryInternal,
      {
        projectId: ids.projectId,
        setupId: ids.setupId,
        repository: firstRepository,
        connectionSnapshot: null,
      },
    );
    const connection = await t.run(async (ctx) =>
      ctx.db
        .query("workTrackerConnections")
        .withIndex("by_project_provider", (q) =>
          q.eq("projectId", ids.projectId).eq("provider", "github"),
        )
        .unique(),
    );
    if (!connection) throw new Error("Expected GitHub connection");
    await expect(
      owner.mutation(internal.githubWorkTrackerConnections.changeGitHubRepositoryInternal, {
        projectId: ids.projectId,
        connectionId: connection._id,
        installationId: "501",
        connectionUpdatedAt: connection.updatedAt,
        repository: secondRepository,
      }),
    ).resolves.toEqual({ repository: secondRepository });
    await expect(
      owner.mutation(api.githubWorkTrackerConnections.disconnectGitHub, {
        projectId: ids.projectId,
      }),
    ).resolves.toEqual({ disconnected: true });
  });

  it("blocks destination changes and disconnects while a GitHub Handoff is unresolved", async () => {
    const { ids, owner, t } = await seed();
    await owner.mutation(
      internal.githubWorkTrackerConnections.selectGitHubRepositoryInternal,
      {
        projectId: ids.projectId,
        setupId: ids.setupId,
        repository: firstRepository,
        connectionSnapshot: null,
      },
    );
    const connection = await t.run(async (ctx) =>
      ctx.db
        .query("workTrackerConnections")
        .withIndex("by_project_provider", (q) =>
          q.eq("projectId", ids.projectId).eq("provider", "github"),
        )
        .unique(),
    );
    if (!connection) throw new Error("Expected GitHub connection");
    const handoffId = await t.run(async (ctx) =>
      ctx.db.insert("workItemHandoffs", {
        projectId: ids.projectId,
        requestId: ids.requestId,
        provider: "github",
        attemptCount: 1,
        reconciliationCount: 0,
        recovery: {
          provider: "github",
          installationId: "501",
          repositoryId: firstRepository.id,
          repositoryOwner: firstRepository.owner,
          repositoryName: firstRepository.name,
          sourceUrl: "https://wish.example/source",
          startedAt: 1,
        },
        lifecycle: { state: "pending", leaseExpiresAt: Date.now() + 60_000 },
        createdAt: 1,
        updatedAt: 1,
      }),
    );
    const change = (repository: typeof firstRepository, updatedAt = connection.updatedAt) =>
      owner.mutation(internal.githubWorkTrackerConnections.changeGitHubRepositoryInternal, {
        projectId: ids.projectId,
        connectionId: connection._id,
        installationId: "501",
        connectionUpdatedAt: updatedAt,
        repository,
      });

    await expect(change(firstRepository)).rejects.toMatchObject({
      data: unresolvedWorkItemHandoffError,
    });
    await t.run(async (ctx) => {
      await ctx.db.patch(handoffId, { lifecycle: { state: "unknown" } });
    });
    await expect(change(firstRepository)).resolves.toEqual({ repository: firstRepository });
    const updatedConnection = await t.run(async (ctx) => ctx.db.get(connection._id));
    if (!updatedConnection) throw new Error("Expected GitHub connection");
    const replacementSetupId = await t.run(async (ctx) =>
      ctx.db.insert("workTrackerOAuthSetups", {
        projectId: ids.projectId,
        provider: "github",
        stateHash: "replacement-state",
        data: {
          provider: "github",
          stage: "ready",
          redirectUri: "https://api.example.com/work-trackers/github/callback",
          installationId: "502",
          accountLogin: "wishco",
          repositories: [firstRepository],
        },
        createdBy: ids.userId,
        createdAt: 2,
        expiresAt: Date.now() + 60_000,
        consumedAt: 2,
      }),
    );
    await expect(
      owner.mutation(
        internal.githubWorkTrackerConnections.selectGitHubRepositoryInternal,
        {
          projectId: ids.projectId,
          setupId: replacementSetupId,
          repository: firstRepository,
          connectionSnapshot: {
            id: updatedConnection._id,
            updatedAt: updatedConnection.updatedAt,
          },
        },
      ),
    ).rejects.toMatchObject({ data: unresolvedWorkItemHandoffError });
    await expect(change(secondRepository, updatedConnection.updatedAt)).rejects.toMatchObject({
      data: unresolvedWorkItemHandoffError,
    });
    await expect(
      owner.mutation(api.githubWorkTrackerConnections.disconnectGitHub, {
        projectId: ids.projectId,
      }),
    ).rejects.toMatchObject({ data: unresolvedWorkItemHandoffError });
  });

  it("marks only the selected repository when GitHub removes access", async () => {
    const { ids, owner, t } = await seed();
    await owner.mutation(
      internal.githubWorkTrackerConnections.selectGitHubRepositoryInternal,
      {
        projectId: ids.projectId,
        setupId: ids.setupId,
        repository: firstRepository,
        connectionSnapshot: null,
      },
    );

    const connectionBeforeWebhook = await t.run(async (ctx) =>
      ctx.db
        .query("workTrackerConnections")
        .withIndex("by_project_provider", (q) =>
          q.eq("projectId", ids.projectId).eq("provider", "github"),
        )
        .unique(),
    );
    if (!connectionBeforeWebhook) throw new Error("Expected GitHub connection");

    await t.mutation(internal.githubWorkTrackerWebhooks.applyGitHubWebhookInternal, {
      installationId: "501",
      installationUnavailable: false,
      removedRepositoryIds: [secondRepository.id],
    });
    let settings = await owner.query(api.githubWorkTrackerSettings.getGitHubSettings, {
      projectId: ids.projectId,
    });
    expect(settings.connection?.health).toBe("active");
    await expect(
      owner.mutation(internal.githubWorkTrackerConnections.changeGitHubRepositoryInternal, {
        projectId: ids.projectId,
        connectionId: connectionBeforeWebhook._id,
        installationId: "501",
        connectionUpdatedAt: connectionBeforeWebhook.updatedAt,
        repository: secondRepository,
      }),
    ).rejects.toThrow("GitHub connection changed; reload and try again");

    await t.mutation(internal.githubWorkTrackerWebhooks.applyGitHubWebhookInternal, {
      installationId: "501",
      installationUnavailable: false,
      removedRepositoryIds: [firstRepository.id],
    });
    settings = await owner.query(api.githubWorkTrackerSettings.getGitHubSettings, {
      projectId: ids.projectId,
    });
    expect(settings.connection?.health).toBe("needs_attention");
  });

  it("applies repository-removal webhooks before initial selection", async () => {
    const { ids, owner, t } = await seed();
    await t.mutation(internal.githubWorkTrackerWebhooks.applyGitHubWebhookInternal, {
      installationId: "501",
      installationUnavailable: false,
      removedRepositoryIds: [firstRepository.id],
    });

    await expect(
      owner.mutation(
        internal.githubWorkTrackerConnections.selectGitHubRepositoryInternal,
        {
          projectId: ids.projectId,
          setupId: ids.setupId,
          repository: firstRepository,
          connectionSnapshot: null,
        },
      ),
    ).rejects.toThrow("GitHub repository is not available");
  });

  it("does not overwrite a connection that changed during repository discovery", async () => {
    const { ids, owner, t } = await seed();
    await owner.mutation(
      internal.githubWorkTrackerConnections.selectGitHubRepositoryInternal,
      {
        projectId: ids.projectId,
        setupId: ids.setupId,
        repository: firstRepository,
        connectionSnapshot: null,
      },
    );
    const connection = await t.run(async (ctx) =>
      ctx.db
        .query("workTrackerConnections")
        .withIndex("by_project_provider", (q) =>
          q.eq("projectId", ids.projectId).eq("provider", "github"),
        )
        .unique(),
    );
    if (!connection) throw new Error("Expected GitHub connection");
    await t.run(async (ctx) => {
      await ctx.db.patch(connection._id, { updatedAt: connection.updatedAt + 1 });
    });

    await expect(
      owner.mutation(internal.githubWorkTrackerConnections.changeGitHubRepositoryInternal, {
        projectId: ids.projectId,
        connectionId: connection._id,
        installationId: "501",
        connectionUpdatedAt: connection.updatedAt,
        repository: secondRepository,
      }),
    ).rejects.toThrow("GitHub connection changed; reload and try again");
  });

  it("protects a claimed setup until token persistence completes", async () => {
    const { ids, owner, t } = await seed();
    await t.run(async (ctx) => {
      await ctx.db.patch(ids.setupId, {
        data: {
          provider: "github",
          stage: "pending",
          redirectUri: "https://api.example.com/work-trackers/github/callback",
        },
      });
    });

    await expect(
      owner.mutation(internal.githubWorkTrackerOAuth.createGitHubSetupInternal, {
        projectId: ids.projectId,
        stateHash: "replacement-state",
        redirectUri: "https://api.example.com/work-trackers/github/callback",
        createdAt: 20,
        expiresAt: Date.now() + 60_000,
      }),
    ).rejects.toThrow("The previous GitHub authorization is still in progress");
    await expect(
      owner.mutation(api.githubWorkTrackerOAuth.discardGitHubSetup, {
        projectId: ids.projectId,
        setupId: ids.setupId,
      }),
    ).rejects.toThrow("GitHub authorization is still in progress");
    await expect(
      owner.mutation(api.projects.deleteProject, { id: ids.projectId }),
    ).rejects.toThrow("Disconnect Work Trackers before deleting this project");
    expect(await t.run(async (ctx) => await ctx.db.get(ids.setupId))).not.toBeNull();
  });

  it("deletes pending and ready GitHub setups with their project", async () => {
    const ready = await seed();
    await expect(
      ready.owner.mutation(api.projects.deleteProject, { id: ready.ids.projectId }),
    ).resolves.toBeNull();
    expect(
      await ready.t.run(async (ctx) => await ctx.db.get(ready.ids.setupId)),
    ).toBeNull();

    const pending = await seed();
    await pending.t.run(async (ctx) => {
      await ctx.db.patch(pending.ids.setupId, {
        consumedAt: undefined,
        data: {
          provider: "github",
          stage: "pending",
          redirectUri: "https://api.example.com/work-trackers/github/callback",
        },
      });
    });
    await expect(
      pending.owner.mutation(api.projects.deleteProject, { id: pending.ids.projectId }),
    ).resolves.toBeNull();
    expect(
      await pending.t.run(async (ctx) => await ctx.db.get(pending.ids.setupId)),
    ).toBeNull();
  });

  it("blocks project deletion while a GitHub user token awaits revocation", async () => {
    const { ids, owner, t } = await seed();
    await t.run(async (ctx) => {
      await ctx.db.patch(ids.setupId, {
        data: {
          provider: "github",
          stage: "discarding",
          redirectUri: "https://api.example.com/work-trackers/github/callback",
          encryptedUserCredentials: { ciphertext: "ciphertext", iv: "iv" },
        },
      });
    });
    await expect(
      owner.mutation(api.projects.deleteProject, { id: ids.projectId }),
    ).rejects.toThrow("Disconnect Work Trackers before deleting this project");
  });
});
