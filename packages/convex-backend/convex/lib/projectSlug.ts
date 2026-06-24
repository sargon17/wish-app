import type { MutationCtx } from "../_generated/server";

const FALLBACK_SLUG = "project";
const SUFFIX_LENGTH = 6;

export function slugifyProjectTitle(title: string) {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || FALLBACK_SLUG;
}

export async function createUniqueProjectSlug(ctx: MutationCtx, title: string) {
  const baseSlug = slugifyProjectTitle(title);
  let candidate = baseSlug;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const existing = await ctx.db
      .query("projects")
      .withIndex("by_project_slug", (q) => q.eq("projectSlug", candidate))
      .unique();

    if (!existing) {
      return candidate;
    }

    candidate = `${baseSlug}-${crypto.randomUUID().slice(0, SUFFIX_LENGTH)}`;
  }

  throw new Error("Unable to generate a unique project slug");
}
