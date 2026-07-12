import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

import { getMcpTokenId, hashMcpTokenId } from "./mcpToken";

type Ctx = QueryCtx | MutationCtx;

export async function getCurrentUser(ctx: Ctx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const mcpTokenId = getMcpTokenId(identity);
  if (mcpTokenId) {
    const tokenHash = await hashMcpTokenId(mcpTokenId);
    const token = await ctx.db
      .query("mcpTokens")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
      .unique();

    if (!token || token.revokedAt || token.expiresAt <= Date.now() || identity.subject !== token.userId) {
      throw new Error("MCP token is invalid or expired");
    }

    const user = await ctx.db.get(token.userId);
    if (!user) {
      throw new Error("Unauthenticated call");
    }

    return user;
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();

  if (!user) {
    throw new Error("Unauthenticated call");
  }

  return user;
}

export async function getCurrentUserOrNull(ctx: Ctx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  if (getMcpTokenId(identity)) {
    return await getCurrentUser(ctx);
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();

  return user ?? null;
}

export async function assertProjectOwner(
  ctx: Ctx,
  projectId: Id<"projects">,
  userId: Id<"users">,
): Promise<Doc<"projects">> {
  const project = await ctx.db.get(projectId);
  if (!project) {
    throw new Error("Project not found");
  }

  if (project.user !== userId) {
    throw new Error("Not authorized to access this project");
  }

  return project;
}
