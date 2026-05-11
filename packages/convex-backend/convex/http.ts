import { type } from "arktype";
import type { HonoWithConvex } from "convex-helpers/server/hono";
import { HttpRouterWithHono } from "convex-helpers/server/hono";
import { Hono } from "hono";

import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import { getClientIpAddress, IP_RATE_LIMIT } from "./lib/projectKeyAuthorization";
import {
  createComment,
  createRequest,
  deleteComment,
  deleteRequest,
  listComments,
  listRequests,
  listUpvotes,
  toggleUpvote,
} from "./lib/requestIntake";
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

app.get("/api/project/:id/requests/", async (c) => {
  try {
    const id = c.req.param("id");
    requirePublicId(id);

    const result = await listRequests(c, id);
    if (!result.ok) {
      return publicErrorJson(c, result.error);
    }

    return c.json({ project: toPublicProject(result.project), requests: result.requests });
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

    const result = await listUpvotes(c, id, clientId || undefined);
    if (!result.ok) {
      return publicErrorJson(c, result.error);
    }

    return c.json({ upvotes: result.upvotes }, 200);
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
    const body = await parsePublicBody(c, RequestValidator);
    const result = await createRequest(c, id, {
      text: body.text,
      description: body.description,
      clientId: body.clientId,
    });
    if (!result.ok) {
      return publicErrorJson(c, result.error);
    }
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
    const result = await deleteRequest(c, projectId, reqId);
    if (!result.ok) {
      return publicErrorJson(c, result.error);
    }
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
    const result = await listComments(c, projectId, reqId);
    if (!result.ok) {
      return publicErrorJson(c, result.error);
    }

    return c.json({ comments: result.comments }, 200);
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
      const body = await parsePublicBody(c, CommentValidator);
      const trimmedBody = body.body.trim();
      if (trimmedBody.length === 0 || trimmedBody.length > 1000 || body.clientId.trim().length === 0) {
        throw createPublicError("validation_failed");
      }

      const result = await createComment(c, projectId, reqId, {
        clientId: body.clientId,
        body: trimmedBody,
      });
      if (!result.ok) {
        return publicErrorJson(c, result.error);
      }
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

    await deleteComment(c, id, reqId, commentId, clientId || undefined);
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
      const body = await parsePublicBody(c, UpvoteValidator);
      if (body.clientId.trim().length === 0) {
        throw createPublicError("validation_failed");
      }

      const result = await toggleUpvote(c, projectId, reqId, body.clientId);
      if (!result.ok) {
        return publicErrorJson(c, result.error);
      }
    } catch (error) {
      return publicErrorJson(c, toPublicErrorResponse(error));
    }

    return c.json({}, 200);
  },
);

export default new HttpRouterWithHono(app);
