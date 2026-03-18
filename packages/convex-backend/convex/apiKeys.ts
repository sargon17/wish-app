import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import {
  generateProjectApiKey,
  getProjectApiKeyPrefix,
  getProjectApiKeyPreview,
  hashProjectApiKey,
  normalizeApiKeyScopes,
} from "./lib/apiKeys";
import { assertProjectOwner, getCurrentUser } from "./lib/authorization";

const apiKeyScopeValidator = v.union(v.literal("read"), v.literal("write"), v.literal("admin"));
const apiKeyStatusValidator = v.union(v.literal("active"), v.literal("revoked"));
const LEGACY_KEY_PREFIX_PLACEHOLDER = "wish_pk_legacy";

function toPublicApiKey(apiKey: Doc<"apiKeys">) {
  const { keyHash, ...publicApiKey } = apiKey;

  return {
    ...publicApiKey,
    preview:
      apiKey.keyPrefix === LEGACY_KEY_PREFIX_PLACEHOLDER
        ? "Legacy key"
        : getProjectApiKeyPreview(apiKey.keyPrefix),
  };
}

export async function createApiKeyRecord(
  ctx: MutationCtx,
  args: {
    projectId: Id<"projects">;
    createdBy: Id<"users">;
    name: string;
    scopes: Array<"read" | "write" | "admin">;
    rawApiKey?: string;
  },
) {
  const apiKey = args.rawApiKey ?? generateProjectApiKey();
  const normalizedScopes = normalizeApiKeyScopes(args.scopes);
  const keyHash = await hashProjectApiKey(apiKey);
  const createdAt = Date.now();

  const apiKeyId = await ctx.db.insert("apiKeys", {
    projectId: args.projectId,
    name: args.name,
    keyPrefix: getProjectApiKeyPrefix(apiKey),
    keyHash,
    scopes: normalizedScopes,
    status: "active",
    createdAt,
    createdBy: args.createdBy,
  });

  return { apiKeyId, apiKey };
}

async function migrateLegacyProjectApiKey(
  ctx: MutationCtx,
  projectId: Id<"projects">,
) {
  const project = await ctx.db.get(projectId);
  if (!project?.apiKeyHash) {
    return { migrated: false };
  }

  const existingApiKeys = await ctx.db
    .query("apiKeys")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();

  if (existingApiKeys.length > 0) {
    return { migrated: false };
  }

  const apiKeyId = await ctx.db.insert("apiKeys", {
    projectId,
    name: "Legacy key",
    keyPrefix: LEGACY_KEY_PREFIX_PLACEHOLDER,
    keyHash: project.apiKeyHash,
    scopes: ["read", "write", "admin"],
    status: "active",
    createdAt: Date.now(),
    createdBy: project.user,
  });

  await ctx.db.patch(projectId, {
    apiKeyHash: undefined,
  });

  return { migrated: true, apiKeyId };
}

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertProjectOwner(ctx, args.projectId, user._id);

    const apiKeys = await ctx.db
      .query("apiKeys")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return apiKeys
      .sort((left, right) => right.createdAt - left.createdAt)
      .map((apiKey) => toPublicApiKey(apiKey));
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    scopes: v.array(apiKeyScopeValidator),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertProjectOwner(ctx, args.projectId, user._id);

    const name = args.name.trim();
    if (name.length < 2) {
      throw new Error("API key name is too short");
    }

    if (args.scopes.length === 0) {
      throw new Error("Select at least one API key scope");
    }

    return await createApiKeyRecord(ctx, {
      projectId: args.projectId,
      createdBy: user._id,
      name,
      scopes: args.scopes,
    });
  },
});

export const revoke = mutation({
  args: {
    projectId: v.id("projects"),
    apiKeyId: v.id("apiKeys"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertProjectOwner(ctx, args.projectId, user._id);

    const apiKey = await ctx.db.get(args.apiKeyId);
    if (!apiKey || apiKey.projectId !== args.projectId) {
      throw new Error("API key not found");
    }

    if (apiKey.status === "revoked") {
      return { revoked: false };
    }

    await ctx.db.patch(args.apiKeyId, {
      status: "revoked",
      revokedAt: Date.now(),
    });

    return { revoked: true };
  },
});

export const migrateLegacyForProject = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertProjectOwner(ctx, args.projectId, user._id);

    return await migrateLegacyProjectApiKey(ctx, args.projectId);
  },
});

export const getActiveKeysByPrefixInternal = internalQuery({
  args: {
    projectId: v.id("projects"),
    keyPrefix: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("apiKeys")
      .withIndex("by_prefix_status", (q) => q.eq("keyPrefix", args.keyPrefix).eq("status", "active"))
      .filter((q) => q.eq(q.field("projectId"), args.projectId))
      .collect();
  },
});

export const getLegacyPlaceholderKeysInternal = internalQuery({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("apiKeys")
      .withIndex("by_project_status", (q) =>
        q.eq("projectId", args.projectId).eq("status", "active"),
      )
      .filter((q) => q.eq(q.field("keyPrefix"), LEGACY_KEY_PREFIX_PLACEHOLDER))
      .collect();
  },
});

export const markUsedInternal = internalMutation({
  args: {
    apiKeyId: v.id("apiKeys"),
    keyPrefix: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = await ctx.db.get(args.apiKeyId);
    if (!apiKey) {
      return;
    }

    const patch: Partial<Doc<"apiKeys">> = {
      lastUsedAt: Date.now(),
    };

    if (args.keyPrefix && apiKey.keyPrefix === LEGACY_KEY_PREFIX_PLACEHOLDER) {
      patch.keyPrefix = args.keyPrefix;
    }

    await ctx.db.patch(args.apiKeyId, patch);
  },
});

export const migrateLegacyForProjectInternal = internalMutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    return await migrateLegacyProjectApiKey(ctx, args.projectId);
  },
});

export const getByProjectInternal = internalQuery({
  args: {
    projectId: v.id("projects"),
    status: v.optional(apiKeyStatusValidator),
  },
  handler: async (ctx, args) => {
    const apiKeys = args.status
      ? await ctx.db
          .query("apiKeys")
          .withIndex("by_project_status", (q) =>
            q.eq("projectId", args.projectId).eq("status", args.status!),
          )
          .collect()
      : await ctx.db
          .query("apiKeys")
          .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
          .collect();

    return apiKeys;
  },
});
