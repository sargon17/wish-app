import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  action,
  internalAction,
  internalMutation,
} from "./_generated/server";
import { assertProjectOwner, getCurrentUser } from "./lib/authorization";
import {
  getLinearConfig,
  getWorkTrackerEncryptionKey,
  LINEAR_AUTHORIZED_SETUP_TTL_MS,
  LINEAR_OAUTH_STATE_TTL_MS,
  parseStoredCredentials,
  serializeCredentials,
  validateLinearRedirectUri,
} from "./lib/linearConnection";
import {
  buildLinearAuthorizationUrl,
  createLinearOAuthState,
  discoverLinearWorkspace,
  exchangeLinearAuthorizationCode,
  hashLinearOAuthState,
  revokeLinearCredentials,
} from "./lib/linearOAuth";
import {
  decryptWorkTrackerSecret,
  encryptWorkTrackerSecret,
} from "./lib/workTrackerSecrets";

export const createLinearOAuthSetupInternal = internalMutation({
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
    const existingSetup = await ctx.db
      .query("workTrackerOAuthSetups")
      .withIndex("by_project_provider", (q) =>
        q.eq("projectId", args.projectId).eq("provider", "linear"),
      )
      .unique();
    if (existingSetup && existingSetup.data.stage !== "pending") {
      throw new Error("Discard the existing Linear authorization before starting again");
    }
    if (existingSetup) {
      await ctx.db.delete(existingSetup._id);
    }

    return await ctx.db.insert("workTrackerOAuthSetups", {
      projectId: args.projectId,
      provider: "linear",
      stateHash: args.stateHash,
      data: {
        provider: "linear",
        stage: "pending",
        redirectUri: validateLinearRedirectUri(args.redirectUri),
      },
      createdBy: user._id,
      createdAt: args.createdAt,
      expiresAt: args.expiresAt,
    });
  },
});

export const beginLinearOAuth = action({
  args: {
    projectId: v.id("projects"),
    promptForWorkspace: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{ authorizationUrl: string }> => {
    const config = getLinearConfig();
    const state = createLinearOAuthState();
    const now = Date.now();
    await ctx.runMutation(internal.linearWorkTrackerOAuth.createLinearOAuthSetupInternal, {
      projectId: args.projectId,
      stateHash: await hashLinearOAuthState(state),
      redirectUri: config.redirectUri,
      createdAt: now,
      expiresAt: now + LINEAR_OAUTH_STATE_TTL_MS,
    });

    return {
      authorizationUrl: buildLinearAuthorizationUrl({
        clientId: config.clientId,
        redirectUri: config.redirectUri,
        state,
        promptForWorkspace: args.promptForWorkspace,
      }),
    };
  },
});

export const claimLinearOAuthSetupInternal = internalMutation({
  args: { stateHash: v.string(), now: v.number() },
  handler: async (ctx, args) => {
    const setup = await ctx.db
      .query("workTrackerOAuthSetups")
      .withIndex("by_state_hash", (q) => q.eq("stateHash", args.stateHash))
      .unique();
    if (!setup || setup.provider !== "linear" || setup.consumedAt || setup.expiresAt <= args.now) {
      throw new Error("Invalid or expired Linear OAuth state");
    }
    const project = await ctx.db.get(setup.projectId);
    if (!project || project.user !== setup.createdBy) {
      throw new Error("Invalid or expired Linear OAuth state");
    }

    await ctx.db.patch(setup._id, { consumedAt: args.now });
    const redirectUri = setup.data.redirectUri;
    return {
      setupId: setup._id,
      projectId: project._id,
      projectSlug: project.projectSlug ?? "project",
      redirectUri: validateLinearRedirectUri(redirectUri),
    };
  },
});

export const saveLinearOAuthCredentialsInternal = internalMutation({
  args: {
    setupId: v.id("workTrackerOAuthSetups"),
    encryptedCredentials: v.object({ ciphertext: v.string(), iv: v.string() }),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const setup = await ctx.db.get(args.setupId);
    if (
      !setup ||
      setup.provider !== "linear" ||
      !setup.consumedAt ||
      setup.data.stage !== "pending"
    ) {
      throw new Error("Linear OAuth setup is no longer available");
    }
    await ctx.db.patch(setup._id, {
      data: {
        provider: "linear",
        stage: "exchanged",
        redirectUri: setup.data.redirectUri,
        encryptedCredentials: args.encryptedCredentials,
      },
      expiresAt: args.expiresAt,
    });
  },
});

export const saveLinearOAuthAuthorizationInternal = internalMutation({
  args: {
    setupId: v.id("workTrackerOAuthSetups"),
    organization: v.object({ id: v.string(), name: v.string(), urlKey: v.string() }),
    teams: v.array(v.object({ id: v.string(), key: v.string(), name: v.string() })),
  },
  handler: async (ctx, args) => {
    const setup = await ctx.db.get(args.setupId);
    if (!setup?.consumedAt || setup.data.stage !== "exchanged") {
      throw new Error("Linear OAuth setup is no longer available");
    }
    await ctx.db.patch(setup._id, {
      data: {
        ...setup.data,
        stage: "ready",
        authorization: { organization: args.organization, teams: args.teams },
      },
    });
  },
});

export const disposeLinearOAuthSetupInternal = internalMutation({
  args: { setupId: v.id("workTrackerOAuthSetups"), deleteSetup: v.boolean(), now: v.number() },
  handler: async (ctx, args) => {
    const setup = await ctx.db.get(args.setupId);
    if (!setup) return;
    if (args.deleteSetup) {
      await ctx.db.delete(setup._id);
    } else {
      await ctx.db.patch(setup._id, { expiresAt: args.now });
    }
  },
});

export const completeLinearOAuthInternal = internalAction({
  args: { code: v.string(), state: v.string(), providerError: v.optional(v.string()) },
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
    let refreshToken: string | undefined;
    let credentialsPersisted = false;
    let stage = "state";
    try {
      const claimedSetup = await ctx.runMutation(
        internal.linearWorkTrackerOAuth.claimLinearOAuthSetupInternal,
        { stateHash: await hashLinearOAuthState(args.state), now: Date.now() },
      );
      claimed = claimedSetup;
      if (args.providerError || !args.code || args.code.length > 4096) {
        await ctx.runMutation(internal.linearWorkTrackerOAuth.disposeLinearOAuthSetupInternal, {
          setupId: claimedSetup.setupId,
          deleteSetup: true,
          now: Date.now(),
        });
        return {
          ok: false,
          errorCode: args.providerError ? "authorization_denied" : "invalid_callback",
          ...claimedSetup,
        };
      }
      stage = "exchange";
      const config = getLinearConfig();
      const token = await exchangeLinearAuthorizationCode({
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        redirectUri: claimedSetup.redirectUri,
        code: args.code,
      });
      refreshToken = token.refreshToken;
      stage = "persistence";
      const now = Date.now();
      const encryptedCredentials = await encryptWorkTrackerSecret(
        serializeCredentials(token, now),
        config.encryptionKey,
      );
      await ctx.runMutation(internal.linearWorkTrackerOAuth.saveLinearOAuthCredentialsInternal, {
        setupId: claimedSetup.setupId,
        encryptedCredentials,
        expiresAt: now + LINEAR_AUTHORIZED_SETUP_TTL_MS,
      });
      credentialsPersisted = true;
      stage = "discovery";
      const discovery = await discoverLinearWorkspace(token.accessToken);
      stage = "persistence";
      await ctx.runMutation(internal.linearWorkTrackerOAuth.saveLinearOAuthAuthorizationInternal, {
        setupId: claimedSetup.setupId,
        organization: discovery.organization,
        teams: discovery.teams,
      });
      return { ok: true, ...claimedSetup };
    } catch (error) {
      let revoked = false;
      if (refreshToken) {
        try {
          await revokeLinearCredentials(refreshToken);
          revoked = true;
        } catch {
          // Persisted credentials are left for the cleanup job to retry.
        }
      }
      if (claimed) {
        await ctx.runMutation(internal.linearWorkTrackerOAuth.disposeLinearOAuthSetupInternal, {
          setupId: claimed.setupId,
          deleteSetup: !credentialsPersisted || revoked,
          now: Date.now(),
        });
      }
      console.error("Linear OAuth callback failed", {
        stage,
        setupId: claimed?.setupId,
        message: error instanceof Error ? error.message.slice(0, 200) : "Unknown error",
      });
      return {
        ok: false,
        errorCode: stage === "state" ? "invalid_state" : `linear_${stage}_failed`,
        projectId: claimed?.projectId,
        projectSlug: claimed?.projectSlug,
      };
    }
  },
});

export const claimLinearOAuthSetupDiscardInternal = internalMutation({
  args: { projectId: v.id("projects"), setupId: v.id("workTrackerOAuthSetups") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertProjectOwner(ctx, args.projectId, user._id);
    const setup = await ctx.db.get(args.setupId);
    if (!setup || setup.projectId !== args.projectId || setup.provider !== "linear") {
      return null;
    }
    if (setup.data.stage === "pending") {
      await ctx.db.delete(setup._id);
      return null;
    }
    await ctx.db.patch(setup._id, {
      data: {
        provider: "linear",
        stage: "discarding",
        redirectUri: setup.data.redirectUri,
        encryptedCredentials: setup.data.encryptedCredentials,
      },
      expiresAt: Date.now(),
    });
    return {
      encryptedCredentials: setup.data.encryptedCredentials,
      setupId: setup._id,
    };
  },
});

export const discardLinearOAuthSetup = action({
  args: { projectId: v.id("projects"), setupId: v.id("workTrackerOAuthSetups") },
  handler: async (ctx, args): Promise<{ discarded: true }> => {
    const setup = await ctx.runMutation(
      internal.linearWorkTrackerOAuth.claimLinearOAuthSetupDiscardInternal,
      args,
    );
    if (!setup) return { discarded: true };
    const credentials = parseStoredCredentials(
      await decryptWorkTrackerSecret(setup.encryptedCredentials, getWorkTrackerEncryptionKey()),
    );
    await revokeLinearCredentials(credentials.refreshToken);
    await ctx.runMutation(internal.linearWorkTrackerOAuth.disposeLinearOAuthSetupInternal, {
      setupId: setup.setupId,
      deleteSetup: true,
      now: Date.now(),
    });
    return { discarded: true };
  },
});
