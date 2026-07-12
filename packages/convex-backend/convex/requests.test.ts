import { describe, expect, it, vi } from "vite-plus/test";

import type { Doc, Id } from "./_generated/dataModel";
import { deleteRequestsInBulk, getBulkRequests, updateRequestStatuses } from "./requests";

const projectId = "project-1" as Id<"projects">;

function request(id: string, project = projectId) {
  return { _id: id, project } as Doc<"requests">;
}

function context(requests: Doc<"requests">[]) {
  return {
    db: {
      get: async (id: Id<"requests">) => requests.find((item) => item._id === id) ?? null,
    },
  } as never;
}

function mutationContext(records: Record<string, unknown>) {
  const patch = vi.fn(async () => undefined);
  const remove = vi.fn(async () => undefined);

  return {
    ctx: {
      auth: {
        getUserIdentity: async () => ({ tokenIdentifier: "token" }),
      },
      db: {
        delete: remove,
        get: async (id: string) => records[id] ?? null,
        patch,
        query: (table: string) => ({
          withIndex: (
            _index: string,
            build: (query: { eq: (_field: string, value: unknown) => unknown }) => unknown,
          ) => {
            let indexedValue: unknown;
            build({
              eq: (_field, value) => {
                indexedValue = value;
                return {};
              },
            });

            return {
              collect: async () =>
                Object.values(records).filter((record) => {
                  if (!record || typeof record !== "object" || !("requestId" in record)) {
                    return false;
                  }
                  return record.requestId === indexedValue;
                }),
              unique: async () => (table === "users" ? records.user : null),
            };
          },
        }),
      },
    } as never,
    patch,
    remove,
  };
}

describe("bulk request validation", () => {
  it("returns unique requests from one Project Board", async () => {
    const first = request("request-1");
    const second = request("request-2");

    await expect(
      getBulkRequests(context([first, second]), [first._id, second._id, first._id]),
    ).resolves.toEqual([first, second]);
  });

  it("rejects missing and cross-project requests before mutation work begins", async () => {
    const first = request("request-1");
    const otherProject = request("request-2", "project-2" as Id<"projects">);

    await expect(getBulkRequests(context([first]), [])).rejects.toThrow("Select at least one");
    await expect(
      getBulkRequests(context([first]), [first._id, "missing" as Id<"requests">]),
    ).rejects.toThrow("Request not found");
    await expect(
      getBulkRequests(context([first, otherProject]), [first._id, otherProject._id]),
    ).rejects.toThrow("same project");
  });

  it("updates every selected Request after validating the Project Board and Status", async () => {
    const first = request("request-1");
    const second = request("request-2");
    const statusId = "status-2" as Id<"requestStatuses">;
    const { ctx, patch } = mutationContext({
      user: { _id: "user-1" },
      [first._id]: first,
      [second._id]: second,
      [projectId]: { _id: projectId, user: "user-1" },
      [statusId]: { _id: statusId, project: projectId },
    });

    await updateRequestStatuses(ctx, { ids: [first._id, second._id], status: statusId });

    expect(patch).toHaveBeenCalledTimes(2);
    expect(patch).toHaveBeenCalledWith(first._id, { status: statusId });
    expect(patch).toHaveBeenCalledWith(second._id, { status: statusId });
  });

  it("performs no status writes when bulk validation fails", async () => {
    const first = request("request-1");
    const otherProject = request("request-2", "project-2" as Id<"projects">);
    const statusId = "status-2" as Id<"requestStatuses">;
    const { ctx, patch } = mutationContext({
      user: { _id: "user-1" },
      [first._id]: first,
      [otherProject._id]: otherProject,
    });

    await expect(
      updateRequestStatuses(ctx, {
        ids: [first._id, otherProject._id],
        status: statusId,
      }),
    ).rejects.toThrow("Failed to update requests");
    expect(patch).not.toHaveBeenCalled();
  });

  it("deletes every selected Request and its dependent records", async () => {
    const first = request("request-1");
    const second = request("request-2");
    const { ctx, remove } = mutationContext({
      user: { _id: "user-1" },
      [first._id]: first,
      [second._id]: second,
      [projectId]: { _id: projectId, user: "user-1" },
      upvote: { _id: "upvote-1", requestId: first._id, user: "user-2" },
      comment: { _id: "comment-1", requestId: first._id, message: "Comment" },
    });

    await deleteRequestsInBulk(ctx, { ids: [first._id, second._id] });

    expect(remove).toHaveBeenCalledWith("upvote-1");
    expect(remove).toHaveBeenCalledWith("comment-1");
    expect(remove).toHaveBeenCalledWith(first._id);
    expect(remove).toHaveBeenCalledWith(second._id);
  });
});
