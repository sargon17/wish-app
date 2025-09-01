import { v } from 'convex/values'

import { mutation, query } from './_generated/server'

// export const getForCurrentUser = query({
//   args: {},
//   handler: async (ctx) => {
//     const identity = await ctx.auth.getUserIdentity()
//     if (identity === null) {
//       throw new Error('Not authenticated')
//     }
//     return await ctx.db
//       .query('projects')
//       .filter(q => q.eq(q.field('user'), identity.email))
//       .collect()
//   },
// })

export const getProjectById = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()

    if (identity === null) {
      throw new Error('Not authenticated')
    }

    return await ctx.db.query('projects').filter(q => q.eq(q.field('_id'), args.id)).unique()
  },
})

export const getProjectsForUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()

    if (identity === null) {
      throw new Error('Not authenticated')
    }

    const user = await ctx.db.query('users')
      .withIndex('by_token', q => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .unique()

    if (!user) {
      throw new Error('Unauthenticated call to mutation')
    }

    return await ctx.db.query('projects').filter(q => q.eq(q.field('user'), user._id)).collect()
  },
})

export const createProject = mutation({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()

    if (identity === null) {
      throw new Error('Not authenticated')
    }

    const user = await ctx.db.query('users')
      .withIndex('by_token', q => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .unique()

    if (!user) {
      throw new Error('Unauthenticated call to mutation')
    }

    await ctx.db.insert('projects', { title: args.title, user: user._id })
    // do something with `taskId`
  },
})

export const deleteProject = mutation({
  args: { id: v.id('projects') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()

    if (identity === null) {
      throw new Error('Not authenticated')
    }

    await ctx.db.delete(args.id)
  },
})
