import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";

import { createPublicError } from "./publicErrors";

export const API_KEY_RATE_LIMIT = { limit: 120, windowMs: 60_000 };
export const IP_RATE_LIMIT = { limit: 240, windowMs: 60_000 };

export type ProjectOperationScope = "read" | "write" | "admin";

export type ProjectKeyAuthorizationContext = {
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

export type ProjectKeyAuthorizationResult =
  | ProjectKeyAuthorizationSuccess
  | ProjectKeyAuthorizationFailure;

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

  return await c.env.runMutation(internal.apiKeys.authorizeRequestInternal, {
    projectId: projectId as Id<"projects">,
    apiKey,
    clientIp: getClientIpAddress(c),
    requiredScope,
  });
}
