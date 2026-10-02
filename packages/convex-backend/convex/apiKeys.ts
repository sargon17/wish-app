import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import {
  generateProjectApiKey,
  getProjectApiKeyPrefix,
  getProjectApiKeyPreview,
  hashProjectApiKey,
  normalizeApiKeyScopes,
  hasApiKeyScope,
  verifyProjectApiKeyHash,
} from "./lib/apiKeys";
import { assertProjectOwner, getCurrentUser } from "./lib/authorization";
import {
  API_KEY_RATE_LIMIT,
  IP_RATE_LIMIT,
  type ProjectKeyAuthorizationResult,
} from "./lib/projectKeyAuthorization";
import { createPublicError, publicErrorCodes } from "./lib/publicErrors";
import { checkRateLimit } from "./rateLimits";
import schema from "./schema";

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

async function migrateLegacyProjectApiKey(ctx: MutationCtx, projectId: Id<"projects">) {
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

async function getActiveKeysByPrefix(
  ctx: QueryCtx | MutationCtx,
  args: Pick<Doc<"apiKeys">, "projectId" | "keyPrefix">,
) {
  return await ctx.db
    .query("apiKeys")
    .withIndex("by_prefix_status", (q) => q.eq("keyPrefix", args.keyPrefix).eq("status", "active"))
    .filter((q) => q.eq(q.field("projectId"), args.projectId))
    .collect();
}

async function getLegacyPlaceholderKeys(
  ctx: QueryCtx | MutationCtx,
  args: Pick<Doc<"apiKeys">, "projectId">,
) {
  return await ctx.db
    .query("apiKeys")
    .withIndex("by_project_status", (q) => q.eq("projectId", args.projectId).eq("status", "active"))
    .filter((q) => q.eq(q.field("keyPrefix"), LEGACY_KEY_PREFIX_PLACEHOLDER))
    .collect();
}

export const getActiveKeysByPrefixInternal = internalQuery({
  args: { projectId: v.id("projects"), keyPrefix: v.string() },
  handler: getActiveKeysByPrefix,
});

export const getLegacyPlaceholderKeysInternal = internalQuery({
  args: { projectId: v.id("projects") },
  handler: getLegacyPlaceholderKeys,
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

// One transaction keeps revocation, rate limits, and usage writes current.
export const authorizeRequestInternal = internalMutation({
  args: {
    projectId: v.id("projects"),
    apiKey: v.string(),
    clientIp: v.string(),
    requiredScope: apiKeyScopeValidator,
  },
  returns: v.union(
    v.object({
      ok: v.literal(true),
      project: v.object({
        ...schema.tables.projects.validator.fields,
        _id: v.id("projects"),
        _creationTime: v.number(),
      }),
      apiKey: v.object({
        ...schema.tables.apiKeys.validator.fields,
        _id: v.id("apiKeys"),
        _creationTime: v.number(),
      }),
    }),
    v.object({
      ok: v.literal(false),
      error: v.object({
        code: v.union(...publicErrorCodes.map((code) => v.literal(code))),
        error: v.optional(v.string()),
        retryAfterMs: v.optional(v.number()),
      }),
    }),
  ),
  handler: async (ctx, args): Promise<ProjectKeyAuthorizationResult> => {
    if (!args.apiKey) return { ok: false, error: createPublicError("missing_api_key") };
    const project = await ctx.db.get(args.projectId);
    if (!project) return { ok: false, error: createPublicError("not_found") };

    await migrateLegacyProjectApiKey(ctx, project._id);
    const ipLimit = await checkRateLimit(ctx, {
      bucket: `ip:${args.clientIp}`,
      ...IP_RATE_LIMIT,
    });
    // Return denials so consumed rate-limit slots commit with the result.
    if (!ipLimit.allowed)
      return {
        ok: false,
        error: createPublicError("rate_limited", undefined, ipLimit.retryAfterMs),
      };

    const keyPrefix = getProjectApiKeyPrefix(args.apiKey);
    const prefixMatches = await getActiveKeysByPrefix(ctx, { projectId: project._id, keyPrefix });
    const candidates =
      prefixMatches.length > 0
        ? prefixMatches
        : await getLegacyPlaceholderKeys(ctx, { projectId: project._id });
    let matched: Doc<"apiKeys"> | undefined;
    for (const candidate of candidates) {
      if (await verifyProjectApiKeyHash(candidate.keyHash, args.apiKey)) {
        matched = candidate;
        break;
      }
    }
    if (!matched) return { ok: false, error: createPublicError("invalid_api_key") };

    const keyLimit = await checkRateLimit(ctx, {
      bucket: `key:${matched._id}`,
      ...API_KEY_RATE_LIMIT,
    });
    if (!keyLimit.allowed)
      return {
        ok: false,
        error: createPublicError("rate_limited", undefined, keyLimit.retryAfterMs),
      };
    if (!hasApiKeyScope(matched.scopes, args.requiredScope))
      return { ok: false, error: createPublicError("insufficient_scope") };

    await ctx.db.patch(matched._id, {
      lastUsedAt: Date.now(),
      ...(matched.keyPrefix === LEGACY_KEY_PREFIX_PLACEHOLDER ? { keyPrefix } : {}),
    });
    return { ok: true, project, apiKey: matched };
  },
});
