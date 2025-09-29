import { v } from 'convex/values'

import { mutation, query } from './_generated/server'

export const getByProject = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    // const identity = await ctx.auth.getUserIdentity()

    // if (identity === null) {
    //   throw new Error('Not authenticated')
    // }

    const requests = await ctx.db
      .query('requests')
      .filter(q =>
        q.eq(q.field('project'), args.id),
      )
      .collect()

    return requests
  },
})

// export const createProject = mutation({
//   args: { title: v.string() },
//   handler: async (ctx, args) => {
//     const identity = await ctx.auth.getUserIdentity()

//     if (identity === null) {
//       throw new Error('Not authenticated')
//     }

//     const user = await ctx.db.query('users')
//       .withIndex('by_token', q => q.eq('tokenIdentifier', identity.tokenIdentifier))
//       .unique()

//     if (!user) {
//       throw new Error('Unauthenticated call to mutation')
//     }

//     await ctx.db.insert('projects', { title: args.title, user: user._id })
//     // do something with `taskId`
//   },
// })

export const create = mutation({
  args: {
    text: v.string(),
    description: v.optional(v.string()),
    clientId: v.string(),
    status: v.id('requestStatuses'),
    project: v.id('projects'),
  },
  handler: async (ctx, args) => {
    // const identity = await ctx.auth.getUserIdentity()

    // if (identity === null) {
    //   throw new Error('Not authenticated')
    // }

    await ctx.db.insert('requests', { ...args })
  },
})

export const edit = mutation({
  args: {
    id: v.id('requests'),
    text: v.string(),
    description: v.optional(v.string()),
    status: v.id('requestStatuses'),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args
    const identity = await ctx.auth.getUserIdentity()

    if (identity === null) {
      throw new Error('Not authenticated')
    }

    await ctx.db.patch(id, { ...fields })
  },
})

export const updateStatus = mutation({
  args: {
    id: v.id('requests'),
    status: v.id('requestStatuses'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (identity === null) {
      throw new Error('Not authenticated')
    }

    await ctx.db.patch(args.id, { status: args.status })
  },
})

export const deleteRequest = mutation({
  args: { id: v.id('requests') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()

    if (identity === null) {
      throw new Error('Not authenticated')
    }

    await ctx.db.delete(args.id)
  },
})
