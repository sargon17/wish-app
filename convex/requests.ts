import type { z } from 'zod'
import { v } from 'convex/values'

import { mutation, query } from './_generated/server'
import { getProjectById } from './services/queries/projects/getProjectById'
import { getStatusById } from './services/queries/status/getStatusById'

export const getByProject = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()

    if (identity === null) {
      throw new Error('Not authenticated')
    }

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
    const identity = await ctx.auth.getUserIdentity()

    if (identity === null) {
      throw new Error('Not authenticated')
    }

    // // const project = await ctx.runQuery(requestS, { id: args.projectId })
    // const status = await getStatusById(ctx, { id: args.statusId })
    // const project = await getProjectById(ctx, { id: args.statusId })

    // if (!status || !project)
    //   return

    await ctx.db.insert('requests', { ...args })
  },
})
