import { convexTest } from "convex-test";
import { describe, expect, it } from "vite-plus/test";

import { internal } from "./_generated/api";
import schema from "./schema";

const modules = {
  "./_generated/server.ts": () => import("./_generated/server"),
  "./workItemHandoffs.ts": () => import("./workItemHandoffs"),
};

describe("Work Item Handoff reservation", () => {
  it("atomically reuses the Handoff reserved for a source and provider", async () => {
    const t = convexTest(schema, modules);
    const { projectId, requestId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Owner",
        tokenIdentifier: "owner-token",
      });
      const projectId = await ctx.db.insert("projects", { title: "Project", user: userId });
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
      await ctx.db.insert("workTrackerConnections", {
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
      return { projectId, requestId };
    });

    const args = { projectId, requestId, provider: "linear" as const };
    const [first, second] = await Promise.all([
      t.mutation(internal.workItemHandoffs.reserveInternal, args),
      t.mutation(internal.workItemHandoffs.reserveInternal, args),
    ]);

    expect(second._id).toBe(first._id);
    expect(second.recovery.issueId).toBe(first.recovery.issueId);
    expect(await t.run(async (ctx) => await ctx.db.query("workItemHandoffs").collect())).toHaveLength(
      1,
    );
  });
});
