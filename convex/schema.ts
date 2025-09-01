import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  users: defineTable({
    name: v.string(),
    tokenIdentifier: v.string(),
  }).index('by_token', ['tokenIdentifier']),

  projects: defineTable({
    title: v.string(),
    user: v.id('users'),
  }),

  requests: defineTable({
    text: v.string(),
    description: v.optional(v.string()),
    clientId: v.string(),
    status: v.id('requestStatuses'),
    project: v.id('projects'),
  }).index('by_project', ['project']),

  requestStatuses: defineTable({
    name: v.string(),
    displayName: v.string(),
    description: v.optional(v.string()),
    project: v.optional(v.id('projects')),
    type: v.union(
      v.literal('custom'),
      v.literal('default'),
    ),
  }).index('by_project', ['project']),

  // open → default, newly submitted.
  // under_review → you (or your team) are checking it out.
  // planned → accepted and will be implemented.
  // in_progress → currently being worked on.
  // completed → shipped / released.
  // declined → not going to be implemented.

})
