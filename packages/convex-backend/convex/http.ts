import { type } from "arktype";
import type { HonoWithConvex } from "convex-helpers/server/hono";
import { HttpRouterWithHono } from "convex-helpers/server/hono";
import { Hono } from "hono";

import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";
import { getProjectApiKeyPrefix, hasApiKeyScope, verifyProjectApiKeyHash } from "./lib/apiKeys";
import { toPublicProject } from "./lib/projectPublic";
import {
  createPublicError,
  publicErrorJson,
  toPublicErrorResponse,
} from "./lib/publicErrors";

const app: HonoWithConvex<ActionCtx> = new Hono();
const API_KEY_RATE_LIMIT = { limit: 120, windowMs: 60_000 };
const IP_RATE_LIMIT = { limit: 240, windowMs: 60_000 };

function getApiKeyFromRequest(c: any) {
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

async function authorizeProjectRequest(
  c: any,
  projectId: string,
  requiredScope: "read" | "write" | "admin",
): Promise<{ project: Doc<"projects">; apiKey: Doc<"apiKeys"> } | { response: Response }> {
  const apiKey = getApiKeyFromRequest(c);
  if (!apiKey) {
    return { response: publicErrorJson(c, createPublicError("missing_api_key")) };
  }

  const project = await c.env.runQuery(internal.projects.getProjectByIdInternal, {
    id: projectId as Id<"projects">,
  });
  if (!project) {
    return { response: publicErrorJson(c, createPublicError("not_found")) };
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
      response: publicErrorJson(c, createPublicError("rate_limited", undefined, ipRateLimit.retryAfterMs)),
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
    return { response: publicErrorJson(c, createPublicError("invalid_api_key")) };
  }

  const keyRateLimit = await c.env.runMutation(internal.rateLimits.checkRateLimitInternal, {
    bucket: `key:${matchedApiKey._id}`,
    limit: API_KEY_RATE_LIMIT.limit,
    windowMs: API_KEY_RATE_LIMIT.windowMs,
  });

  if (!keyRateLimit.allowed) {
    return {
      response: publicErrorJson(c, createPublicError("rate_limited", undefined, keyRateLimit.retryAfterMs)),
    };
  }

  if (!hasApiKeyScope(matchedApiKey.scopes, requiredScope)) {
    return {
      response: publicErrorJson(c, createPublicError("insufficient_scope")),
    };
  }

  await c.env.runMutation(internal.apiKeys.markUsedInternal, {
    apiKeyId: matchedApiKey._id,
    keyPrefix,
  });

  return { project, apiKey: matchedApiKey };
}

function getClientIpAddress(c: any) {
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

async function checkIpRateLimit(c: any) {
  const clientIp = getClientIpAddress(c);
  const ipRateLimit = await c.env.runMutation(internal.rateLimits.checkRateLimitInternal, {
    bucket: `ip:${clientIp}`,
    limit: IP_RATE_LIMIT.limit,
    windowMs: IP_RATE_LIMIT.windowMs,
  });

  if (!ipRateLimit.allowed) {
    return publicErrorJson(c, createPublicError("rate_limited", undefined, ipRateLimit.retryAfterMs));
  }

  return null;
}

async function assertRequestBelongsToProject(
  c: any,
  requestId: string,
  projectId: string,
): Promise<{ response: Response } | { requestId: Id<"requests"> }> {
  const request = await c.env.runQuery(internal.requests.getRequestByIdInternal, {
    id: requestId as Id<"requests">,
  });
  if (!request) {
    return { response: publicErrorJson(c, createPublicError("not_found")) };
  }

  if (request.project !== (projectId as Id<"projects">)) {
    return { response: publicErrorJson(c, createPublicError("not_found")) };
  }

  return { requestId: request._id };
}

app.get("/api/project/:id/requests/", async (c) => {
  const id = c.req.param("id");

  const authorization = await authorizeProjectRequest(c, id, "read");
  if ("response" in authorization) {
    return authorization.response;
  }

  const project = authorization.project;
  const projectId = id as Id<"projects">;
  const requests = await c.env.runQuery(internal.requests.getByProjectInternal, { id: projectId });
  const requestStatuses = await c.env.runQuery(internal.requestStatuses.getByProjectInternal, {
    id: projectId,
  });

  const mappedRequests = requests.map((request) => {
    const computedStatus = requestStatuses.find((status) => status._id === request.status)!;
    return { ...request, computedStatus };
  });

  return c.json({
    project: toPublicProject(project),
    requests: mappedRequests,
  });
});

app.get("/api/changelog/:slug", async (c) => {
  const slug = c.req.param("slug");

  if (!slug) {
    return publicErrorJson(c, createPublicError("validation_failed"));
  }

  const rateLimitedResponse = await checkIpRateLimit(c);
  if (rateLimitedResponse) {
    return rateLimitedResponse;
  }

  const feed = await c.env.runQuery(internal.changelogEntries.getPublicBySlugInternal, { slug });

  if (!feed) {
    return publicErrorJson(c, createPublicError("not_found"));
  }

  return c.json(feed, 200);
});

app.get("/api/project/:id/upvotes", async (c) => {
  const id = c.req.param("id");
  const clientId = c.req.query("clientId");

  try {
    if (!id) throw createPublicError("validation_failed");

    const upvotes = await c.env.runQuery(api.requestUpvotes.getViewerUpvotesByProject, {
      projectId: id as Id<"projects">,
      clientId: clientId || undefined,
    });

    return c.json({ upvotes }, 200);
  } catch (error) {
    return publicErrorJson(c, toPublicErrorResponse(error));
  }
});

const RequestValidator = type({
  text: "string > 3",
  "description?": "string | undefined",
  project: "string",
  clientId: "string",
});

const UpvoteValidator = type({
  clientId: "string",
});

const CommentValidator = type({
  clientId: "string",
  body: "string > 0",
});

app.post("/api/project/:id/request/", async (c) => {
  const id = c.req.param("id");

  try {
    const rawBody = await c.req.json();
    const body = (() => {
      try {
        return RequestValidator.assert(rawBody);
      } catch {
        throw createPublicError("validation_failed");
      }
    })();
    const authorization = await authorizeProjectRequest(c, id, "write");
    if ("response" in authorization) {
      return authorization.response;
    }

    const project = authorization.project;
    const status = (
      await c.env.runQuery(internal.requestStatuses.getByProjectInternal, {
        id: id as Id<"projects">,
      })
    ).find(
      (v) => v.name === "open",
    );

    if (!project || !status) throw createPublicError("not_found");

    await c.env.runMutation(api.requests.create, {
      ...body,
      project: project._id,
      status: status._id,
    });
  } catch (error) {
    return publicErrorJson(c, toPublicErrorResponse(error));
  }

  return c.json({}, 200);
});

app.delete("/api/project/:id/request/:reqID", async (c) => {
  const reqId = c.req.param("reqID");
  const projectId = c.req.param("id");

  try {
    const authorization = await authorizeProjectRequest(c, projectId, "admin");
    if ("response" in authorization) {
      return authorization.response;
    }

    if (!reqId) throw createPublicError("validation_failed");
    const requestAuthorization = await assertRequestBelongsToProject(c, reqId, projectId);
    if ("response" in requestAuthorization) {
      return requestAuthorization.response;
    }

    await c.env.runMutation(internal.requests.deleteRequestByApiKeyInternal, {
      id: requestAuthorization.requestId,
      projectId: projectId as Id<"projects">,
    });
  } catch (error) {
    return publicErrorJson(c, toPublicErrorResponse(error));
  }

  return c.json({}, 200);
});

app.get("/api/project/:id/request/:reqID/comments", async (c) => {
  const reqId = c.req.param("reqID");
  const projectId = c.req.param("id");

  try {
    const authorization = await authorizeProjectRequest(c, projectId, "read");
    if ("response" in authorization) {
      return authorization.response;
    }

    if (!reqId) throw createPublicError("validation_failed");
    const requestAuthorization = await assertRequestBelongsToProject(c, reqId, projectId);
    if ("response" in requestAuthorization) {
      return requestAuthorization.response;
    }

    const comments = await c.env.runQuery(internal.requestComments.listByRequestInternal, {
      requestId: requestAuthorization.requestId,
    });

    return c.json({ comments }, 200);
  } catch (error) {
    return publicErrorJson(c, toPublicErrorResponse(error));
  }
});

app.post(
  "/api/project/:id/request/:reqID/comment",
  async (c) => {
    const reqId = c.req.param("reqID");
    const projectId = c.req.param("id");

    try {
      const rawBody = await c.req.json();
      const body = (() => {
        try {
          return CommentValidator.assert(rawBody);
        } catch {
          throw createPublicError("validation_failed");
        }
      })();
      const authorization = await authorizeProjectRequest(c, projectId, "write");
      if ("response" in authorization) {
        return authorization.response;
      }

      if (!reqId || !projectId) throw createPublicError("validation_failed");
      const requestAuthorization = await assertRequestBelongsToProject(c, reqId, projectId);
      if ("response" in requestAuthorization) {
        return requestAuthorization.response;
      }

      await c.env.runMutation(api.requestComments.create, {
        requestId: requestAuthorization.requestId,
        projectId: projectId as Id<"projects">,
        clientId: body.clientId,
        body: body.body,
      });
    } catch (error) {
      return publicErrorJson(c, toPublicErrorResponse(error));
    }

    return c.json({}, 200);
  },
);

app.delete("/api/project/:id/request/:reqID/comment/:commentId", async (c) => {
  const id = c.req.param("id");
  const reqId = c.req.param("reqID");
  const commentId = c.req.param("commentId");
  const clientId = c.req.query("clientId");
  const authHeader = c.req.header("Authorization");

  try {
    if (!id || !reqId || !commentId) throw createPublicError("validation_failed");
    if (!clientId && !authHeader) throw createPublicError("validation_failed");

    await c.env.runMutation(api.requestComments.deleteByClient, {
      id: commentId as Id<"requestComments">,
      requestId: reqId as Id<"requests">,
      projectId: id as Id<"projects">,
      clientId: clientId || undefined,
    });
  } catch (error) {
    return publicErrorJson(c, toPublicErrorResponse(error));
  }

  return c.json({}, 200);
});

app.post(
  "/api/project/:id/request/:reqID/upvote",
  async (c) => {
    const reqId = c.req.param("reqID");
    const projectId = c.req.param("id");

    try {
      const rawBody = await c.req.json();
      const body = (() => {
        try {
          return UpvoteValidator.assert(rawBody);
        } catch {
          throw createPublicError("validation_failed");
        }
      })();
      const authorization = await authorizeProjectRequest(c, projectId, "write");
      if ("response" in authorization) {
        return authorization.response;
      }

      if (!reqId || !projectId) throw createPublicError("validation_failed");
      const requestAuthorization = await assertRequestBelongsToProject(c, reqId, projectId);
      if ("response" in requestAuthorization) {
        return requestAuthorization.response;
      }

      await c.env.runMutation(api.requestUpvotes.toggle, {
        requestId: requestAuthorization.requestId,
        projectId: projectId as Id<"projects">,
        clientId: body.clientId,
      });
    } catch (error) {
      return publicErrorJson(c, toPublicErrorResponse(error));
    }

    return c.json({}, 200);
  },
);

export default new HttpRouterWithHono(app);
