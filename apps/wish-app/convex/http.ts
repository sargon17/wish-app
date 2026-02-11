import { type } from "arktype";
// Import the runtime JS entry so TypeScript uses the .d.ts, not the library's .ts source.
// This avoids lib.dom conflicts (e.g. duplicate FetchEvent) during `next build` typechecking.
import type { HonoWithConvex } from "convex-helpers/server/hono.js";
import { HttpRouterWithHono } from "convex-helpers/server/hono.js";
import { Hono } from "hono";

import { arktypeValidator } from "@hono/arktype-validator";

import { api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";

const app: HonoWithConvex<ActionCtx> = new Hono();

app.get("/api/project/:id/requests/", async (c) => {
  const id = c.req.param("id");

  const project = await c.env.runQuery(api.projects.getProjectById, { id });
  const requests = await c.env.runQuery(api.requests.getByProject, { id });
  const requestStatuses = await c.env.runQuery(api.requestStatuses.getByProject, { id });

  const mappedRequests = requests.map((request) => {
    const computedStatus = requestStatuses.find((status) => status._id === request.status)!;
    return { ...request, computedStatus };
  });

  return c.json({
    project,
    requests: mappedRequests,
  });
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
    const project = await c.env.runQuery(api.projects.getProjectById, { id });
    const status = (await c.env.runQuery(api.requestStatuses.getByProject, { id })).find(
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

  try {
    if (!reqId) throw new Error("invalid request id");

    await c.env.runMutation(api.requests.deleteRequest, { id: reqId as Id<"requests"> });
  } catch {
    return c.json({}, 400);
  }

  return c.json({}, 200);
});

app.get("/api/project/:id/request/:reqID/comments", async (c) => {
  const reqId = c.req.param("reqID");

  try {
    if (!reqId) throw new Error("invalid request id");

    const comments = await c.env.runQuery(api.requestComments.listByRequest, {
      requestId: reqId as Id<"requests">,
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
      if (!reqId || !projectId) throw new Error("invalid request id");

      await c.env.runMutation(api.requestComments.create, {
        requestId: reqId as Id<"requests">,
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
    const body = await c.req.valid("json");

    try {
      if (!reqId || !projectId) throw new Error("invalid request id");

      await c.env.runMutation(api.requestUpvotes.toggle, {
        requestId: reqId as Id<"requests">,
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
