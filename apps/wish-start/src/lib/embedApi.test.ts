import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import {
  createEmbedComment,
  createEmbedRequest,
  EmbedApiError,
  listEmbedRequests,
  listEmbedUpvotedRequestIds,
  toggleEmbedUpvote,
} from "./embedApi";

const config = {
  baseUrl: "https://example.convex.site",
  projectId: "proj_123",
  clientId: "user-42",
  clientKey: "wish_pk_secret",
};

function mockFetch(payload: unknown, ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    json: async () => payload,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("embedApi", () => {
  it("sends the client key as x-api-key and never in the URL", async () => {
    const fetchMock = mockFetch({ requests: [] });

    await listEmbedRequests(config);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://example.convex.site/api/project/proj_123/requests/");
    expect(url).not.toContain(config.clientKey);
    expect(init.headers["x-api-key"]).toBe(config.clientKey);
  });

  it("filters complaints out of the request list", async () => {
    mockFetch({
      requests: [
        { _id: "r1", text: "A request", kind: "request" },
        { _id: "r2", text: "A complaint", kind: "complaint" },
        { _id: "r3", text: "Legacy without kind" },
      ],
    });

    const requests = await listEmbedRequests(config);

    expect(requests.map((request) => request._id)).toEqual(["r1", "r3"]);
  });

  it("creates trimmed requests with clientId, project, and forced request kind", async () => {
    const fetchMock = mockFetch({});

    await createEmbedRequest(config, { text: " Add dark mode ", description: "  " });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://example.convex.site/api/project/proj_123/request/");
    expect(url).not.toContain(config.clientKey);
    expect(init.method).toBe("POST");
    expect(init.headers["content-type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({
      text: "Add dark mode",
      kind: "request",
      project: "proj_123",
      clientId: "user-42",
    });
  });

  it("sends clientId in comment and upvote bodies", async () => {
    const fetchMock = mockFetch({});

    await createEmbedComment(config, "req_1", "Nice idea");
    await toggleEmbedUpvote(config, "req_1");

    const commentBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    const upvoteBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(commentBody).toEqual({ clientId: "user-42", body: "Nice idea" });
    expect(upvoteBody).toEqual({ clientId: "user-42" });
  });

  it("maps viewer upvotes to a set of request ids", async () => {
    const fetchMock = mockFetch({ upvotes: ["r1", "r2"] });

    const upvoted = await listEmbedUpvotedRequestIds(config);

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe("https://example.convex.site/api/project/proj_123/upvotes?clientId=user-42");
    expect(upvoted).toEqual(new Set(["r1", "r2"]));
  });

  it("throws a typed error with the public error code", async () => {
    mockFetch({ error: "Invalid API key.", code: "invalid_api_key" }, false);

    await expect(listEmbedRequests(config)).rejects.toMatchObject({
      name: "EmbedApiError",
      code: "invalid_api_key",
      message: "Invalid API key.",
    });
  });

  it("wraps network failures in a typed error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(listEmbedRequests(config)).rejects.toBeInstanceOf(EmbedApiError);
  });
});
