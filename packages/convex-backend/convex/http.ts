import { type } from "arktype";
import type { HonoWithConvex } from "convex-helpers/server/hono";
import { HttpRouterWithHono } from "convex-helpers/server/hono";
import { Hono } from "hono";

import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";
import {
  authorizeProjectKeyRequest,
  getClientIpAddress,
  IP_RATE_LIMIT,
} from "./lib/projectKeyAuthorization";
import { toPublicProject } from "./lib/projectPublic";
import {
  createPublicError,
  publicErrorJson,
  toPublicErrorResponse,
} from "./lib/publicErrors";

const app: HonoWithConvex<ActionCtx> = new Hono();

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
  try {
    const id = c.req.param("id");
    requirePublicId(id);

    const authorization = await authorizeProjectKeyRequest(c, id, "read");
    if (!authorization.ok) {
      return publicErrorJson(c, authorization.error);
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
  } catch (error) {
    return publicErrorJson(c, toPublicErrorResponse(error));
  }
});

app.get("/api/changelog/:slug", async (c) => {
  try {
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
  } catch (error) {
    return publicErrorJson(c, toPublicErrorResponse(error));
  }
});

app.get("/api/project/:id/upvotes", async (c) => {
  const id = c.req.param("id");
  const clientId = c.req.query("clientId");

  try {
    requirePublicId(id);
    if (clientId !== undefined && clientId.trim().length === 0) {
      throw createPublicError("validation_failed");
    }

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

function isPublicId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function requirePublicId(value: unknown) {
  if (!isPublicId(value)) {
    throw createPublicError("validation_failed");
  }
}

async function parsePublicBody(c: any, validator: { assert(value: unknown): any }) {
  try {
    const rawBody = await c.req.json();
    return validator.assert(rawBody);
  } catch {
    throw createPublicError("validation_failed");
  }
}

app.onError((error, c) => {
  return publicErrorJson(c, toPublicErrorResponse(error));
});

app.post("/api/project/:id/request/", async (c) => {
  const id = c.req.param("id");

  try {
    requirePublicId(id);
    const authorization = await authorizeProjectKeyRequest(c, id, "write");
    if (!authorization.ok) {
      return publicErrorJson(c, authorization.error);
    }

    const project = authorization.project;
    const body = await parsePublicBody(c, RequestValidator);
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
    requirePublicId(projectId);
    requirePublicId(reqId);
    const authorization = await authorizeProjectKeyRequest(c, projectId, "admin");
    if (!authorization.ok) {
      return publicErrorJson(c, authorization.error);
    }

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
    requirePublicId(projectId);
    requirePublicId(reqId);
    const authorization = await authorizeProjectKeyRequest(c, projectId, "read");
    if (!authorization.ok) {
      return publicErrorJson(c, authorization.error);
    }

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
      requirePublicId(projectId);
      requirePublicId(reqId);
      const authorization = await authorizeProjectKeyRequest(c, projectId, "write");
      if (!authorization.ok) {
        return publicErrorJson(c, authorization.error);
      }

      const requestAuthorization = await assertRequestBelongsToProject(c, reqId, projectId);
      if ("response" in requestAuthorization) {
        return requestAuthorization.response;
      }

      const body = await parsePublicBody(c, CommentValidator);
      const trimmedBody = body.body.trim();
      if (trimmedBody.length === 0 || trimmedBody.length > 1000 || body.clientId.trim().length === 0) {
        throw createPublicError("validation_failed");
      }

      await c.env.runMutation(api.requestComments.create, {
        requestId: requestAuthorization.requestId,
        projectId: projectId as Id<"projects">,
        clientId: body.clientId,
        body: trimmedBody,
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
    requirePublicId(id);
    requirePublicId(reqId);
    requirePublicId(commentId);
    if ((clientId !== undefined && clientId.trim().length === 0) || (!clientId && !authHeader)) {
      throw createPublicError("validation_failed");
    }

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
      requirePublicId(projectId);
      requirePublicId(reqId);
      const authorization = await authorizeProjectKeyRequest(c, projectId, "write");
      if (!authorization.ok) {
        return publicErrorJson(c, authorization.error);
      }

      const requestAuthorization = await assertRequestBelongsToProject(c, reqId, projectId);
      if ("response" in requestAuthorization) {
        return requestAuthorization.response;
      }

      const body = await parsePublicBody(c, UpvoteValidator);
      if (body.clientId.trim().length === 0) {
        throw createPublicError("validation_failed");
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
