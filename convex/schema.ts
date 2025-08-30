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

  // messages: defineTable({
  //   body: v.string(),
  //   user: v.id("users"),
  // }),
  // users: defineTable({
  //   name: v.string(),
  //   tokenIdentifier: v.string(),
  // }).index("by_token", ["tokenIdentifier"]),
})
