import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { getStatusById } from "./services/queries/status/getStatusById";

export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    return getStatusById(ctx, { id: args.id });
  },
});

export const getByProject = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    // const identity = await ctx.auth.getUserIdentity()

    // if (identity === null) {
    //   throw new Error('Not authenticated')
    // }

    return await ctx.db
      .query("requestStatuses")
      .filter((q) => q.or(q.eq(q.field("project"), args.id), q.eq(q.field("type"), "default")))
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    displayName: v.string(),
    description: v.optional(v.string()),
    project: v.id("projects"),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingStatus = await ctx.db
      .query("requestStatuses")
      .withIndex("by_project", (q) => q.eq("project", args.project))
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();

    if (existingStatus) {
      throw new Error("A status with this name already exists in the project");
    }

    await ctx.db.insert("requestStatuses", {
      ...args,
      type: "custom",
    });
  },
});

export const updateColor = mutation({
  args: {
    id: v.id("requestStatuses"),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const status = await ctx.db.get(args.id);

    if (!status) {
      throw new Error("Status not found");
    }

    if (status.type === "default") {
      throw new Error("Default statuses cannot be updated");
    }

    await ctx.db.patch(args.id, { color: args.color });
  },
});
