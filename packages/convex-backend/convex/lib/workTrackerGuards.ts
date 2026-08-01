import { ConvexError } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

import { unresolvedWorkItemHandoffError } from "./workTrackerErrors";

export async function assertNoBlockingWorkTrackerHandoffs(
  ctx: MutationCtx,
  projectId: Id<"projects">,
  provider: Doc<"workItemHandoffs">["provider"],
  allowUnknown = false,
) {
  const states = allowUnknown ? (["pending"] as const) : (["pending", "unknown"] as const);
  for (const state of states) {
    const handoff = await ctx.db
      .query("workItemHandoffs")
      .withIndex("by_project_provider_state", (q) =>
        q.eq("projectId", projectId).eq("provider", provider).eq("lifecycle.state", state),
      )
      .first();
    if (handoff) {
      throw new ConvexError(unresolvedWorkItemHandoffError);
    }
  }
}
