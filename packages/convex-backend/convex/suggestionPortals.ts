import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { normalizeRequestInput, requestInputErrorMessage } from "./lib/requestInput";
import { isRequesterClientId } from "./lib/requesterIdentity";
import { getRequestKind } from "./lib/requestKind";
import { emitNotificationEvent } from "./notificationEvents";
import {
  getPortalPage,
  normalizePortalQuery,
  normalizePortalSearchTokens,
  normalizePortalSort,
  portalRequestMatchesSearch,
  scoreSimilarPortalRequest,
  sortPortalRequests,
} from "./lib/suggestionPortalReadModel";

const PORTAL_REQUEST_RATE_LIMIT = { limit: 3, windowMs: 10 * 60 * 1000 };
const PORTAL_COMMENT_RATE_LIMIT = { limit: 10, windowMs: 10 * 60 * 1000 };
const PORTAL_UPVOTE_RATE_LIMIT = { limit: 60, windowMs: 60 * 1000 };

async function getPublishedProjectBySlug(ctx: QueryCtx | MutationCtx, slug: string) {
  const project = await ctx.db
    .query("projects")
    .withIndex("by_project_slug", (q) => q.eq("projectSlug", slug))
    .unique();

  if (!project?.suggestionPortalPublishedAt) {
    return null;
  }

  return project;
}

async function assertPortalRateLimit(
  ctx: MutationCtx,
  bucket: string,
  limit: number,
  windowMs: number,
) {
  const now = Date.now();
  const existing = await ctx.db
    .query("apiRateLimits")
    .withIndex("by_bucket", (q) => q.eq("bucket", bucket))
    .unique();

  if (!existing) {
    await ctx.db.insert("apiRateLimits", {
      bucket,
      windowStartedAt: now,
      count: 1,
    });
    return;
  }

  if (now - existing.windowStartedAt >= windowMs) {
    await ctx.db.patch(existing._id, {
      windowStartedAt: now,
      count: 1,
    });
    return;
  }

  if (existing.count >= limit) {
    throw new ConvexError({
      code: "RATE_LIMITED",
      message: "Too many requests",
      retryAfterMs: Math.max(0, windowMs - (now - existing.windowStartedAt)),
    });
  }

  await ctx.db.patch(existing._id, {
    count: existing.count + 1,
  });
}

async function countCommentsByRequest(ctx: QueryCtx, projectId: Id<"projects">) {
  const comments = await ctx.db
    .query("requestComments")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();
  const counts = new Map<string, number>();

  for (const comment of comments) {
    const key = comment.requestId.toString();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

async function getViewerUpvotedRequestIds(ctx: QueryCtx, projectId: Id<"projects">, clientId: string | undefined) {
  if (!clientId || !isRequesterClientId(clientId)) {
    return new Set<string>();
  }

  const upvotes = await ctx.db
    .query("requestUpvotes")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .filter((q) => q.eq(q.field("clientId"), clientId))
    .collect();

  return new Set(upvotes.map((upvote) => upvote.requestId.toString()));
}

export const getPublishedPortal = query({
  args: {
    projectSlug: v.string(),
    clientId: v.optional(v.string()),
    search: v.optional(v.string()),
    statusId: v.optional(v.string()),
    sort: v.optional(v.string()),
    cursor: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const project = await getPublishedProjectBySlug(ctx, args.projectSlug);
    if (!project) {
      return null;
    }

    const statuses = await ctx.db
      .query("requestStatuses")
      .withIndex("by_project", (q) => q.eq("project", project._id))
      .collect();
    const statusOrder = new Map(statuses.map((status) => [status._id.toString(), status.position ?? 0]));
    const statusIds = new Set(statuses.map((status) => status._id.toString()));
    const statusId = args.statusId && statusIds.has(args.statusId) ? args.statusId : undefined;
    const search = normalizePortalQuery(args.search);
    const sort = normalizePortalSort(args.sort);
    const commentCounts = await countCommentsByRequest(ctx, project._id);
    const viewerUpvotes = await getViewerUpvotedRequestIds(ctx, project._id, args.clientId);
    const requests = await ctx.db
      .query("requests")
      .withIndex("by_project", (q) => q.eq("project", project._id))
      .collect();
    const visibleRequests = sortPortalRequests(
      requests
        .filter((request) => getRequestKind(request) === "request")
        .filter((request) => !statusId || request.status.toString() === statusId)
        .filter((request) => portalRequestMatchesSearch(request, search)),
      sort,
    );
    const result = getPortalPage(visibleRequests, args.cursor, args.limit);

    return {
      project: {
        _id: project._id,
        title: project.title,
        projectSlug: project.projectSlug,
        publicChangelogSlug: project.publicChangelogSlug,
      },
      statuses: statuses.sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
      requests: result.page.map((request) => ({
        ...request,
        statusOrder: statusOrder.get(request.status.toString()) ?? 0,
        commentCount: commentCounts.get(request._id.toString()) ?? 0,
        isUpvoted: viewerUpvotes.has(request._id.toString()),
      })),
      page: {
        nextCursor: result.nextCursor,
        totalCount: result.totalCount,
      },
    };
  },
});

export const getSimilarSuggestions = query({
  args: {
    projectSlug: v.string(),
    text: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const project = await getPublishedProjectBySlug(ctx, args.projectSlug);
    if (!project) {
      return [];
    }

    const tokens = normalizePortalSearchTokens(args.text);
    if (tokens.length === 0) {
      return [];
    }

    const limit = Math.max(1, Math.min(args.limit ?? 5, 10));
    const statuses = await ctx.db
      .query("requestStatuses")
      .withIndex("by_project", (q) => q.eq("project", project._id))
      .collect();
    const statusMap = new Map(statuses.map((status) => [status._id.toString(), status]));
    const requests = (await ctx.db
      .query("requests")
      .withIndex("by_project", (q) => q.eq("project", project._id))
      .collect()).filter((request) => getRequestKind(request) === "request");

    return requests
      .map((request) => ({
        request,
        score: scoreSimilarPortalRequest(request, tokens),
      }))
      .filter((result) => result.score > 0)
      .sort((a, b) => {
        const scoreDiff = b.score - a.score;
        if (scoreDiff !== 0) return scoreDiff;
        const upvoteDiff = (b.request.upvoteCount ?? 0) - (a.request.upvoteCount ?? 0);
        if (upvoteDiff !== 0) return upvoteDiff;
        return b.request._creationTime - a.request._creationTime;
      })
      .slice(0, limit)
      .map(({ request }) => ({
        _id: request._id,
        text: request.text,
        upvoteCount: request.upvoteCount ?? 0,
        status: statusMap.get(request.status.toString())?.displayName,
      }));
  },
});

export const getPublishedRequest = query({
  args: {
    projectSlug: v.string(),
    requestId: v.string(),
    clientId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const project = await getPublishedProjectBySlug(ctx, args.projectSlug);
    if (!project) {
      return null;
    }

    const requests = await ctx.db
      .query("requests")
      .withIndex("by_project", (q) => q.eq("project", project._id))
      .collect();
    const request = requests.find((item) => item._id.toString() === args.requestId);
    if (!request || getRequestKind(request) !== "request") {
      return null;
    }

    const status = await ctx.db.get(request.status);
    const comments = await ctx.db
      .query("requestComments")
      .withIndex("by_request_created", (q) => q.eq("requestId", request._id))
      .collect();
    const viewerUpvotes = await getViewerUpvotedRequestIds(ctx, project._id, args.clientId);

    return {
      project: {
        _id: project._id,
        title: project.title,
        projectSlug: project.projectSlug,
      },
      request: {
        ...request,
        isUpvoted: viewerUpvotes.has(request._id.toString()),
      },
      status,
      comments,
    };
  },
});

export const createRequest = mutation({
  args: {
    projectSlug: v.string(),
    text: v.string(),
    description: v.optional(v.string()),
    requesterEmail: v.optional(v.string()),
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const project = await getPublishedProjectBySlug(ctx, args.projectSlug);
    if (!project) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Suggestion portal not found" });
    }
    if (!isRequesterClientId(args.clientId)) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Invalid requester identity" });
    }
    await assertPortalRateLimit(
      ctx,
      `portal:create-request:${project._id}:${args.clientId}`,
      PORTAL_REQUEST_RATE_LIMIT.limit,
      PORTAL_REQUEST_RATE_LIMIT.windowMs,
    );

    const normalized = normalizeRequestInput(args);
    if (!normalized.ok) {
      throw new ConvexError({ code: "BAD_REQUEST", message: requestInputErrorMessage(normalized.error) });
    }

    const statuses = await ctx.db
      .query("requestStatuses")
      .withIndex("by_project", (q) => q.eq("project", project._id))
      .collect();
    const startingStatus = statuses.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0];

    if (!startingStatus) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Project has no statuses" });
    }

    const requestId = await ctx.db.insert("requests", {
      ...normalized.value,
      clientId: args.clientId,
      project: project._id,
      status: startingStatus._id,
      kind: "request",
      upvoteCount: 1,
    });

    await ctx.db.insert("requestUpvotes", {
      requestId,
      projectId: project._id,
      clientId: args.clientId,
      createdAt: Date.now(),
    });

    await emitNotificationEvent(ctx, {
      projectId: project._id,
      type: "request.created",
      requestId,
    });

    return { requestId };
  },
});

export const toggleUpvote = mutation({
  args: {
    projectSlug: v.string(),
    requestId: v.id("requests"),
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const project = await getPublishedProjectBySlug(ctx, args.projectSlug);
    if (!project) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Suggestion portal not found" });
    }
    if (!isRequesterClientId(args.clientId)) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Invalid requester identity" });
    }

    const request = await ctx.db.get(args.requestId);
    if (!request || request.project !== project._id) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Request not found" });
    }
    await assertPortalRateLimit(
      ctx,
      `portal:upvote:${project._id}:${args.clientId}`,
      PORTAL_UPVOTE_RATE_LIMIT.limit,
      PORTAL_UPVOTE_RATE_LIMIT.windowMs,
    );

    const existing = await ctx.db
      .query("requestUpvotes")
      .withIndex("by_request_client", (q) =>
        q.eq("requestId", request._id).eq("clientId", args.clientId),
      )
      .unique();
    const currentCount = request.upvoteCount ?? 0;

    if (existing) {
      await ctx.db.delete(existing._id);
      const upvoteCount = Math.max(0, currentCount - 1);
      await ctx.db.patch(request._id, { upvoteCount });
      return { upvoted: false, upvoteCount };
    }

    await ctx.db.insert("requestUpvotes", {
      requestId: request._id,
      projectId: project._id,
      clientId: args.clientId,
      createdAt: Date.now(),
    });

    const upvoteCount = currentCount + 1;
    await ctx.db.patch(request._id, { upvoteCount });
    return { upvoted: true, upvoteCount };
  },
});

export const createComment = mutation({
  args: {
    projectSlug: v.string(),
    requestId: v.id("requests"),
    clientId: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const project = await getPublishedProjectBySlug(ctx, args.projectSlug);
    if (!project) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Suggestion portal not found" });
    }
    if (!isRequesterClientId(args.clientId)) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Invalid requester identity" });
    }

    const request = await ctx.db.get(args.requestId);
    if (!request || request.project !== project._id) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Request not found" });
    }
    await assertPortalRateLimit(
      ctx,
      `portal:comment:${project._id}:${args.clientId}`,
      PORTAL_COMMENT_RATE_LIMIT.limit,
      PORTAL_COMMENT_RATE_LIMIT.windowMs,
    );

    const body = args.body.trim();
    if (!body) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Comment cannot be empty" });
    }

    if (body.length > 1000) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Comment is too long" });
    }

    return await ctx.db.insert("requestComments", {
      requestId: request._id,
      projectId: project._id,
      authorType: "client",
      authorClientId: args.clientId,
      body,
      createdAt: Date.now(),
    });
  },
});

export const deleteComment = mutation({
  args: {
    projectSlug: v.string(),
    requestId: v.id("requests"),
    commentId: v.id("requestComments"),
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const project = await getPublishedProjectBySlug(ctx, args.projectSlug);
    if (!project) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Suggestion portal not found" });
    }
    if (!isRequesterClientId(args.clientId)) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Invalid requester identity" });
    }

    const request = await ctx.db.get(args.requestId);
    if (!request || request.project !== project._id) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Request not found" });
    }

    const comment = await ctx.db.get(args.commentId);
    if (!comment || comment.requestId !== request._id || comment.projectId !== project._id) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Comment not found" });
    }

    if (comment.authorType !== "client" || comment.authorClientId !== args.clientId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Not allowed to delete this comment" });
    }

    await ctx.db.delete(comment._id);
  },
});
