import { convexTest } from "convex-test";
import type { FunctionReference } from "convex/server";
import { vi } from "vite-plus/test";

import { hashProjectApiKey } from "../convex/lib/apiKeys";
import { serializeCredentials } from "../convex/lib/linearConnection";
import { hashMcpTokenId } from "../convex/lib/mcpToken";
import { encryptWorkTrackerSecret } from "../convex/lib/workTrackerSecrets";
import schema from "../convex/schema";

const modules = {
  "./_generated/server.ts": () => import("../convex/_generated/server"),
  "./apiKeys.ts": () => import("../convex/apiKeys"),
  "./changelogEntries.ts": () => import("../convex/changelogEntries"),
  "./http.ts": () => import("../convex/http"),
  "./linearWorkItemHandoffs.ts": () => import("../convex/linearWorkItemHandoffs"),
  "./linearWorkTrackerCleanup.ts": () => import("../convex/linearWorkTrackerCleanup"),
  "./linearWorkTrackerOAuth.ts": () => import("../convex/linearWorkTrackerOAuth"),
  "./linearWorkTrackerSettings.ts": () => import("../convex/linearWorkTrackerSettings"),
  "./mcpTokens.ts": () => import("../convex/mcpTokens"),
  "./notificationConnectors.ts": () => import("../convex/notificationConnectors"),
  "./notificationEvents.ts": () => import("../convex/notificationEvents"),
  "./projects.ts": () => import("../convex/projects"),
  "./rateLimits.ts": () => import("../convex/rateLimits"),
  "./requestComments.ts": () => import("../convex/requestComments"),
  "./requestStatuses.ts": () => import("../convex/requestStatuses"),
  "./requestUpvotes.ts": () => import("../convex/requestUpvotes"),
  "./requests.ts": () => import("../convex/requests"),
  "./schema.ts": () => import("../convex/schema"),
  "./stats.ts": () => import("../convex/stats"),
  "./suggestionPortals.ts": () => import("../convex/suggestionPortals"),
  "./telegramBot.ts": () => import("../convex/telegramBot"),
  "./telegramNotifications.ts": () => import("../convex/telegramNotifications"),
  "./users.ts": () => import("../convex/users"),
  "./waitlist.ts": () => import("../convex/waitlist"),
  "./workItemHandoffs.ts": () => import("../convex/workItemHandoffs"),
  "./workTrackerConnections.ts": () => import("../convex/workTrackerConnections"),
};
export const fixtureKey = "wish_pk_fixture012345678901234567890";
export const fixtureEncryptionKey = btoa(String.fromCharCode(...new Uint8Array(32).fill(7)));

export async function createIntegrationFixture() {
  vi.stubEnv("LINEAR_CLIENT_ID", "fixture-id");
  vi.stubEnv("LINEAR_CLIENT_SECRET", "fixture-secret");
  vi.stubEnv("LINEAR_REDIRECT_URI", "http://localhost:3000/work-trackers/linear/callback");
  vi.stubEnv("WORK_TRACKER_ENCRYPTION_KEY", fixtureEncryptionKey);
  vi.stubEnv("WISH_APP_BASE_URL", "http://localhost:3000");
  vi.stubEnv("LINEAR_HANDOFF_CREATION_ENABLED", "true");
  vi.stubEnv("WISH_MCP_JWT_ISSUER", "https://fixture-issuer");
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "fixture-token");
  vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "fixture-webhook-secret");
  const t = convexTest(schema, modules);
  const keyHash = await hashProjectApiKey(fixtureKey);
  const encryptedCredentials = await encryptWorkTrackerSecret(
    serializeCredentials(
      {
        accessToken: "fixture-access",
        refreshToken: "fixture-refresh",
        expiresIn: 3600,
        scopes: ["read", "issues:create"],
      },
      Date.now(),
    ),
    fixtureEncryptionKey,
  );
  const ids = await t.run(async (ctx) => {
    const user = await ctx.db.insert("users", { name: "Owner", tokenIdentifier: "fixture-owner" });
    const project = await ctx.db.insert("projects", {
      title: "Fixture Project",
      user,
      projectSlug: "fixture-project",
    });
    const otherProject = await ctx.db.insert("projects", { title: "Other", user });
    const status = await ctx.db.insert("requestStatuses", {
      name: "open",
      displayName: "Open",
      type: "custom",
      project,
      position: 0,
    });
    const apiKey = await ctx.db.insert("apiKeys", {
      projectId: project,
      name: "Fixture",
      keyPrefix: fixtureKey.slice(0, 16),
      keyHash,
      scopes: ["read", "write", "admin"],
      status: "active",
      createdAt: 1,
      createdBy: user,
    });
    const requests = [];
    for (let index = 0; index < 100; index++)
      requests.push(
        await ctx.db.insert("requests", {
          text: `Export report ${index}`,
          description: "Export the current report with the filters that the customer selected.",
          clientId: "fixture-client",
          status,
          project,
          kind: index === 99 ? "complaint" : "request",
        }),
      );
    const request = requests[0]!;
    for (let index = 0; index < 10; index++)
      await ctx.db.insert("requestComments", {
        requestId: request,
        projectId: project,
        authorType: "client",
        authorClientId: "fixture-client",
        body: `Comment ${index}: Keep the selected filters.`,
        createdAt: index,
      });
    for (let index = 1; index <= 3; index++)
      await ctx.db.insert("changelogEntries", {
        projectId: project,
        versionLabel: `${index}.0`,
        versionLabelNormalized: `${index}.0`,
        title: `Release ${index}`,
        summary: "Export and search improvements.",
        features: [
          {
            title: "Export reports",
            description: "Save the current report with its filters.",
            icon: "download",
          },
        ],
        type: "improvement",
        status: index === 3 ? "draft" : "published",
        publishedAt: index === 3 ? undefined : index,
        createdAt: index,
        updatedAt: index,
        createdBy: user,
        updatedBy: user,
      });
    const connector = await ctx.db.insert("notificationConnectors", {
      projectId: project,
      kind: "telegram",
      enabled: true,
      eventTypes: ["request.created"],
      telegramChatId: "fixture-chat",
      telegramMessageThreadId: 7,
      createdBy: user,
      createdAt: 1,
      updatedAt: 1,
    });
    const event = await ctx.db.insert("notificationEvents", {
      projectId: project,
      type: "request.created",
      requestId: request,
      createdAt: 1,
    });
    const delivery = await ctx.db.insert("notificationDeliveries", {
      eventId: event,
      projectId: project,
      connectorId: connector,
      connectorKind: "telegram",
      status: "pending",
      attemptCount: 0,
      createdAt: 1,
      updatedAt: 1,
    });
    const connection = await ctx.db.insert("workTrackerConnections", {
      projectId: project,
      provider: "linear",
      health: "active",
      destinationLabel: "Engineering",
      data: {
        provider: "linear",
        organizationId: "org",
        organizationName: "Fixture",
        organizationUrlKey: "fixture",
        teamId: "team",
        teamKey: "ENG",
        teamName: "Engineering",
        encryptedCredentials,
      },
      createdBy: user,
      createdAt: 1,
      updatedAt: 1,
    });
    const mcpToken = await ctx.db.insert("mcpTokens", {
      userId: user,
      tokenHash: await hashMcpTokenId("fixture-mcp-token"),
      createdAt: 1,
      expiresAt: Date.now() + 60_000,
    });
    return {
      user,
      project,
      otherProject,
      status,
      apiKey,
      request,
      requests,
      connector,
      event,
      delivery,
      connection,
      mcpToken,
    };
  });
  const owner = t.withIdentity({ tokenIdentifier: "fixture-owner" });
  const mcp = t.withIdentity({
    subject: ids.user,
    issuer: "https://fixture-issuer",
    "properties.mcpTokenId": "fixture-mcp-token",
  });
  return { t, ids, owner, mcp };
}

export function measuredIntake(
  t: Awaited<ReturnType<typeof createIntegrationFixture>>["t"],
  key = fixtureKey,
  boundaryDelayMs = 0,
) {
  const calls: string[] = [];
  async function wait() {
    if (boundaryDelayMs) await new Promise((resolve) => setTimeout(resolve, boundaryDelayMs));
  }
  return {
    calls,
    ctx: {
      req: {
        header: (name: string) =>
          name === "x-api-key" ? key : name === "x-forwarded-for" ? "192.0.2.10" : undefined,
      },
      env: {
        runQuery: async (fn: FunctionReference<"query">, args: Record<string, unknown>) => {
          calls.push("query");
          await wait();
          return await t.query(fn, args);
        },
        runMutation: async (fn: FunctionReference<"mutation">, args: Record<string, unknown>) => {
          calls.push("mutation");
          await wait();
          return await t.mutation(fn, args);
        },
      },
    } as never,
  };
}
