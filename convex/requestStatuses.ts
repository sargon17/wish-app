import type { GenericQueryCtx } from 'convex/server'
import type { GenericId } from 'convex/values'

import type { QueryCtx } from './_generated/server'
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { getStatusById } from './services/queries/status/getStatusById'

export const getById = query({ args: { id: v.string() }, handler: async (ctx, args) => {
  return getStatusById(ctx, { id: args.id })
} })

export const getByProject = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()

    if (identity === null) {
      throw new Error('Not authenticated')
    }

    return await ctx.db
      .query('requestStatuses')
      .filter(q => q.or(
        q.eq(q.field('project'), args.id),
        q.eq(q.field('type'), 'default'),
      ))
      .collect()
  },
})
