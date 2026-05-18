import type { ActionCtx } from "../_generated/server";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { createPublicError } from "./publicErrors";
import { authorizeProjectKeyRequest } from "./projectKeyAuthorization";

type RequestIntakeContext = {
  req: {
    header(name: string): string | undefined;
  };
  env: Pick<ActionCtx, "runQuery" | "runMutation">;
};

export async function listRequests(c: RequestIntakeContext, projectId: string) {
  const authorization = await authorizeProjectKeyRequest(c, projectId, "read");
  if (!authorization.ok) {
    return authorization;
  }

  const requests = await c.env.runQuery(internal.requests.getByProjectInternal, {
    id: authorization.project._id,
  });
  const requestStatuses = await c.env.runQuery(internal.requestStatuses.getByProjectInternal, {
    id: authorization.project._id,
  });

  return {
    ok: true as const,
    project: authorization.project,
    requests: requests.map((request: Doc<"requests">) => {
      const computedStatus = requestStatuses.find((status: Doc<"requestStatuses">) => status._id === request.status)!;
      return { ...request, computedStatus };
    }),
  };
}

async function assertRequestBelongsToProject(
  c: RequestIntakeContext,
  requestId: string,
  projectId: string,
): Promise<Id<"requests">> {
  const request = await c.env.runQuery(internal.requests.getRequestByIdInternal, {
    id: requestId as Id<"requests">,
  });

  if (!request || request.project !== (projectId as Id<"projects">)) {
    throw createPublicError("not_found");
  }

  return request._id;
}

async function getInitialStatusId(c: RequestIntakeContext, projectId: string) {
  const statuses = await c.env.runQuery(internal.requestStatuses.getByProjectInternal, {
    id: projectId as Id<"projects">,
  });
  const initialStatus = statuses[0];

  if (!initialStatus) {
    throw createPublicError("not_found");
  }

  return initialStatus._id;
}

export async function createRequest(
  c: RequestIntakeContext,
  projectId: string,
  body: {
    text: string;
    description?: string;
    clientId: string;
  },
) {
  const authorization = await authorizeProjectKeyRequest(c, projectId, "write");
  if (!authorization.ok) {
    return authorization;
  }

  const status = await getInitialStatusId(c, projectId);

  await c.env.runMutation(api.requests.create, {
    ...body,
    project: authorization.project._id,
    status,
  });

  return { ok: true as const };
}

export async function deleteRequest(c: RequestIntakeContext, projectId: string, requestId: string) {
  const authorization = await authorizeProjectKeyRequest(c, projectId, "admin");
  if (!authorization.ok) {
    return authorization;
  }

  const resolvedRequestId = await assertRequestBelongsToProject(c, requestId, projectId);
  await c.env.runMutation(internal.requests.deleteRequestByApiKeyInternal, {
    id: resolvedRequestId,
    projectId: authorization.project._id,
  });

  return { ok: true as const };
}

export async function listComments(c: RequestIntakeContext, projectId: string, requestId: string) {
  const authorization = await authorizeProjectKeyRequest(c, projectId, "read");
  if (!authorization.ok) {
    return authorization;
  }

  const resolvedRequestId = await assertRequestBelongsToProject(c, requestId, projectId);
  const comments = await c.env.runQuery(internal.requestComments.listByRequestInternal, {
    requestId: resolvedRequestId,
  });

  return { ok: true as const, comments };
}

export async function createComment(
  c: RequestIntakeContext,
  projectId: string,
  requestId: string,
  body: {
    clientId: string;
    body: string;
  },
) {
  const authorization = await authorizeProjectKeyRequest(c, projectId, "write");
  if (!authorization.ok) {
    return authorization;
  }

  const resolvedRequestId = await assertRequestBelongsToProject(c, requestId, projectId);

  await c.env.runMutation(api.requestComments.create, {
    requestId: resolvedRequestId,
    projectId: authorization.project._id,
    clientId: body.clientId,
    body: body.body,
  });

  return { ok: true as const };
}

export async function deleteComment(
  c: RequestIntakeContext,
  projectId: string,
  requestId: string,
  commentId: string,
  clientId: string | undefined,
): Promise<void> {
  const resolvedRequestId = await assertRequestBelongsToProject(c, requestId, projectId);
  await c.env.runMutation(api.requestComments.deleteByClient, {
    id: commentId as Id<"requestComments">,
    requestId: resolvedRequestId,
    projectId: projectId as Id<"projects">,
    clientId,
  });
}

export async function listUpvotes(c: RequestIntakeContext, projectId: string, clientId: string | undefined) {
  const authorization = await authorizeProjectKeyRequest(c, projectId, "read");
  if (!authorization.ok) {
    return authorization;
  }

  const upvotes = await c.env.runQuery(api.requestUpvotes.getViewerUpvotesByProject, {
    projectId: authorization.project._id,
    clientId,
  });

  return { ok: true as const, upvotes };
}

export async function toggleUpvote(
  c: RequestIntakeContext,
  projectId: string,
  requestId: string,
  clientId: string,
) {
  const authorization = await authorizeProjectKeyRequest(c, projectId, "write");
  if (!authorization.ok) {
    return authorization;
  }

  const resolvedRequestId = await assertRequestBelongsToProject(c, requestId, projectId);
  await c.env.runMutation(api.requestUpvotes.toggle, {
    requestId: resolvedRequestId,
    projectId: authorization.project._id,
    clientId,
  });

  return { ok: true as const };
}
