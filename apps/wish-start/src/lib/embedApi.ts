export type EmbedApiConfig = {
  baseUrl: string;
  projectId: string;
  clientId: string;
  clientKey: string;
};

export type EmbedRequestStatus = {
  _id: string;
  displayName: string;
};

export type EmbedRequest = {
  _id: string;
  _creationTime: number;
  text: string;
  description?: string;
  kind?: "request" | "complaint";
  upvoteCount?: number;
  computedStatus?: EmbedRequestStatus;
};

export type EmbedComment = {
  _id: string;
  authorType: "developer" | "client";
  authorClientId?: string;
  body: string;
  createdAt: number;
};

export class EmbedApiError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "EmbedApiError";
    this.code = code;
  }
}

async function embedFetch(config: EmbedApiConfig, path: string, init?: RequestInit) {
  const url = `${config.baseUrl}/api/project/${encodeURIComponent(config.projectId)}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        "x-api-key": config.clientKey,
        ...(init?.body ? { "content-type": "application/json" } : {}),
      },
    });
  } catch {
    throw new EmbedApiError("Could not reach the feedback service.", "network_error");
  }

  if (!response.ok) {
    let code = "internal_error";
    let message = "Something went wrong.";
    try {
      const payload = await response.json();
      if (typeof payload?.code === "string") code = payload.code;
      if (typeof payload?.error === "string") message = payload.error;
    } catch {
      // keep defaults for non-JSON error responses
    }
    throw new EmbedApiError(message, code);
  }

  return response.json();
}

export function isEmbedListedRequest(request: Pick<EmbedRequest, "kind">) {
  return request.kind !== "complaint";
}

export async function listEmbedRequests(config: EmbedApiConfig): Promise<EmbedRequest[]> {
  const payload = await embedFetch(config, "/requests/");
  const requests: EmbedRequest[] = Array.isArray(payload?.requests) ? payload.requests : [];
  return requests.filter(isEmbedListedRequest);
}

export async function listEmbedUpvotedRequestIds(config: EmbedApiConfig): Promise<Set<string>> {
  const payload = await embedFetch(config, `/upvotes?clientId=${encodeURIComponent(config.clientId)}`);
  const upvotes: Array<{ requestId: string }> = Array.isArray(payload?.upvotes) ? payload.upvotes : [];
  return new Set(upvotes.map((upvote) => upvote.requestId));
}

export async function createEmbedRequest(
  config: EmbedApiConfig,
  input: { text: string; description?: string },
): Promise<void> {
  await embedFetch(config, "/request/", {
    method: "POST",
    body: JSON.stringify({
      text: input.text,
      description: input.description || undefined,
      kind: "request",
      project: config.projectId,
      clientId: config.clientId,
    }),
  });
}

export async function listEmbedComments(config: EmbedApiConfig, requestId: string): Promise<EmbedComment[]> {
  const payload = await embedFetch(config, `/request/${encodeURIComponent(requestId)}/comments`);
  return Array.isArray(payload?.comments) ? payload.comments : [];
}

export async function createEmbedComment(
  config: EmbedApiConfig,
  requestId: string,
  body: string,
): Promise<void> {
  await embedFetch(config, `/request/${encodeURIComponent(requestId)}/comment`, {
    method: "POST",
    body: JSON.stringify({ clientId: config.clientId, body }),
  });
}

export async function toggleEmbedUpvote(config: EmbedApiConfig, requestId: string): Promise<void> {
  await embedFetch(config, `/request/${encodeURIComponent(requestId)}/upvote`, {
    method: "POST",
    body: JSON.stringify({ clientId: config.clientId }),
  });
}
