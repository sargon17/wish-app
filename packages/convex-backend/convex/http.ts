import { type } from "arktype";
import type { HonoWithConvex } from "convex-helpers/server/hono";
import { HttpRouterWithHono } from "convex-helpers/server/hono";
import { Hono } from "hono";
import { cors } from "hono/cors";

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

// The project API authenticates with public client keys, so browser embeds
// (e.g. the /embed WebView route) may call it from any origin.
app.use(
  "/api/project/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "x-api-key"],
    maxAge: 86400,
  }),
);

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
  text: "string > 2",
  "description?": "string | undefined",
  "kind?": "\"request\" | \"complaint\" | undefined",
  "requesterEmail?": "string | undefined",
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

function getTelegramCommandToken(text: unknown) {
  if (typeof text !== "string") {
    return null;
  }

  const [command, token] = text.trim().split(/\s+/, 2);
  if (!/^\/(?:start|connect)(?:@\w+)?$/.test(command) || !token) {
    return null;
  }

  return token;
}

function getTelegramChatTitle(chat: any) {
  if (typeof chat.title === "string" && chat.title.trim()) {
    return chat.title.trim();
  }

  if (typeof chat.username === "string" && chat.username.trim()) {
    return `@${chat.username.trim()}`;
  }

  const name = [chat.first_name, chat.last_name]
    .filter((value) => typeof value === "string" && value.trim())
    .join(" ")
    .trim();

  return name || "Telegram chat";
}

async function sendTelegramMessage(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return;
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) {
    throw new Error(`Telegram sendMessage failed: ${response.status}`);
  }
}

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

app.post("/api/telegram/webhook", async (c) => {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const providedSecret = c.req.header("X-Telegram-Bot-Api-Secret-Token");

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return c.json({}, 401);
  }

  try {
    const update = await c.req.json();
    const message = update?.message;
    const chat = message?.chat;
    const chatId = chat?.id;
    const token = getTelegramCommandToken(message?.text);

    if (!chat || chatId === undefined || chatId === null || !token) {
      return c.json({}, 200);
    }

    const result = await c.env.runMutation(internal.telegramBot.consumeConnectionTokenInternal, {
      token,
      chatId: String(chatId),
      chatTitle: getTelegramChatTitle(chat),
      messageThreadId: typeof message.message_thread_id === "number" ? message.message_thread_id : undefined,
      telegramUserId: typeof message.from?.id === "number" ? message.from.id : undefined,
    });

    await sendTelegramMessage(
      String(chatId),
      result.ok
        ? `Connected to ${result.projectTitle}. You will receive project notifications here.`
        : "This connection token is invalid or expired. Generate a new Telegram connection token from project settings.",
    );
  } catch (error) {
    console.error(error);
  }

  return c.json({}, 200);
});

app.post("/api/project/:id/request/", async (c) => {
  const id = c.req.param("id");

  try {
    requirePublicId(id);
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      throw createPublicError("validation_failed");
    }

    if (typeof rawBody === "object" && rawBody !== null && Object.prototype.hasOwnProperty.call(rawBody, "status")) {
      throw createPublicError("validation_failed");
    }

    let body;
    try {
      body = RequestValidator.assert(rawBody);
    } catch {
      throw createPublicError("validation_failed");
    }

    const result = await createRequest(c, id, {
      text: body.text,
      description: body.description,
      requesterEmail: body.requesterEmail,
      clientId: body.clientId,
      kind: body.kind,
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
