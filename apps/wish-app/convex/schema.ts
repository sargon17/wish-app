import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    tokenIdentifier: v.string(),
  }).index("by_token", ["tokenIdentifier"]),

  projects: defineTable({
    title: v.string(),
    user: v.id("users"),
    apiKeyHash: v.optional(v.string()),
  }).index("by_user", ["user"]),

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

  requests: defineTable({
    text: v.string(),
    description: v.optional(v.string()),
    clientId: v.string(),
    status: v.id("requestStatuses"),
    project: v.id("projects"),
    upvoteCount: v.optional(v.number()),
  }).index("by_project", ["project"]),

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
  }).index("by_project", ["project"]),

  waitlist: defineTable({
    email: v.string(),
    appliedAt: v.number(),
    invitedAt: v.optional(v.number()),
  }).index("by_email", ["email"]),

  // TODO: requests chat system
});
