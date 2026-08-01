import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export async function assertNoBlockingLinearHandoffs(
  ctx: MutationCtx,
  projectId: Id<"projects">,
  allowUnknown = false,
) {
  const states = allowUnknown ? (["pending"] as const) : (["pending", "unknown"] as const);
  for (const state of states) {
    const handoff = await ctx.db
      .query("workItemHandoffs")
      .withIndex("by_project_provider_state", (q) =>
        q.eq("projectId", projectId).eq("provider", "linear").eq("lifecycle.state", state),
      )
      .first();
    if (handoff) {
      throw new Error("Work Tracker change is blocked while a Handoff is unresolved");
    }
  }
}
