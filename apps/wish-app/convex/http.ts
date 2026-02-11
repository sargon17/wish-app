import { type } from "arktype";
import type { HonoWithConvex } from "convex-helpers/server/hono";
import { HttpRouterWithHono } from "convex-helpers/server/hono";
import { Hono } from "hono";

import { arktypeValidator } from "@hono/arktype-validator";

import { api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";

const app: HonoWithConvex<ActionCtx> = new Hono();

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
): Promise<{ project: Doc<"projects"> } | { response: Response }> {
  const apiKey = getApiKeyFromRequest(c);
  if (!apiKey) {
    return { response: c.json({ error: "Missing API key" }, 401) };
  }

  const project = await c.env.runQuery(api.projects.getProjectById, { id: projectId });
  if (!project) {
    return { response: c.json({ error: "Project not found" }, 404) };
  }

  if (!project.apiKey || project.apiKey !== apiKey) {
    return { response: c.json({ error: "Invalid API key" }, 401) };
  }

  return { project };
}

function toPublicProject(project: Doc<"projects">) {
  const { apiKey, ...safeProject } = project;
  return safeProject;
}

app.get("/api/project/:id/requests/", async (c) => {
  const id = c.req.param("id");

  const authorization = await authorizeProjectRequest(c, id);
  if ("response" in authorization) {
    return authorization.response;
  }

  const project = authorization.project;
  const requests = await c.env.runQuery(api.requests.getByProject, { id });
  const requestStatuses = await c.env.runQuery(api.requestStatuses.getByProject, { id });

  const mappedRequests = requests.map((request) => {
    const computedStatus = requestStatuses.find((status) => status._id === request.status)!;
    return { ...request, computedStatus };
  });

  return c.json({
    project: toPublicProject(project),
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
    const authorization = await authorizeProjectRequest(c, id);
    if ("response" in authorization) {
      return authorization.response;
    }

    const project = authorization.project;
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
  const projectId = c.req.param("id");

  try {
    const authorization = await authorizeProjectRequest(c, projectId);
    if ("response" in authorization) {
      return authorization.response;
    }

    if (!reqId) throw new Error("invalid request id");

    await c.env.runMutation(api.requests.deleteRequest, { id: reqId as Id<"requests"> });
  } catch {
    return c.json({}, 400);
  }

  return c.json({}, 200);
});

app.get("/api/project/:id/request/:reqID/comments", async (c) => {
  const reqId = c.req.param("reqID");
  const projectId = c.req.param("id");

  try {
    const authorization = await authorizeProjectRequest(c, projectId);
    if ("response" in authorization) {
      return authorization.response;
    }

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
      const authorization = await authorizeProjectRequest(c, projectId);
      if ("response" in authorization) {
        return authorization.response;
      }

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
      const authorization = await authorizeProjectRequest(c, projectId);
      if ("response" in authorization) {
        return authorization.response;
      }

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
