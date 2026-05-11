import type { Doc, Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { getProjectApiKeyPrefix, hasApiKeyScope, verifyProjectApiKeyHash } from "./apiKeys";
import { createPublicError } from "./publicErrors";

export const API_KEY_RATE_LIMIT = { limit: 120, windowMs: 60_000 };
export const IP_RATE_LIMIT = { limit: 240, windowMs: 60_000 };

export type ProjectOperationScope = "read" | "write" | "admin";

type ProjectKeyAuthorizationContext = {
  req: {
    header(name: string): string | undefined;
  };
  env: Pick<ActionCtx, "runQuery" | "runMutation">;
};

type ProjectKeyAuthorizationSuccess = {
  ok: true;
  project: Doc<"projects">;
  apiKey: Doc<"apiKeys">;
};

type ProjectKeyAuthorizationFailure = {
  ok: false;
  error: ReturnType<typeof createPublicError>;
};

export type ProjectKeyAuthorizationResult = ProjectKeyAuthorizationSuccess | ProjectKeyAuthorizationFailure;

export function getProjectApiKeyFromRequest(c: ProjectKeyAuthorizationContext) {
  const headerKey = c.req.header("x-api-key");
  if (headerKey) {
    return headerKey.trim();
  }

  const authorization = c.req.header("authorization");
  if (!authorization) {
    return "";
  }

  if (authorization.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }

  return authorization.trim();
}

export function getClientIpAddress(c: ProjectKeyAuthorizationContext) {
  const forwardedFor = c.req.header("x-forwarded-for");
  if (forwardedFor) {
    const [firstIp] = forwardedFor.split(",");
    if (firstIp?.trim()) {
      return firstIp.trim();
    }
  }

  const realIp = c.req.header("x-real-ip");
  if (realIp?.trim()) {
    return realIp.trim();
  }

  return "unknown";
}

export async function authorizeProjectKeyRequest(
  c: ProjectKeyAuthorizationContext,
  projectId: string,
  requiredScope: ProjectOperationScope,
): Promise<ProjectKeyAuthorizationResult> {
  const apiKey = getProjectApiKeyFromRequest(c);
  if (!apiKey) {
    return { ok: false, error: createPublicError("missing_api_key") };
  }

  const project = await c.env.runQuery(internal.projects.getProjectByIdInternal, {
    id: projectId as Id<"projects">,
  });
  if (!project) {
    return { ok: false, error: createPublicError("not_found") };
  }

  await c.env.runMutation(internal.apiKeys.migrateLegacyForProjectInternal, {
    projectId: project._id,
  });

  const clientIp = getClientIpAddress(c);
  const ipRateLimit = await c.env.runMutation(internal.rateLimits.checkRateLimitInternal, {
    bucket: `ip:${clientIp}`,
    limit: IP_RATE_LIMIT.limit,
    windowMs: IP_RATE_LIMIT.windowMs,
  });

  if (!ipRateLimit.allowed) {
    return {
      ok: false,
      error: createPublicError("rate_limited", undefined, ipRateLimit.retryAfterMs),
    };
  }

  const keyPrefix = getProjectApiKeyPrefix(apiKey);
  const prefixMatches = await c.env.runQuery(internal.apiKeys.getActiveKeysByPrefixInternal, {
    projectId: project._id,
    keyPrefix,
  });
  const legacyMatches =
    prefixMatches.length > 0
      ? []
      : await c.env.runQuery(internal.apiKeys.getLegacyPlaceholderKeysInternal, {
          projectId: project._id,
        });

  const candidateApiKeys = [...prefixMatches, ...legacyMatches];
  let matchedApiKey: Doc<"apiKeys"> | null = null;

  for (const candidate of candidateApiKeys) {
    const isValid = await verifyProjectApiKeyHash(candidate.keyHash, apiKey);
    if (!isValid) {
      continue;
    }

    matchedApiKey = candidate;
    break;
  }

  if (!matchedApiKey) {
    return { ok: false, error: createPublicError("invalid_api_key") };
  }

  const keyRateLimit = await c.env.runMutation(internal.rateLimits.checkRateLimitInternal, {
    bucket: `key:${matchedApiKey._id}`,
    limit: API_KEY_RATE_LIMIT.limit,
    windowMs: API_KEY_RATE_LIMIT.windowMs,
  });

  if (!keyRateLimit.allowed) {
    return {
      ok: false,
      error: createPublicError("rate_limited", undefined, keyRateLimit.retryAfterMs),
    };
  }

  if (!hasApiKeyScope(matchedApiKey.scopes, requiredScope)) {
    return { ok: false, error: createPublicError("insufficient_scope") };
  }

  await c.env.runMutation(internal.apiKeys.markUsedInternal, {
    apiKeyId: matchedApiKey._id,
    keyPrefix,
  });

  return { ok: true, project, apiKey: matchedApiKey };
}
