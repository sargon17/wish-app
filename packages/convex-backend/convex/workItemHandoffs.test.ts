import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { api, internal } from "./_generated/api";
import { serializeCredentials } from "./lib/linearConnection";
import { linearConnectionOrNull } from "./lib/workTrackerConnection";
import {
  handoffCreationDisabledError,
  unresolvedWorkItemHandoffError,
  workTrackerConnectionNeedsAttentionError,
} from "./lib/workTrackerErrors";
import { encryptWorkTrackerSecret } from "./lib/workTrackerSecrets";
import schema from "./schema";

const modules = {
  "./_generated/server.ts": () => import("./_generated/server"),
  "./linearWorkItemHandoffs.ts": () => import("./linearWorkItemHandoffs"),
  "./requests.ts": () => import("./requests"),
  "./workItemHandoffs.ts": () => import("./workItemHandoffs"),
  "./workTrackerConnections.ts": () => import("./workTrackerConnections"),
};

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
      provider: "linear",
      health: "active",
      destinationLabel: "Engineering",
      data: {
        provider: "linear",
        organizationId: "org",
        organizationName: "Workspace",
        organizationUrlKey: "workspace",
        teamId: "team",
        teamKey: "ENG",
        teamName: "Engineering",
        encryptedCredentials: { ciphertext: "ciphertext", iv: "iv" },
      },
      createdBy: userId,
      createdAt: 1,
      updatedAt: 1,
    });
    return { connectionId, projectId, requestId };
  });
  return { ids, owner: t.withIdentity({ tokenIdentifier: "owner-token" }), t };
}

function reservationArgs(
  ids: Awaited<ReturnType<typeof seed>>["ids"],
  issueId: string = crypto.randomUUID(),
) {
  return {
    projectId: ids.projectId,
    requestId: ids.requestId,
    provider: "linear" as const,
    connectionId: ids.connectionId,
    connectionUpdatedAt: 1,
    recovery: { provider: "linear" as const, issueId },
  };
}

async function configureLinearDelivery(
  t: Awaited<ReturnType<typeof seed>>["t"],
  ids: Awaited<ReturnType<typeof seed>>["ids"],
  credentialCreatedAt = Date.now(),
) {
  const encryptionKey = btoa(String.fromCharCode(...new Uint8Array(32).fill(7)));
  vi.stubEnv("LINEAR_CLIENT_ID", "client-id");
  vi.stubEnv("LINEAR_CLIENT_SECRET", "client-secret");
  vi.stubEnv("LINEAR_REDIRECT_URI", "http://localhost:3000/work-trackers/linear/callback");
  vi.stubEnv("WORK_TRACKER_ENCRYPTION_KEY", encryptionKey);
  vi.stubEnv("WISH_APP_BASE_URL", "http://localhost:3000");
  vi.stubEnv("LINEAR_HANDOFF_CREATION_ENABLED", "true");
  const encryptedCredentials = await encryptWorkTrackerSecret(
    serializeCredentials(
      {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresIn: 3_600,
        scopes: ["read", "issues:create"],
      },
      credentialCreatedAt,
    ),
    encryptionKey,
  );
  await t.run(async (ctx) => {
    const connection = linearConnectionOrNull(await ctx.db.get(ids.connectionId));
    if (!connection) throw new Error("Expected connection");
    await ctx.db.patch(connection._id, {
      data: { ...connection.data, encryptedCredentials },
    });
  });
}

describe("Work Item Handoff delivery lifecycle", () => {
  it("returns provider-neutral connection and Handoff facts", async () => {
    const { ids, owner } = await seed();

    await expect(
      owner.query(api.workItemHandoffs.getSurface, {
        projectId: ids.projectId,
        requestId: ids.requestId,
        provider: "linear",
      }),
    ).resolves.toEqual({
      connection: { health: "active", destinationLabel: "Engineering" },
      handoff: null,
    });
  });

  it("sends once through the provider-neutral action and persists the Linear link", async () => {
    const { ids, owner, t } = await seed();
    await configureLinearDelivery(t, ids);
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      const issueId = body.variables.input.id;
      return Response.json({
        data: {
          issueCreate: {
            success: true,
            issue: {
              id: issueId,
              identifier: "ENG-42",
              url: "https://linear.app/acme/issue/ENG-42/export-reports",
            },
          },
        },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const log = vi.spyOn(console, "info").mockImplementation(() => undefined);

    const args = {
      projectId: ids.projectId,
      requestId: ids.requestId,
      provider: "linear" as const,
    };
    const first = await owner.action(api.workItemHandoffs.send, args);
    const second = await owner.action(api.workItemHandoffs.send, args);

    expect(first.lifecycle).toMatchObject({
      state: "succeeded",
      externalIdentity: {
        provider: "linear",
        identifier: "ENG-42",
        url: "https://linear.app/acme/issue/ENG-42/export-reports",
      },
    });
    expect(second._id).toBe(first._id);
    expect(fetchMock).toHaveBeenCalledOnce();
    const requestBody = String(fetchMock.mock.calls[0]?.[1].body);
    expect(requestBody).toContain("http://localhost:3000/dashboard/project/");
    expect(requestBody).toContain("/project/requests?item=");
    expect(requestBody).not.toContain("client");
    expect(log).toHaveBeenCalledWith(
      "work_item_handoff_delivery",
      expect.objectContaining({ provider: "linear", state: "succeeded" }),
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain("access-token");
    expect(JSON.stringify(log.mock.calls)).not.toContain("Let customers export reports");
  });

  it("blocks new creation unless the emergency flag is explicitly enabled", async () => {
    const { ids, owner, t } = await seed();
    vi.stubEnv("LINEAR_HANDOFF_CREATION_ENABLED", "false");

    await expect(
      owner.action(api.workItemHandoffs.send, {
        projectId: ids.projectId,
        requestId: ids.requestId,
        provider: "linear",
      }),
    ).rejects.toMatchObject({ data: handoffCreationDisabledError });
    expect(await t.run(async (ctx) => await ctx.db.query("workItemHandoffs").collect())).toEqual(
      [],
    );

    await configureLinearDelivery(t, ids);
    await t.run(async (ctx) => {
      await ctx.db.patch(ids.connectionId, { health: "needs_attention" });
    });
    await expect(
      owner.action(api.workItemHandoffs.send, {
        projectId: ids.projectId,
        requestId: ids.requestId,
        provider: "linear",
      }),
    ).rejects.toMatchObject({ data: workTrackerConnectionNeedsAttentionError });
  });

  it("never repeats creation after an uncertain provider outcome", async () => {
    const { ids, owner, t } = await seed();
    await configureLinearDelivery(t, ids);
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    const args = {
      projectId: ids.projectId,
      requestId: ids.requestId,
      provider: "linear" as const,
    };
    const first = await owner.action(api.workItemHandoffs.send, args);
    const second = await owner.action(api.workItemHandoffs.send, args);

    expect(first.lifecycle.state).toBe("unknown");
    expect(second.lifecycle.state).toBe("unknown");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("reconciles an uncertain outcome while new creation is disabled", async () => {
    const { ids, owner, t } = await seed();
    await configureLinearDelivery(t, ids);
    vi.stubEnv("LINEAR_HANDOFF_CREATION_ENABLED", "false");
    const reservation = await owner.mutation(
      internal.workItemHandoffs.reserveInternal,
      reservationArgs(ids, "stable-issue-id"),
    );
    await owner.mutation(internal.workItemHandoffs.completeUnknownInternal, {
      handoffId: reservation.handoff._id,
      attemptCount: 1,
      errorCode: "linear_outcome_unknown",
      errorMessage: "Wish could not confirm whether Linear created the issue",
    });
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        data: {
          issue: {
            id: "stable-issue-id",
            identifier: "ENG-42",
            url: "https://linear.app/acme/issue/ENG-42",
          },
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const args = {
      projectId: ids.projectId,
      requestId: ids.requestId,
      provider: "linear" as const,
    };

    const reconciled = await owner.action(api.workItemHandoffs.check, args);
    const existing = await owner.action(api.workItemHandoffs.send, args);

    expect(reconciled?.lifecycle).toMatchObject({ state: "succeeded" });
    expect(existing._id).toBe(reservation.handoff._id);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("refreshes expired credentials before an owner checks an uncertain outcome", async () => {
    const { ids, owner, t } = await seed();
    await configureLinearDelivery(t, ids, Date.now() - 2 * 60 * 60 * 1000);
    vi.stubEnv("LINEAR_HANDOFF_CREATION_ENABLED", "false");
    const reservation = await owner.mutation(
      internal.workItemHandoffs.reserveInternal,
      reservationArgs(ids, "stable-issue-id"),
    );
    await owner.mutation(internal.workItemHandoffs.completeUnknownInternal, {
      handoffId: reservation.handoff._id,
      attemptCount: 1,
      errorCode: "linear_outcome_unknown",
      errorMessage: "Wish could not confirm whether Linear created the issue",
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          access_token: "new-access-token",
          refresh_token: "new-refresh-token",
          token_type: "Bearer",
          expires_in: 3_600,
          scope: "read issues:create",
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          data: {
            issue: {
              id: "stable-issue-id",
              identifier: "ENG-42",
              url: "https://linear.app/acme/issue/ENG-42",
            },
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    const reconciled = await owner.action(api.workItemHandoffs.check, {
      projectId: ids.projectId,
      requestId: ids.requestId,
      provider: "linear",
    });

    expect(reconciled?.lifecycle.state).toBe("succeeded");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not consume a scheduled check when credentials have expired", async () => {
    const { ids, owner, t } = await seed();
    await configureLinearDelivery(t, ids, Date.now() - 2 * 60 * 60 * 1000);
    const reservation = await owner.mutation(
      internal.workItemHandoffs.reserveInternal,
      reservationArgs(ids),
    );
    await owner.mutation(internal.workItemHandoffs.completeUnknownInternal, {
      handoffId: reservation.handoff._id,
      attemptCount: 1,
      errorCode: "linear_outcome_unknown",
      errorMessage: "Wish could not confirm whether Linear created the issue",
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    const result = await t.action(internal.workItemHandoffs.reconcileInternal, {
      handoffId: reservation.handoff._id,
    });

    expect(result).toMatchObject({ reconciliationCount: 0, lifecycle: { state: "unknown" } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("repairs rejected credentials before an owner retries reconciliation", async () => {
    const { ids, owner, t } = await seed();
    await configureLinearDelivery(t, ids);
    const reservation = await owner.mutation(
      internal.workItemHandoffs.reserveInternal,
      reservationArgs(ids, "stable-issue-id"),
    );
    await owner.mutation(internal.workItemHandoffs.completeUnknownInternal, {
      handoffId: reservation.handoff._id,
      attemptCount: 1,
      errorCode: "linear_outcome_unknown",
      errorMessage: "Wish could not confirm whether Linear created the issue",
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        Response.json({
          access_token: "new-access-token",
          refresh_token: "new-refresh-token",
          token_type: "Bearer",
          expires_in: 3_600,
          scope: "read issues:create",
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          data: {
            issue: {
              id: "stable-issue-id",
              identifier: "ENG-42",
              url: "https://linear.app/acme/issue/ENG-42",
            },
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    const rejected = await t.action(internal.workItemHandoffs.reconcileInternal, {
      handoffId: reservation.handoff._id,
    });
    expect(rejected).toMatchObject({
      reconciliationCount: 0,
      lifecycle: { state: "unknown" },
    });
    expect(await t.run(async (ctx) => ctx.db.get(ids.connectionId))).toMatchObject({
      health: "needs_attention",
    });

    const repaired = await owner.action(api.workItemHandoffs.check, {
      projectId: ids.projectId,
      requestId: ids.requestId,
      provider: "linear",
    });

    expect(repaired?.lifecycle.state).toBe("succeeded");
    expect(await t.run(async (ctx) => ctx.db.get(ids.connectionId))).toMatchObject({
      health: "active",
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("atomically allows only one caller to send", async () => {
    const { ids, owner, t } = await seed();
    const [first, second] = await Promise.all([
      owner.mutation(internal.workItemHandoffs.reserveInternal, reservationArgs(ids)),
      owner.mutation(internal.workItemHandoffs.reserveInternal, reservationArgs(ids)),
    ]);

    expect(second.handoff._id).toBe(first.handoff._id);
    if (
      first.handoff.recovery.provider !== "linear" ||
      second.handoff.recovery.provider !== "linear"
    ) {
      throw new Error("Expected Linear recovery data");
    }
    expect(second.handoff.recovery.issueId).toBe(first.handoff.recovery.issueId);
    expect([first.shouldSend, second.shouldSend].sort()).toEqual([false, true]);
    expect(
      await t.run(async (ctx) => await ctx.db.query("workItemHandoffs").collect()),
    ).toHaveLength(1);
  });

  it("retries a definite failure with fresh recovery data", async () => {
    const { ids, owner } = await seed();
    const first = await owner.mutation(
      internal.workItemHandoffs.reserveInternal,
      reservationArgs(ids, "stable-issue-id"),
    );
    await owner.mutation(internal.workItemHandoffs.completeFailedInternal, {
      handoffId: first.handoff._id,
      attemptCount: first.handoff.attemptCount,
      errorCode: "linear_rate_limited",
      errorMessage: "Linear rate limited the request",
    });

    const retry = await owner.mutation(
      internal.workItemHandoffs.reserveInternal,
      reservationArgs(ids, "different-issue-id"),
    );
    expect(retry.shouldSend).toBe(true);
    expect(retry.handoff.attemptCount).toBe(2);
    if (retry.handoff.recovery.provider !== "linear") {
      throw new Error("Expected Linear recovery data");
    }
    expect(retry.handoff.recovery.issueId).toBe("different-issue-id");
  });

  it("moves an expired pending attempt to unknown instead of retrying creation", async () => {
    const { ids, owner, t } = await seed();
    const reservation = await owner.mutation(
      internal.workItemHandoffs.reserveInternal,
      reservationArgs(ids),
    );
    await t.run(async (ctx) => {
      await ctx.db.patch(reservation.handoff._id, {
        lifecycle: { state: "pending", leaseExpiresAt: 0 },
      });
    });

    await expect(
      t.mutation(internal.workItemHandoffs.expirePendingInternal, {
        handoffId: reservation.handoff._id,
        attemptCount: 1,
      }),
    ).resolves.toBe(true);
    expect(await t.run(async (ctx) => ctx.db.get(reservation.handoff._id))).toMatchObject({
      lifecycle: { state: "unknown", errorCode: "handoff_lease_expired" },
    });
  });

  it("stops scheduled reconciliation after the bounded attempts", async () => {
    const { ids, owner, t } = await seed();
    const reservation = await owner.mutation(
      internal.workItemHandoffs.reserveInternal,
      reservationArgs(ids),
    );
    await owner.mutation(internal.workItemHandoffs.completeUnknownInternal, {
      handoffId: reservation.handoff._id,
      attemptCount: 1,
      errorCode: "linear_outcome_unknown",
      errorMessage: "Wish could not confirm whether Linear created the issue",
    });

    for (
      let expectedReconciliationCount = 0;
      expectedReconciliationCount < 4;
      expectedReconciliationCount += 1
    ) {
      await expect(
        t.mutation(internal.workItemHandoffs.completeReconciliationInternal, {
          handoffId: reservation.handoff._id,
          expectedReconciliationCount,
        }),
      ).resolves.toBe(true);
    }

    expect(await t.run(async (ctx) => ctx.db.get(reservation.handoff._id))).toMatchObject({
      reconciliationCount: 4,
      lifecycle: { state: "unknown" },
    });
  });

  it("accepts a confirmed success after a concurrent absence advanced the count", async () => {
    const { ids, owner, t } = await seed();
    const reservation = await owner.mutation(
      internal.workItemHandoffs.reserveInternal,
      reservationArgs(ids, "stable-issue-id"),
    );
    await owner.mutation(internal.workItemHandoffs.completeUnknownInternal, {
      handoffId: reservation.handoff._id,
      attemptCount: 1,
      errorCode: "linear_outcome_unknown",
      errorMessage: "Wish could not confirm whether Linear created the issue",
    });
    await t.mutation(internal.workItemHandoffs.completeReconciliationInternal, {
      handoffId: reservation.handoff._id,
      expectedReconciliationCount: 0,
    });

    await expect(
      t.mutation(internal.workItemHandoffs.completeReconciliationInternal, {
        handoffId: reservation.handoff._id,
        expectedReconciliationCount: 0,
        externalIdentity: {
          provider: "linear",
          id: "stable-issue-id",
          identifier: "ENG-42",
          url: "https://linear.app/acme/issue/ENG-42",
        },
      }),
    ).resolves.toBe(true);
    expect(await t.run(async (ctx) => ctx.db.get(reservation.handoff._id))).toMatchObject({
      reconciliationCount: 1,
      lifecycle: { state: "succeeded" },
    });
  });

  it("rejects completion from an older attempt", async () => {
    const { ids, owner } = await seed();
    const first = await owner.mutation(
      internal.workItemHandoffs.reserveInternal,
      reservationArgs(ids, "stable-issue-id"),
    );
    await owner.mutation(internal.workItemHandoffs.completeFailedInternal, {
      handoffId: first.handoff._id,
      attemptCount: 1,
      errorCode: "linear_rejected",
      errorMessage: "Linear rejected the issue",
    });
    await owner.mutation(
      internal.workItemHandoffs.reserveInternal,
      reservationArgs(ids, "ignored-issue-id"),
    );

    await expect(
      owner.mutation(internal.workItemHandoffs.completeSucceededInternal, {
        handoffId: first.handoff._id,
        attemptCount: 1,
        externalIdentity: {
          provider: "linear",
          id: "stable-issue-id",
          identifier: "ENG-42",
          url: "https://linear.app/acme/issue/ENG-42",
        },
      }),
    ).resolves.toBe(false);
  });

  it("blocks source deletion while unresolved and removes a settled Handoff", async () => {
    const { ids, owner, t } = await seed();
    const reservation = await owner.mutation(
      internal.workItemHandoffs.reserveInternal,
      reservationArgs(ids),
    );
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(owner.mutation(api.requests.deleteRequest, { id: ids.requestId })).rejects.toMatchObject({
      data: unresolvedWorkItemHandoffError,
    });
    await expect(
      owner.mutation(internal.requests.deleteRequestByApiKeyInternal, {
        id: ids.requestId,
        projectId: ids.projectId,
      }),
    ).rejects.toMatchObject({ data: unresolvedWorkItemHandoffError });
    await owner.mutation(internal.workItemHandoffs.completeFailedInternal, {
      handoffId: reservation.handoff._id,
      attemptCount: 1,
      errorCode: "linear_rejected",
      errorMessage: "Linear rejected the issue",
    });
    await expect(
      owner.mutation(api.requests.deleteRequest, { id: ids.requestId }),
    ).resolves.toBeNull();
    expect(await t.run(async (ctx) => ctx.db.get(reservation.handoff._id))).toBeNull();
  });

  it("does not let another Project Owner reserve a Handoff", async () => {
    const { ids, t } = await seed();
    await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Outsider", tokenIdentifier: "outsider-token" });
    });
    const outsider = t.withIdentity({ tokenIdentifier: "outsider-token" });

    await expect(
      outsider.mutation(internal.workItemHandoffs.reserveInternal, reservationArgs(ids)),
    ).rejects.toThrow("Not authorized to access this project");
  });
});
