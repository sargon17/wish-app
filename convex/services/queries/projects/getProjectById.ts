import type { QueryCtx } from "../../../_generated/server";

interface GetProjectByIdProps {
  id: string;
}
export async function getProjectById(ctx: QueryCtx, params: GetProjectByIdProps) {
  return await ctx.db
    .query("projects")
    .filter((q) => q.eq(q.field("_id"), params.id))
    .unique();
}
