import { type } from "arktype";
import type { HonoWithConvex } from "convex-helpers/server/hono";
import { HttpRouterWithHono } from "convex-helpers/server/hono";
import { Hono } from "hono";

import { arktypeValidator } from "@hono/arktype-validator";

import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";
import { getProjectApiKeyPrefix, hasApiKeyScope, verifyProjectApiKeyHash } from "./lib/apiKeys";
import { toPublicProject } from "./lib/projectPublic";

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
    return { response: c.json({ error: "Missing API key", code: "missing_api_key" }, 401) };
  }

  const project = await c.env.runQuery(internal.projects.getProjectByIdInternal, {
    id: projectId as Id<"projects">,
  });
  if (!project) {
    return { response: c.json({ error: "Project not found", code: "project_not_found" }, 404) };
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
      response: c.json(
        {
          error: "Too many requests",
          code: "rate_limited",
          retryAfterMs: ipRateLimit.retryAfterMs,
        },
        429,
      ),
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
    return { response: c.json({ error: "Invalid API key", code: "invalid_api_key" }, 401) };
  }

  const keyRateLimit = await c.env.runMutation(internal.rateLimits.checkRateLimitInternal, {
    bucket: `key:${matchedApiKey._id}`,
    limit: API_KEY_RATE_LIMIT.limit,
    windowMs: API_KEY_RATE_LIMIT.windowMs,
  });

  if (!keyRateLimit.allowed) {
    return {
      response: c.json(
        {
          error: "Too many requests",
          code: "rate_limited",
          retryAfterMs: keyRateLimit.retryAfterMs,
        },
        429,
      ),
    };
  }

  if (!hasApiKeyScope(matchedApiKey.scopes, requiredScope)) {
    return {
      response: c.json({ error: "Insufficient API key scope", code: "insufficient_scope" }, 403),
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

async function assertRequestBelongsToProject(
  c: any,
  requestId: string,
  projectId: string,
): Promise<{ response: Response } | { requestId: Id<"requests"> }> {
  const request = await c.env.runQuery(internal.requests.getRequestByIdInternal, {
    id: requestId as Id<"requests">,
  });
  if (!request) {
    return { response: c.json({ error: "Request not found" }, 404) };
  }

  if (request.project !== (projectId as Id<"projects">)) {
    return { response: c.json({ error: "Request not found" }, 404) };
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

app.get("/api/project/:id/upvotes", async (c) => {
  const id = c.req.param("id");
  const clientId = c.req.query("clientId");

  try {
    if (!id) throw new Error("invalid project id");

    const upvotes = await c.env.runQuery(api.requestUpvotes.getViewerUpvotesByProject, {
      projectId: id as Id<"projects">,
      clientId: clientId || undefined,
    });

    return c.json({ upvotes }, 200);
  } catch {
    return c.json({}, 400);
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

app.post("/api/project/:id/request/", arktypeValidator("json", RequestValidator), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.valid("json");

  try {
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

    if (!project || !status) throw new Error("invalid project or status");

    await c.env.runMutation(api.requests.create, {
      ...body,
      project: project._id,
      status: status._id,
    });
  } catch {
    return c.json({}, 400);
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

    if (!reqId) throw new Error("invalid request id");
    const requestAuthorization = await assertRequestBelongsToProject(c, reqId, projectId);
    if ("response" in requestAuthorization) {
      return requestAuthorization.response;
    }

    await c.env.runMutation(internal.requests.deleteRequestByApiKeyInternal, {
      id: requestAuthorization.requestId,
      projectId: projectId as Id<"projects">,
    });
  } catch {
    return c.json({}, 400);
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

    if (!reqId) throw new Error("invalid request id");
    const requestAuthorization = await assertRequestBelongsToProject(c, reqId, projectId);
    if ("response" in requestAuthorization) {
      return requestAuthorization.response;
    }

    const comments = await c.env.runQuery(internal.requestComments.listByRequestInternal, {
      requestId: requestAuthorization.requestId,
    });

    return c.json({ comments }, 200);
  } catch {
    return c.json({}, 400);
  }
});

app.post(
  "/api/project/:id/request/:reqID/comment",
  arktypeValidator("json", CommentValidator),
  async (c) => {
    const reqId = c.req.param("reqID");
    const projectId = c.req.param("id");
    const body = await c.req.valid("json");

    try {
      const authorization = await authorizeProjectRequest(c, projectId, "write");
      if ("response" in authorization) {
        return authorization.response;
      }

      if (!reqId || !projectId) throw new Error("invalid request id");
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
    } catch {
      return c.json({}, 400);
    }

    return c.json({}, 200);
  },
);

app.post(
  "/api/project/:id/request/:reqID/upvote",
  arktypeValidator("json", UpvoteValidator),
  async (c) => {
    const reqId = c.req.param("reqID");
    const projectId = c.req.param("id");
    const body = c.req.valid("json");

    try {
      const authorization = await authorizeProjectRequest(c, projectId, "write");
      if ("response" in authorization) {
        return authorization.response;
      }

      if (!reqId || !projectId) throw new Error("invalid request id");
      const requestAuthorization = await assertRequestBelongsToProject(c, reqId, projectId);
      if ("response" in requestAuthorization) {
        return requestAuthorization.response;
      }

      await c.env.runMutation(api.requestUpvotes.toggle, {
        requestId: requestAuthorization.requestId,
        projectId: projectId as Id<"projects">,
        clientId: body.clientId,
      });
    } catch {
      return c.json({}, 400);
    }

    return c.json({}, 200);
  },
);

export default new HttpRouterWithHono(app);
