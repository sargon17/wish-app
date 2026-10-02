import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { createIntegrationFixture, fixtureEncryptionKey } from "../test/integrationFixtures";

import { internal } from "./_generated/api";
import { serializeCredentials } from "./lib/linearConnection";
import { encryptWorkTrackerSecret } from "./lib/workTrackerSecrets";

async function encryptedCredentials(index: number) {
  return await encryptWorkTrackerSecret(
    serializeCredentials(
      {
        accessToken: `access-${index}`,
        refreshToken: `refresh-${index}`,
        expiresIn: 3600,
        scopes: ["read", "issues:create"],
      },
      Date.now(),
    ),
    fixtureEncryptionKey,
  );
}

async function cleanupFixture(operation: "setups" | "connections", count = 11) {
  const fixture = await createIntegrationFixture();
  const encrypted = await Promise.all(
    Array.from({ length: count }, (_, index) => encryptedCredentials(index)),
  );
  const now = Date.now();
  const records = await fixture.t.run(async (ctx) => {
    const originalConnection = await ctx.db.get(fixture.ids.connection);
    if (!originalConnection) throw new Error("Missing fixture connection");
    const { _id, _creationTime, ...connection } = originalConnection;
    const ids = [];
    for (let index = 0; index < count; index++) {
      if (operation === "setups") {
        ids.push(
          await ctx.db.insert("workTrackerOAuthSetups", {
            projectId: fixture.ids.project,
            provider: "linear",
            stateHash: `state-${index}`,
            data: {
              provider: "linear",
              stage: "exchanged",
              redirectUri: "http://localhost:3000/work-trackers/linear/callback",
              encryptedCredentials: encrypted[index]!,
            },
            createdBy: fixture.ids.user,
            createdAt: now - 60_000,
            expiresAt: now - 1,
          }),
        );
      } else {
        const projectId = await ctx.db.insert("projects", {
          title: `Cleanup ${index}`,
          user: fixture.ids.user,
        });
        ids.push(
          await ctx.db.insert("workTrackerConnections", {
            ...connection,
            projectId,
            data: {
              ...connection.data,
              pendingRevocation: { encryptedCredentials: encrypted[index]!, retryAt: now - 1 },
            },
          }),
        );
      }
    }
    return ids;
  });
  return { ...fixture, records, now };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

// Real actions, disposable database records, and local provider responses only.
describe("bounded Linear cleanup", () => {
  it.each(["setups", "connections"] as const)(
    "settles ten %s with at most three active provider requests",
    async (operation) => {
      const { t, records } = await cleanupFixture(operation);
      let active = 0;
      let peak = 0;
      const tokens: string[] = [];
      vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
        tokens.push(new URLSearchParams(String(init.body)).get("token")!);
        active++;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active--;
        return new Response(null, { status: 200 });
      });
      await t.action(
        operation === "setups"
          ? internal.linearWorkTrackerCleanup.cleanupExpiredLinearSetupsInternal
          : internal.linearWorkTrackerCleanup.cleanupPendingLinearRevocationsInternal,
        {},
      );
      expect(tokens).toHaveLength(10);
      expect(new Set(tokens).size).toBe(10);
      expect(peak).toBeGreaterThan(1);
      expect(peak).toBeLessThanOrEqual(3);
      expect(active).toBe(0);
      const saved = await t.run(
        async (ctx) => await Promise.all(records.map((id) => ctx.db.get(id))),
      );
      if (operation === "setups") expect(saved.filter(Boolean)).toHaveLength(1);
      else
        expect(
          saved.filter(
            (record) =>
              record &&
              "data" in record &&
              "pendingRevocation" in record.data &&
              record.data.pendingRevocation,
          ),
        ).toHaveLength(1);
    },
  );

  it("keeps failed setup retries and protects a changed expiry", async () => {
    const { t, records, now } = await cleanupFixture("setups", 3);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      const token = new URLSearchParams(String(init.body)).get("token");
      if (token === "refresh-2")
        await t.run(async (ctx) => await ctx.db.patch(records[2]!, { expiresAt: now + 60_000 }));
      return new Response(null, { status: token === "refresh-1" ? 503 : 200 });
    });
    await t.action(internal.linearWorkTrackerCleanup.cleanupExpiredLinearSetupsInternal, {});
    const saved = await t.run(
      async (ctx) => await Promise.all(records.map((id) => ctx.db.get(id))),
    );
    expect(saved[0]).toBeNull();
    expect(saved[1]).toMatchObject({ expiresAt: expect.any(Number) });
    if (!saved[1] || !("expiresAt" in saved[1])) throw new Error("Missing retry setup");
    expect(saved[1].expiresAt).toBeGreaterThanOrEqual(now + 300_000);
    expect(saved[2]).toMatchObject({ expiresAt: now + 60_000 });
  });

  it("settles mixed connection results without changing rotated credentials", async () => {
    const { t, records, now } = await cleanupFixture("connections", 4);
    const replacement = await encryptedCredentials(100);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      const token = new URLSearchParams(String(init.body)).get("token");
      if (token === "refresh-2" || token === "refresh-3") {
        const id = records[token === "refresh-2" ? 2 : 3]!;
        await t.run(async (ctx) => {
          const record = await ctx.db.get(id);
          if (!record || !("data" in record) || !("pendingRevocation" in record.data))
            throw new Error("Missing connection");
          await ctx.db.patch(id, {
            data: {
              ...record.data,
              pendingRevocation: { encryptedCredentials: replacement, retryAt: now + 60_000 },
            },
          });
        });
      }
      return new Response(null, {
        status: token === "refresh-1" || token === "refresh-3" ? 503 : 200,
      });
    });
    await t.action(internal.linearWorkTrackerCleanup.cleanupPendingLinearRevocationsInternal, {});
    const saved = await t.run(
      async (ctx) => await Promise.all(records.map((id) => ctx.db.get(id))),
    );
    expect(saved[0]).toMatchObject({
      data: expect.not.objectContaining({ pendingRevocation: expect.anything() }),
    });
    expect(saved[1]).toMatchObject({
      data: { pendingRevocation: { retryAt: expect.any(Number) } },
    });
    for (const record of saved.slice(2))
      expect(record).toMatchObject({
        data: { pendingRevocation: { encryptedCredentials: replacement, retryAt: now + 60_000 } },
      });
  });
});
