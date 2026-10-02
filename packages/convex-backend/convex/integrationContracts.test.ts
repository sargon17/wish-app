import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { createIntegrationFixture, fixtureKey, measuredIntake } from "../test/integrationFixtures";

import { api, internal } from "./_generated/api";
import { hashProjectApiKey } from "./lib/apiKeys";
import { getWhatsNewEntry, listPublicChangelog } from "./lib/changelogIntake";
import { authorizeProjectKeyRequest } from "./lib/projectKeyAuthorization";
import {
  createComment,
  createRequest,
  listComments,
  listRequests,
  listUpvotes,
  toggleUpvote,
} from "./lib/requestIntake";

async function buckets(t: Awaited<ReturnType<typeof createIntegrationFixture>>["t"]) {
  return await t.run(async (ctx) => await ctx.db.query("apiRateLimits").collect());
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// The same public-boundary checks can run against the frozen original source.
describe("project integration security and data contracts", () => {
  it("keeps live revocation and denied-request accounting", async () => {
    const { t, ids } = await createIntegrationFixture();
    expect(
      await authorizeProjectKeyRequest(measuredIntake(t, "").ctx, ids.project, "read"),
    ).toMatchObject({ ok: false, error: { code: "missing_api_key" } });
    expect(await buckets(t)).toEqual([]);
    expect(
      await authorizeProjectKeyRequest(measuredIntake(t, "wrong-key").ctx, ids.project, "read"),
    ).toMatchObject({ ok: false, error: { code: "invalid_api_key" } });
    expect((await buckets(t)).find((bucket) => bucket.bucket.startsWith("ip:"))?.count).toBe(1);
    await t.run(async (ctx) => await ctx.db.patch(ids.apiKey, { scopes: ["read"] }));
    expect(
      await authorizeProjectKeyRequest(measuredIntake(t).ctx, ids.project, "write"),
    ).toMatchObject({ ok: false, error: { code: "insufficient_scope" } });
    expect((await buckets(t)).find((bucket) => bucket.bucket.startsWith("key:"))?.count).toBe(1);
    expect((await t.run(async (ctx) => await ctx.db.get(ids.apiKey)))?.lastUsedAt).toBeUndefined();
    expect(
      await authorizeProjectKeyRequest(measuredIntake(t).ctx, ids.project, "read"),
    ).toMatchObject({ ok: true });
    expect((await t.run(async (ctx) => await ctx.db.get(ids.apiKey)))?.lastUsedAt).toBeTypeOf(
      "number",
    );
    await t.run(async (ctx) => await ctx.db.patch(ids.apiKey, { status: "revoked" }));
    expect(
      await authorizeProjectKeyRequest(measuredIntake(t).ctx, ids.project, "read"),
    ).toMatchObject({ ok: false, error: { code: "invalid_api_key" } });
    expect((await buckets(t)).find((bucket) => bucket.bucket.startsWith("key:"))?.count).toBe(2);
  });

  it("keeps legacy key migration and project boundaries", async () => {
    const { t, ids } = await createIntegrationFixture();
    await t.run(async (ctx) => {
      await ctx.db.delete(ids.apiKey);
      await ctx.db.patch(ids.project, { apiKeyHash: await hashProjectApiKey(fixtureKey) });
    });
    expect(
      await authorizeProjectKeyRequest(measuredIntake(t).ctx, ids.project, "admin"),
    ).toMatchObject({ ok: true });
    const migrated = await t.run(async (ctx) => await ctx.db.query("apiKeys").collect());
    expect(migrated).toHaveLength(1);
    expect(migrated[0]).toMatchObject({
      keyPrefix: fixtureKey.slice(0, 16),
      scopes: ["read", "write", "admin"],
    });
    expect((await t.run(async (ctx) => await ctx.db.get(ids.project)))?.apiKeyHash).toBeUndefined();
    expect(
      await authorizeProjectKeyRequest(measuredIntake(t).ctx, ids.otherProject, "read"),
    ).toMatchObject({ ok: false, error: { code: "invalid_api_key" } });
  });

  it("keeps exhausted limit accounting and permits a new window", async () => {
    const { t, ids } = await createIntegrationFixture();
    await t.run(
      async (ctx) =>
        await ctx.db.insert("apiRateLimits", {
          bucket: `key:${ids.apiKey}`,
          count: 120,
          windowStartedAt: Date.now(),
        }),
    );
    expect(
      await authorizeProjectKeyRequest(measuredIntake(t).ctx, ids.project, "read"),
    ).toMatchObject({ ok: false, error: { code: "rate_limited" } });
    expect((await buckets(t)).find((bucket) => bucket.bucket.startsWith("ip:"))?.count).toBe(1);
    expect((await buckets(t)).find((bucket) => bucket.bucket.startsWith("key:"))?.count).toBe(120);
    await t.run(async (ctx) => {
      const bucket = await ctx.db
        .query("apiRateLimits")
        .withIndex("by_bucket", (q) => q.eq("bucket", `key:${ids.apiKey}`))
        .unique();
      await ctx.db.patch(bucket!._id, { windowStartedAt: Date.now() - 60_001 });
    });
    expect(
      await authorizeProjectKeyRequest(measuredIntake(t).ctx, ids.project, "read"),
    ).toMatchObject({ ok: true });
    expect((await buckets(t)).find((bucket) => bucket.bucket.startsWith("key:"))?.count).toBe(1);
  });

  it("accounts for concurrent authorized and denied requests", async () => {
    const { t, ids } = await createIntegrationFixture();
    const results = await Promise.all(
      Array.from({ length: 16 }, (_, index) =>
        authorizeProjectKeyRequest(
          measuredIntake(t, index % 2 ? fixtureKey : "wrong").ctx,
          ids.project,
          "read",
        ),
      ),
    );
    expect(results.filter((result) => result.ok)).toHaveLength(8);
    expect((await buckets(t)).find((bucket) => bucket.bucket.startsWith("ip:"))?.count).toBe(16);
    expect((await buckets(t)).find((bucket) => bucket.bucket.startsWith("key:"))?.count).toBe(8);
  });

  it("preserves lists, release visibility, submission, voting, and comments", async () => {
    const { t, ids } = await createIntegrationFixture();
    const ctx = measuredIntake(t).ctx;
    const listed = await listRequests(ctx, ids.project);
    if (!listed.ok) throw new Error("Request list denied");
    expect(listed.requests).toHaveLength(99);
    expect(listed.requests[0]).toMatchObject({
      _id: ids.request,
      computedStatus: { _id: ids.status, displayName: "Open" },
    });
    expect(await getWhatsNewEntry(ctx, ids.project, " 2.0 ")).toMatchObject({
      ok: true,
      entry: { title: "Release 2" },
    });
    expect(await getWhatsNewEntry(ctx, ids.project, "3.0")).toMatchObject({
      ok: true,
      entry: null,
    });
    expect(await listPublicChangelog(ctx, ids.project)).toMatchObject({
      ok: true,
      entries: [{ versionLabel: "2.0" }, { versionLabel: "1.0" }],
    });
    const comments = await listComments(ctx, ids.project, ids.request);
    if (!comments.ok) throw new Error("Comments denied");
    expect(comments.comments).toHaveLength(10);
    await toggleUpvote(ctx, ids.project, ids.request, "fixture-client");
    expect(await listUpvotes(ctx, ids.project, "fixture-client")).toMatchObject({
      ok: true,
      upvotes: [ids.request],
    });
    await toggleUpvote(ctx, ids.project, ids.request, "fixture-client");
    expect(await listUpvotes(ctx, ids.project, "fixture-client")).toMatchObject({
      ok: true,
      upvotes: [],
    });
    await createComment(ctx, ids.project, ids.request, {
      clientId: "fixture-client",
      body: "Please keep the selected filters.",
    });
    await createRequest(ctx, ids.project, { text: "Search reports", clientId: "fixture-client" });
    expect(await t.run(async (ctx) => await ctx.db.query("requests").collect())).toHaveLength(101);
  });
});

describe("Telegram local delivery contract", () => {
  it("preserves payload, topic routing, and project isolation", async () => {
    const { t, ids } = await createIntegrationFixture();
    expect(
      await t.query(internal.telegramNotifications.buildMessageInternal, {
        deliveryId: ids.delivery,
      }),
    ).toMatchObject({
      chat_id: "fixture-chat",
      message_thread_id: 7,
      text: expect.stringContaining("Export report 0"),
    });
    await t.run(async (ctx) => await ctx.db.patch(ids.connector, { projectId: ids.otherProject }));
    expect(
      await t.query(internal.telegramNotifications.buildMessageInternal, {
        deliveryId: ids.delivery,
      }),
    ).toBeNull();
  });

  it.each(["success", "rejected", "network"])(
    "persists %s once without an automatic provider retry",
    async (outcome) => {
      const { t, ids } = await createIntegrationFixture();
      const send = vi.fn(async () => {
        if (outcome === "network") throw new Error("Fixture network failure");
        return new Response(outcome === "success" ? "{}" : "Rejected", {
          status: outcome === "success" ? 200 : 503,
        });
      });
      vi.stubGlobal("fetch", send);
      await t.action(internal.telegramNotifications.dispatchInternal, { deliveryId: ids.delivery });
      expect(send).toHaveBeenCalledOnce();
      expect(await t.run(async (ctx) => await ctx.db.get(ids.delivery))).toMatchObject({
        status: outcome === "success" ? "sent" : "failed",
        attemptCount: 1,
      });
      await t.mutation(internal.telegramNotifications.markFailedInternal, {
        deliveryId: ids.delivery,
        error: "late error",
      });
      if (outcome === "success")
        expect(await t.run(async (ctx) => await ctx.db.get(ids.delivery))).toMatchObject({
          status: "sent",
          attemptCount: 1,
        });
    },
  );
});

describe("MCP local protocol contract", () => {
  it("keeps whitelisted tool access and immediate token revocation", async () => {
    const { t, ids, mcp } = await createIntegrationFixture();
    const request = (name: string, args: unknown = {}) =>
      mcp.fetch("/mcp", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name, arguments: args },
        }),
      });
    const list = await request("list_admin_actions");
    expect(list.status).toBe(200);
    expect(JSON.stringify(await list.json())).toContain("list_requests");
    const result = await request("wish_admin", { action: "list_projects", args: {} });
    expect(JSON.stringify(await result.json())).toContain("Fixture Project");
    const invalid = await request("wish_admin", { action: "not_allowed", args: {} });
    expect(JSON.stringify(await invalid.json())).toContain("error");
    await t.run(async (ctx) => await ctx.db.patch(ids.mcpToken, { revokedAt: Date.now() }));
    expect((await request("list_admin_actions")).status).toBe(500);
    await expect(mcp.query(api.projects.getProjectsForUser, {})).rejects.toThrow(
      "invalid or expired",
    );
  });
});

it("keeps HTTP errors, cross-project guards, and delete contracts", async () => {
  const { t, ids } = await createIntegrationFixture();
  const headers = {
    "x-api-key": fixtureKey,
    "content-type": "application/json",
    "x-forwarded-for": "192.0.2.20",
  };
  const url = `/api/project/${ids.project}`;
  expect((await t.fetch(`${url}/whats-new?version=2.0`, { headers })).status).toBe(200);
  expect(await (await t.fetch(`${url}/whats-new/exists?version=3.0`, { headers })).json()).toEqual({
    hasPublishedNotes: false,
  });
  expect((await t.fetch(`${url}/requests/`, { headers: { "x-api-key": "wrong" } })).status).toBe(
    401,
  );
  const foreign = await t.run(
    async (ctx) =>
      await ctx.db.insert("requests", {
        text: "Foreign request",
        project: ids.otherProject,
        status: ids.status,
        clientId: "fixture-client",
      }),
  );
  expect((await t.fetch(`${url}/request/${foreign}/comments`, { headers })).status).toBe(404);
  const comment = await t.run(
    async (ctx) =>
      await ctx.db.insert("requestComments", {
        requestId: ids.request,
        projectId: ids.project,
        authorType: "client",
        authorClientId: "fixture-client",
        body: "Delete this comment",
        createdAt: 1,
      }),
  );
  expect(
    (
      await t.fetch(`${url}/request/${ids.request}/comment/${comment}?clientId=fixture-client`, {
        method: "DELETE",
        headers,
      })
    ).status,
  ).toBe(200);
  expect(await t.run(async (ctx) => await ctx.db.get(comment))).toBeNull();
  expect(
    (await t.fetch(`${url}/request/${ids.request}`, { method: "DELETE", headers })).status,
  ).toBe(200);
  expect(await t.run(async (ctx) => await ctx.db.get(ids.request))).toBeNull();
});

it("settles a stalled Telegram response after one bounded send", async () => {
  const { t, ids } = await createIntegrationFixture();
  const send = vi.fn(async (_url: string, init: RequestInit) => {
    const signal = init.signal;
    if (!signal) throw new Error("Missing delivery deadline");
    return await new Promise<Response>((_resolve, reject) =>
      signal.addEventListener("abort", () => reject(signal.reason), { once: true }),
    );
  });
  vi.stubGlobal("fetch", send);
  await t.action(internal.telegramNotifications.dispatchInternal, { deliveryId: ids.delivery });
  expect(send).toHaveBeenCalledOnce();
  expect(await t.run(async (ctx) => await ctx.db.get(ids.delivery))).toMatchObject({
    status: "failed",
    attemptCount: 1,
    lastError: expect.stringContaining("timeout"),
  });
}, 7000);
