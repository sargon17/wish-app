import type { QueryCtx } from '../../../_generated/server'

interface GetStatusByIdProps {
  id: string
}
export async function getStatusById(ctx: QueryCtx, params: GetStatusByIdProps) {
  return await ctx.db.query('requestStatuses').filter(q => q.eq(q.field('_id'), params.id)).unique()
}
