import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import { notificationConnectorKindValidator, notificationEventTypeValidator } from "./lib/notificationTypes";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    tokenIdentifier: v.string(),
  }).index("by_token", ["tokenIdentifier"]),

  projects: defineTable({
    title: v.string(),
    user: v.id("users"),
    apiKeyHash: v.optional(v.string()),
    publicChangelogSlug: v.optional(v.string()),
    projectSlug: v.optional(v.string()),
    suggestionPortalPublishedAt: v.optional(v.number()),
  })
    .index("by_user", ["user"])
    .index("by_public_changelog_slug", ["publicChangelogSlug"])
    .index("by_project_slug", ["projectSlug"]),

  apiKeys: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    keyPrefix: v.string(),
    keyHash: v.string(),
    scopes: v.array(v.union(v.literal("read"), v.literal("write"), v.literal("admin"))),
    status: v.union(v.literal("active"), v.literal("revoked")),
    createdAt: v.number(),
    createdBy: v.id("users"),
    lastUsedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
  })
    .index("by_project", ["projectId"])
    .index("by_project_status", ["projectId", "status"])
    .index("by_prefix_status", ["keyPrefix", "status"]),

  apiRateLimits: defineTable({
    bucket: v.string(),
    windowStartedAt: v.number(),
    count: v.number(),
  }).index("by_bucket", ["bucket"]),

  notificationConnectors: defineTable({
    projectId: v.id("projects"),
    kind: notificationConnectorKindValidator,
    enabled: v.boolean(),
    eventTypes: v.array(notificationEventTypeValidator),
    telegramChatId: v.optional(v.string()),
    telegramChatTitle: v.optional(v.string()),
    telegramMessageThreadId: v.optional(v.number()),
    telegramConnectedByUserId: v.optional(v.number()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_kind", ["projectId", "kind"]),

  notificationConnectionTokens: defineTable({
    projectId: v.id("projects"),
    kind: v.literal("telegram"),
    tokenPrefix: v.string(),
    tokenHash: v.string(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    expiresAt: v.number(),
    consumedAt: v.optional(v.number()),
  })
    .index("by_project", ["projectId"])
    .index("by_token_prefix", ["tokenPrefix"]),

  notificationEvents: defineTable({
    projectId: v.id("projects"),
    type: notificationEventTypeValidator,
    requestId: v.optional(v.id("requests")),
    commentId: v.optional(v.id("requestComments")),
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_type", ["projectId", "type"]),

  notificationDeliveries: defineTable({
    eventId: v.id("notificationEvents"),
    projectId: v.id("projects"),
    connectorId: v.id("notificationConnectors"),
    connectorKind: notificationConnectorKindValidator,
    status: v.union(v.literal("pending"), v.literal("sent"), v.literal("failed")),
    attemptCount: v.number(),
    lastError: v.optional(v.string()),
    sentAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_status", ["status"])
    .index("by_project", ["projectId"]),

  requests: defineTable({
    text: v.string(),
    description: v.optional(v.string()),
    clientId: v.string(),
    kind: v.optional(v.union(v.literal("request"), v.literal("complaint"))),
    requesterEmail: v.optional(v.string()),
    status: v.id("requestStatuses"),
    project: v.id("projects"),
    upvoteCount: v.optional(v.number()),
  })
    .index("by_project", ["project"])
    .index("by_project_status", ["project", "status"]),

  requestUpvotes: defineTable({
    requestId: v.id("requests"),
    projectId: v.id("projects"),
    userId: v.optional(v.id("users")),
    clientId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_request", ["requestId"])
    .index("by_project", ["projectId"])
    .index("by_request_user", ["requestId", "userId"])
    .index("by_request_client", ["requestId", "clientId"]),

  requestComments: defineTable({
    requestId: v.id("requests"),
    projectId: v.id("projects"),
    authorType: v.union(v.literal("developer"), v.literal("client")),
    authorUserId: v.optional(v.id("users")),
    authorClientId: v.optional(v.string()),
    body: v.string(),
    createdAt: v.number(),
  })
    .index("by_request", ["requestId"])
    .index("by_project", ["projectId"])
    .index("by_request_created", ["requestId", "createdAt"]),

  requestStatuses: defineTable({
    name: v.string(),
    displayName: v.string(),
    description: v.optional(v.string()),
    project: v.optional(v.id("projects")),
    type: v.union(v.literal("custom"), v.literal("default")),
    color: v.optional(v.string()),
    position: v.optional(v.number()),

  })
    .index("by_project", ["project"])
    .index("by_project_name", ["project", "name"]),

  waitlist: defineTable({
    email: v.string(),
    appliedAt: v.number(),
    invitedAt: v.optional(v.number()),
  }).index("by_email", ["email"]),

  changelogEntries: defineTable({
    projectId: v.id("projects"),
    versionLabel: v.string(),
    versionLabelNormalized: v.string(),
    title: v.string(),
    summary: v.optional(v.string()),
    body: v.optional(v.string()),
    type: v.union(v.literal("feature"), v.literal("improvement"), v.literal("fix")),
    status: v.union(v.literal("draft"), v.literal("published")),
    publishedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.id("users"),
    updatedBy: v.id("users"),
  })
    .index("by_project", ["projectId"])
    .index("by_project_status", ["projectId", "status"])
    .index("by_project_version_label", ["projectId", "versionLabelNormalized"]),
});
