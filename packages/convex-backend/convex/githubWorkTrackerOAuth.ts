import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, internalAction, internalMutation, mutation } from "./_generated/server";
import { assertProjectOwner, getCurrentUser } from "./lib/authorization";
import {
  buildGitHubInstallationUrl,
  discoverGitHubInstallation,
  exchangeGitHubUserCode,
  revokeGitHubUserCredentials,
} from "./lib/githubApp";
import {
  getGitHubConfig,
  getGitHubRevocationConfig,
  GITHUB_CALLBACK_CLAIM_TTL_MS,
  GITHUB_READY_SETUP_TTL_MS,
  GITHUB_REVOCATION_RETRY_MS,
  GITHUB_SETUP_STATE_TTL_MS,
  validateGitHubPrivateKey,
  validateGitHubRedirectUri,
} from "./lib/githubConnection";
import { githubSetupOrNull } from "./lib/workTrackerConnection";
import {
  createWorkTrackerOAuthState,
  hashWorkTrackerOAuthState,
} from "./lib/workTrackerOAuthState";
import { githubRepositoryValidator } from "./lib/workTrackerTypes";
import { encryptWorkTrackerSecret } from "./lib/workTrackerSecrets";

export const createGitHubSetupInternal = internalMutation({
  args: {
    projectId: v.id("projects"),
    stateHash: v.string(),
    redirectUri: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertProjectOwner(ctx, args.projectId, user._id);
    const existing = await ctx.db
      .query("workTrackerOAuthSetups")
      .withIndex("by_project_provider", (q) =>
        q.eq("projectId", args.projectId).eq("provider", "github"),
      )
      .unique();
    const githubSetup = githubSetupOrNull(existing);
    if (
      githubSetup?.data.stage === "discarding" ||
      (githubSetup?.data.stage === "pending" && githubSetup.consumedAt)
    ) {
      throw new Error("The previous GitHub authorization is still in progress");
    }
    if (existing) await ctx.db.delete(existing._id);
    return await ctx.db.insert("workTrackerOAuthSetups", {
      projectId: args.projectId,
      provider: "github",
      stateHash: args.stateHash,
      data: {
        provider: "github",
        stage: "pending",
        redirectUri: validateGitHubRedirectUri(args.redirectUri),
      },
      createdBy: user._id,
      createdAt: args.createdAt,
      expiresAt: args.expiresAt,
    });
  },
});

export const beginGitHubSetup = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args): Promise<{ authorizationUrl: string }> => {
    const config = getGitHubConfig();
    await validateGitHubPrivateKey(config.privateKey);
    const state = createWorkTrackerOAuthState();
    const now = Date.now();
    await ctx.runMutation(internal.githubWorkTrackerOAuth.createGitHubSetupInternal, {
      projectId: args.projectId,
      stateHash: await hashWorkTrackerOAuthState(state),
      redirectUri: config.redirectUri,
      createdAt: now,
      expiresAt: now + GITHUB_SETUP_STATE_TTL_MS,
    });
    return { authorizationUrl: buildGitHubInstallationUrl({ slug: config.slug, state }) };
  },
});

export const claimGitHubSetupInternal = internalMutation({
  args: { stateHash: v.string(), now: v.number() },
  handler: async (ctx, args) => {
    const setup = githubSetupOrNull(
      await ctx.db
        .query("workTrackerOAuthSetups")
        .withIndex("by_state_hash", (q) => q.eq("stateHash", args.stateHash))
        .unique(),
    );
    if (
      !setup ||
      setup.consumedAt ||
      setup.expiresAt <= args.now ||
      setup.data.stage !== "pending"
    ) {
      throw new Error("Invalid or expired GitHub setup state");
    }
    const project = await ctx.db.get(setup.projectId);
    if (!project || project.user !== setup.createdBy) {
      throw new Error("Invalid or expired GitHub setup state");
    }
    await ctx.db.patch(setup._id, {
      consumedAt: args.now,
      expiresAt: Math.max(setup.expiresAt, args.now + GITHUB_CALLBACK_CLAIM_TTL_MS),
    });
    return {
      setupId: setup._id,
      projectId: project._id,
      projectSlug: project.projectSlug ?? "project",
      redirectUri: validateGitHubRedirectUri(setup.data.redirectUri),
    };
  },
});

export const saveGitHubSetupInternal = internalMutation({
  args: {
    setupId: v.id("workTrackerOAuthSetups"),
    installationId: v.string(),
    accountLogin: v.string(),
    repositories: v.array(githubRepositoryValidator),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const setup = githubSetupOrNull(await ctx.db.get(args.setupId));
    if (!setup?.consumedAt || setup.data.stage !== "discarding") {
      throw new Error("GitHub setup is no longer available");
    }
    await ctx.db.patch(setup._id, {
      data: {
        provider: "github",
        stage: "ready",
        redirectUri: setup.data.redirectUri,
        installationId: args.installationId,
        accountLogin: args.accountLogin,
        repositories: args.repositories,
      },
      expiresAt: args.expiresAt,
    });
  },
});

export const saveGitHubDiscardingSetupInternal = internalMutation({
  args: {
    setupId: v.id("workTrackerOAuthSetups"),
    encryptedUserCredentials: v.object({ ciphertext: v.string(), iv: v.string() }),
    retryAt: v.number(),
  },
  handler: async (ctx, args) => {
    const setup = githubSetupOrNull(await ctx.db.get(args.setupId));
    if (!setup?.consumedAt || setup.data.stage !== "pending") {
      throw new Error("GitHub setup is no longer available");
    }
    await ctx.db.patch(setup._id, {
      data: {
        provider: "github",
        stage: "discarding",
        redirectUri: setup.data.redirectUri,
        encryptedUserCredentials: args.encryptedUserCredentials,
      },
      expiresAt: args.retryAt,
    });
  },
});

export const deleteGitHubSetupInternal = internalMutation({
  args: { setupId: v.id("workTrackerOAuthSetups") },
  handler: async (ctx, args) => {
    const setup = githubSetupOrNull(await ctx.db.get(args.setupId));
    if (setup) await ctx.db.delete(setup._id);
  },
});

export const completeGitHubSetupInternal = internalAction({
  args: {
    code: v.string(),
    state: v.string(),
    installationId: v.string(),
    providerError: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    | {
        ok: true;
        projectId: Id<"projects">;
        projectSlug: string;
        setupId: Id<"workTrackerOAuthSetups">;
      }
    | {
        ok: false;
        errorCode: string;
        projectId?: Id<"projects">;
        projectSlug?: string;
      }
  > => {
    if (args.state.length < 32 || args.state.length > 256) {
      return { ok: false, errorCode: "invalid_callback" };
    }
    let claimed:
      | {
          setupId: Id<"workTrackerOAuthSetups">;
          projectId: Id<"projects">;
          projectSlug: string;
          redirectUri: string;
        }
      | undefined;
    let userCredentials:
      | Awaited<ReturnType<typeof exchangeGitHubUserCode>>
      | undefined;
    let revocationPersisted = false;
    let stage = "state";
    try {
      const claimedSetup = await ctx.runMutation(
        internal.githubWorkTrackerOAuth.claimGitHubSetupInternal,
        {
          stateHash: await hashWorkTrackerOAuthState(args.state),
          now: Date.now(),
        },
      );
      claimed = claimedSetup;
      if (
        args.providerError ||
        !args.code ||
        args.code.length > 4096 ||
        !/^\d+$/.test(args.installationId)
      ) {
        await ctx.runMutation(internal.githubWorkTrackerOAuth.deleteGitHubSetupInternal, {
          setupId: claimedSetup.setupId,
        });
        return {
          ok: false,
          errorCode: args.providerError ? "authorization_denied" : "invalid_callback",
          projectId: claimedSetup.projectId,
          projectSlug: claimedSetup.projectSlug,
        };
      }
      const config = getGitHubConfig();
      stage = "exchange";
      userCredentials = await exchangeGitHubUserCode({
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        code: args.code,
        redirectUri: claimedSetup.redirectUri,
      });
      await ctx.runMutation(
        internal.githubWorkTrackerOAuth.saveGitHubDiscardingSetupInternal,
        {
          setupId: claimedSetup.setupId,
          encryptedUserCredentials: await encryptWorkTrackerSecret(
            JSON.stringify(userCredentials),
            config.encryptionKey,
          ),
          retryAt: Date.now() + GITHUB_REVOCATION_RETRY_MS,
        },
      );
      revocationPersisted = true;
      stage = "discovery";
      const discovery = await discoverGitHubInstallation({
        accessToken: userCredentials.accessToken,
        installationId: args.installationId,
      });
      stage = "revocation";
      await revokeGitHubUserCredentials({
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        credentials: userCredentials,
      });
      userCredentials = undefined;
      stage = "persistence";
      await ctx.runMutation(internal.githubWorkTrackerOAuth.saveGitHubSetupInternal, {
        setupId: claimedSetup.setupId,
        ...discovery,
        expiresAt: Date.now() + GITHUB_READY_SETUP_TTL_MS,
      });
      return {
        ok: true,
        setupId: claimedSetup.setupId,
        projectId: claimedSetup.projectId,
        projectSlug: claimedSetup.projectSlug,
      };
    } catch (error) {
      if (claimed && !revocationPersisted) {
        await ctx.runMutation(internal.githubWorkTrackerOAuth.deleteGitHubSetupInternal, {
          setupId: claimed.setupId,
        });
      }
      console.error("GitHub setup callback failed", {
        stage,
        setupId: claimed?.setupId,
        message: error instanceof Error ? error.message.slice(0, 200) : "Unknown error",
      });
      return {
        ok: false,
        errorCode: stage === "state" ? "invalid_state" : `github_${stage}_failed`,
        projectId: claimed?.projectId,
        projectSlug: claimed?.projectSlug,
      };
    } finally {
      if (userCredentials) {
        try {
          const config = getGitHubRevocationConfig();
          await revokeGitHubUserCredentials({
            clientId: config.clientId,
            clientSecret: config.clientSecret,
            credentials: userCredentials,
          });
          if (revocationPersisted && claimed) {
            await ctx.runMutation(internal.githubWorkTrackerOAuth.deleteGitHubSetupInternal, {
              setupId: claimed.setupId,
            });
          }
        } catch (error) {
          console.error("GitHub temporary user authorization revocation failed", {
            setupId: claimed?.setupId,
            message: error instanceof Error ? error.message.slice(0, 200) : "Unknown error",
          });
        }
      }
    }
  },
});

export const discardGitHubSetup = mutation({
  args: { projectId: v.id("projects"), setupId: v.id("workTrackerOAuthSetups") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertProjectOwner(ctx, args.projectId, user._id);
    const setup = githubSetupOrNull(await ctx.db.get(args.setupId));
    if (!setup || setup.projectId !== args.projectId) return { discarded: true };
    if (
      setup.data.stage === "discarding" ||
      (setup.data.stage === "pending" && setup.consumedAt)
    ) {
      throw new Error("GitHub authorization is still in progress");
    }
    await ctx.db.delete(setup._id);
    return { discarded: true };
  },
});
