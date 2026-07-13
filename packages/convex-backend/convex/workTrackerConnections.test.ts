import { convexTest } from "convex-test";
import { describe, expect, it } from "vite-plus/test";

import { api, internal } from "./_generated/api";
import schema from "./schema";
import { parseStoredCredentials } from "./lib/linearConnection";

const modules = {
  "./_generated/server.ts": () => import("./_generated/server"),
  "./projects.ts": () => import("./projects"),
  "./linearWorkTrackerSettings.ts": () => import("./linearWorkTrackerSettings"),
  "./linearWorkTrackerOAuth.ts": () => import("./linearWorkTrackerOAuth"),
  "./workItemHandoffs.ts": () => import("./workItemHandoffs"),
  "./workTrackerConnections.ts": () => import("./workTrackerConnections"),
};

const encryptedCredentials = { ciphertext: "new-ciphertext", iv: "new-iv" };
const oldEncryptedCredentials = { ciphertext: "old-ciphertext", iv: "old-iv" };

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
      provider: "linear",
      stateHash: "state",
      data: {
        provider: "linear",
        stage: "ready",
        redirectUri: "https://api.example.com/work-trackers/linear/callback",
        encryptedCredentials,
        authorization: {
          organization: { id: "org-2", name: "New workspace", urlKey: "new" },
          teams: [
            { id: "team-2", key: "NEW", name: "New team" },
            { id: "team-3", key: "OPS", name: "Operations" },
          ],
        },
      },
      createdBy: userId,
      createdAt: 1,
      expiresAt: Date.now() + 60_000,
      consumedAt: 2,
    });
    const connectionId = await ctx.db.insert("workTrackerConnections", {
      projectId,
      provider: "linear",
      health: "active",
      destinationLabel: "Old team",
      data: {
        provider: "linear",
        organizationId: "org-1",
        organizationName: "Old workspace",
        organizationUrlKey: "old",
        teamId: "team-1",
        teamKey: "OLD",
        teamName: "Old team",
        encryptedCredentials: oldEncryptedCredentials,
      },
      createdBy: userId,
      createdAt: 1,
      updatedAt: 1,
    });
    return { connectionId, projectId, requestId, setupId };
  });

  return { ids, owner: t.withIdentity({ tokenIdentifier: "owner-token" }), t };
}

describe("Work Tracker connections", () => {
  it("rejects malformed stored credentials", () => {
    expect(() =>
      parseStoredCredentials(
        JSON.stringify({
          accessToken: "access",
          refreshToken: "refresh",
          expiresAt: null,
          scopes: ["read", "issues:create"],
        }),
      ),
    ).toThrow("Invalid stored Linear credentials");
    expect(() =>
      parseStoredCredentials(
        JSON.stringify({
          accessToken: "access",
          refreshToken: "refresh",
          expiresAt: Date.now(),
          scopes: ["read"],
        }),
      ),
    ).toThrow("Invalid stored Linear credentials");
  });

  it("consumes OAuth state once and rejects expired state", async () => {
    const { ids, t } = await seed();
    await t.run(async (ctx) => {
      await ctx.db.patch(ids.setupId, { consumedAt: undefined, stateHash: "single-use" });
    });

    await expect(
      t.mutation(internal.linearWorkTrackerOAuth.claimLinearOAuthSetupInternal, {
        stateHash: "single-use",
        now: Date.now(),
      }),
    ).resolves.toMatchObject({ setupId: ids.setupId, projectId: ids.projectId });
    await expect(
      t.mutation(internal.linearWorkTrackerOAuth.claimLinearOAuthSetupInternal, {
        stateHash: "single-use",
        now: Date.now(),
      }),
    ).rejects.toThrow("Invalid or expired Linear OAuth state");

    await t.run(async (ctx) => {
      await ctx.db.patch(ids.setupId, {
        consumedAt: undefined,
        stateHash: "expired",
        expiresAt: Date.now() - 1,
      });
    });
    await expect(
      t.mutation(internal.linearWorkTrackerOAuth.claimLinearOAuthSetupInternal, {
        stateHash: "expired",
        now: Date.now(),
      }),
    ).rejects.toThrow("Invalid or expired Linear OAuth state");
  });

  it("keeps exactly one OAuth setup and never replaces stored credentials", async () => {
    const { ids, owner, t } = await seed();
    const args = {
      projectId: ids.projectId,
      stateHash: "replacement-state",
      redirectUri: "https://api.example.com/work-trackers/linear/callback",
      createdAt: Date.now(),
      expiresAt: Date.now() + 60_000,
    };

    await expect(
      owner.mutation(internal.linearWorkTrackerOAuth.createLinearOAuthSetupInternal, args),
    ).rejects.toThrow("Discard the existing Linear authorization before starting again");
    await t.run(async (ctx) => {
      await ctx.db.patch(ids.setupId, {
        data: {
          provider: "linear",
          stage: "pending",
          redirectUri: args.redirectUri,
        },
      });
    });
    await owner.mutation(internal.linearWorkTrackerOAuth.createLinearOAuthSetupInternal, args);

    const setups = await t.run(async (ctx) =>
      ctx.db
        .query("workTrackerOAuthSetups")
        .withIndex("by_project_provider", (q) =>
          q.eq("projectId", ids.projectId).eq("provider", "linear"),
        )
        .collect(),
    );
    expect(setups).toHaveLength(1);
    expect(setups[0]).toMatchObject({ stateHash: "replacement-state", data: { stage: "pending" } });
  });

  it("does not expose or mutate another owner's connection", async () => {
    const { ids, t } = await seed();
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        name: "Outsider",
        tokenIdentifier: "outsider-token",
      });
    });
    const outsider = t.withIdentity({ tokenIdentifier: "outsider-token" });

    await expect(
      outsider.query(api.linearWorkTrackerSettings.getLinearSettings, {
        projectId: ids.projectId,
      }),
    ).rejects.toThrow("Not authorized to access this project");
    await expect(
      outsider.mutation(internal.workTrackerConnections.selectLinearTeamInternal, {
        projectId: ids.projectId,
        setupId: ids.setupId,
        teamId: "team-2",
      }),
    ).rejects.toThrow("Not authorized to access this project");
  });

  it("keeps the active connection when destination selection is invalid", async () => {
    const { ids, owner, t } = await seed();

    await expect(
      owner.mutation(internal.workTrackerConnections.selectLinearTeamInternal, {
        projectId: ids.projectId,
        setupId: ids.setupId,
        teamId: "missing",
      }),
    ).rejects.toThrow("Linear team is not available");

    expect(await t.run(async (ctx) => await ctx.db.get(ids.connectionId))).toMatchObject({
      destinationLabel: "Old team",
    });
  });

  it("blocks replacement and disconnection while a Handoff is unresolved", async () => {
    const { ids, owner, t } = await seed();
    await t.run(async (ctx) => {
      await ctx.db.insert("workItemHandoffs", {
        projectId: ids.projectId,
        requestId: ids.requestId,
        provider: "linear",
        attemptCount: 1,
        reconciliationCount: 0,
        recovery: { provider: "linear", issueId: crypto.randomUUID() },
        lifecycle: { state: "unknown" },
        createdAt: 1,
        updatedAt: 1,
      });
    });

    await expect(
      owner.mutation(internal.workTrackerConnections.selectLinearTeamInternal, {
        projectId: ids.projectId,
        setupId: ids.setupId,
        teamId: "team-2",
      }),
    ).rejects.toThrow("Work Tracker change is blocked");
    await expect(
      owner.mutation(internal.workTrackerConnections.beginLinearDisconnectInternal, {
        projectId: ids.projectId,
        leaseId: "disconnect",
        now: Date.now(),
      }),
    ).rejects.toThrow("Work Tracker change is blocked");
  });

  it("blocks same-destination credential replacement while a Handoff is unresolved", async () => {
    const { ids, owner, t } = await seed();
    await t.run(async (ctx) => {
      const setup = await ctx.db.get(ids.setupId);
      if (setup?.data.stage !== "ready") throw new Error("Expected ready setup");
      await ctx.db.patch(ids.setupId, {
        data: {
          ...setup!.data,
          authorization: {
            organization: { id: "org-1", name: "Old workspace", urlKey: "old" },
            teams: [{ id: "team-1", key: "OLD", name: "Old team" }],
          },
        },
      });
      await ctx.db.insert("workItemHandoffs", {
        projectId: ids.projectId,
        requestId: ids.requestId,
        provider: "linear",
        attemptCount: 1,
        reconciliationCount: 0,
        recovery: { provider: "linear", issueId: crypto.randomUUID() },
        lifecycle: { state: "pending", leaseExpiresAt: Date.now() + 60_000 },
        createdAt: 1,
        updatedAt: 1,
      });
    });

    await expect(
      owner.mutation(internal.workTrackerConnections.selectLinearTeamInternal, {
        projectId: ids.projectId,
        setupId: ids.setupId,
        teamId: "team-1",
      }),
    ).rejects.toThrow("Work Tracker change is blocked");
  });

  it("atomically replaces a settled connection and consumes its setup", async () => {
    const { ids, owner, t } = await seed();

    await owner.mutation(internal.workTrackerConnections.selectLinearTeamInternal, {
      projectId: ids.projectId,
      setupId: ids.setupId,
      teamId: "team-2",
    });

    const connections = await t.run(async (ctx) =>
      ctx.db
        .query("workTrackerConnections")
        .withIndex("by_project_provider", (q) =>
          q.eq("projectId", ids.projectId).eq("provider", "linear"),
        )
        .collect(),
    );
    expect(connections).toHaveLength(1);
    expect(connections[0]).toMatchObject({
      destinationLabel: "New team",
      data: {
        encryptedCredentials,
        organizationId: "org-2",
        pendingRevocation: { encryptedCredentials: oldEncryptedCredentials },
        teamId: "team-2",
      },
    });
    expect(await t.run(async (ctx) => await ctx.db.get(ids.setupId))).toBeNull();
  });

  it("serializes setup discard against destination selection", async () => {
    const first = await seed();
    await expect(
      first.owner.mutation(
        internal.linearWorkTrackerOAuth.claimLinearOAuthSetupDiscardInternal,
        { projectId: first.ids.projectId, setupId: first.ids.setupId },
      ),
    ).resolves.toMatchObject({ encryptedCredentials });
    await expect(
      first.owner.mutation(internal.workTrackerConnections.selectLinearTeamInternal, {
        projectId: first.ids.projectId,
        setupId: first.ids.setupId,
        teamId: "team-2",
      }),
    ).rejects.toThrow("Linear setup is no longer available");
    expect(await first.t.run(async (ctx) => await ctx.db.get(first.ids.setupId))).toMatchObject({
      data: { stage: "discarding" },
    });

    const second = await seed();
    await second.owner.mutation(internal.workTrackerConnections.selectLinearTeamInternal, {
      projectId: second.ids.projectId,
      setupId: second.ids.setupId,
      teamId: "team-2",
    });
    await expect(
      second.owner.mutation(
        internal.linearWorkTrackerOAuth.claimLinearOAuthSetupDiscardInternal,
        { projectId: second.ids.projectId, setupId: second.ids.setupId },
      ),
    ).resolves.toBeNull();
  });

  it("rejects stale credential writes and disconnect finalization", async () => {
    const { ids, owner, t } = await seed();
    await expect(
      owner.mutation(internal.workTrackerConnections.claimLinearRefreshInternal, {
        connectionId: ids.connectionId,
        leaseId: "refresh-a",
        now: Date.now(),
      }),
    ).resolves.toBe(true);
    await expect(
      owner.mutation(internal.workTrackerConnections.completeLinearRefreshInternal, {
        connectionId: ids.connectionId,
        encryptedCredentials,
        leaseId: "refresh-b",
      }),
    ).resolves.toBe(false);
    expect(await t.run(async (ctx) => await ctx.db.get(ids.connectionId))).toMatchObject({
      data: { credentialLease: { id: "refresh-a" } },
    });

    await t.run(async (ctx) => {
      const connection = await ctx.db.get(ids.connectionId);
      await ctx.db.patch(ids.connectionId, {
        data: { ...connection!.data, credentialLease: undefined },
      });
    });
    const begun = await owner.mutation(
      internal.workTrackerConnections.beginLinearDisconnectInternal,
      { projectId: ids.projectId, leaseId: "disconnect-a", now: Date.now() },
    );
    await t.run(async (ctx) => {
      await ctx.db.patch(ids.connectionId, {
        data: { ...begun!.data, credentialLease: { id: "disconnect-b", expiresAt: Date.now() } },
      });
    });
    await expect(
      owner.mutation(internal.workTrackerConnections.finalizeLinearDisconnectInternal, {
        projectId: ids.projectId,
        connectionId: ids.connectionId,
        leaseId: "disconnect-a",
      }),
    ).resolves.toEqual({ disconnected: false });
    expect(await t.run(async (ctx) => await ctx.db.get(ids.connectionId))).not.toBeNull();
  });

  it("serializes Handoff reservation against disconnect", async () => {
    const disconnectFirst = await seed();
    await disconnectFirst.owner.mutation(
      internal.workTrackerConnections.beginLinearDisconnectInternal,
      {
        projectId: disconnectFirst.ids.projectId,
        leaseId: "disconnect-first",
        now: Date.now(),
      },
    );
    await expect(
      disconnectFirst.t.mutation(internal.workItemHandoffs.reserveInternal, {
        projectId: disconnectFirst.ids.projectId,
        requestId: disconnectFirst.ids.requestId,
        provider: "linear",
      }),
    ).rejects.toThrow("Work Tracker connection is not available");

    const handoffFirst = await seed();
    await handoffFirst.t.mutation(internal.workItemHandoffs.reserveInternal, {
      projectId: handoffFirst.ids.projectId,
      requestId: handoffFirst.ids.requestId,
      provider: "linear",
    });
    await expect(
      handoffFirst.owner.mutation(
        internal.workTrackerConnections.beginLinearDisconnectInternal,
        {
          projectId: handoffFirst.ids.projectId,
          leaseId: "disconnect-second",
          now: Date.now(),
        },
      ),
    ).rejects.toThrow("Work Tracker change is blocked");
  });

  it("clears an expired refresh lease and restores Handoff reservation", async () => {
    const ownerFinishes = await seed();
    await ownerFinishes.t.run(async (ctx) => {
      const connection = await ctx.db.get(ownerFinishes.ids.connectionId);
      await ctx.db.patch(ownerFinishes.ids.connectionId, {
        data: {
          ...connection!.data,
          credentialLease: { id: "expired-refresh", expiresAt: Date.now() - 1 },
        },
      });
    });

    await expect(
      ownerFinishes.owner.mutation(internal.workTrackerConnections.completeLinearRefreshInternal, {
        connectionId: ownerFinishes.ids.connectionId,
        encryptedCredentials,
        leaseId: "expired-refresh",
      }),
    ).resolves.toBe(true);

    const reservationWins = await seed();
    await reservationWins.t.run(async (ctx) => {
      const connection = await ctx.db.get(reservationWins.ids.connectionId);
      await ctx.db.patch(reservationWins.ids.connectionId, {
        data: {
          ...connection!.data,
          credentialLease: { id: "expired-refresh", expiresAt: Date.now() - 1 },
        },
      });
    });
    await expect(
      reservationWins.t.mutation(internal.workItemHandoffs.reserveInternal, {
        projectId: reservationWins.ids.projectId,
        requestId: reservationWins.ids.requestId,
        provider: "linear",
      }),
    ).resolves.toMatchObject({ lifecycle: { state: "pending" } });
    expect(
      (
        await reservationWins.t.run(async (ctx) =>
          ctx.db.get(reservationWins.ids.connectionId),
        )
      )?.data.credentialLease,
    ).toBeUndefined();
    await expect(
      reservationWins.owner.mutation(
        internal.workTrackerConnections.completeLinearRefreshInternal,
        {
          connectionId: reservationWins.ids.connectionId,
          encryptedCredentials,
          leaseId: "expired-refresh",
        },
      ),
    ).resolves.toBe(false);
  });

  it("blocks project deletion until credential-bearing Work Trackers are removed", async () => {
    const { ids, owner, t } = await seed();

    await expect(owner.mutation(api.projects.deleteProject, { id: ids.projectId })).rejects.toThrow(
      "Disconnect Work Trackers before deleting this project",
    );
    await t.run(async (ctx) => await ctx.db.delete(ids.connectionId));
    await expect(owner.mutation(api.projects.deleteProject, { id: ids.projectId })).rejects.toThrow(
      "Disconnect Work Trackers before deleting this project",
    );

    await t.run(async (ctx) => {
      await ctx.db.patch(ids.setupId, {
        data: {
          provider: "linear",
          stage: "pending",
          redirectUri: "https://api.example.com/work-trackers/linear/callback",
        },
      });
    });
    await expect(owner.mutation(api.projects.deleteProject, { id: ids.projectId })).resolves.toBe(
      null,
    );
    expect(await t.run(async (ctx) => await ctx.db.get(ids.setupId))).toBeNull();
  });
});
