import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

function slugifySegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export function buildProjectPublicChangelogSlug(project: Pick<Doc<"projects">, "_id" | "title">) {
  const base = slugifySegment(project.title) || "app";
  const suffix = project._id.replace(/[^a-z0-9]/gi, "").toLowerCase();

  return `${base}-${suffix}`;
}

export async function ensureProjectPublicChangelogSlug(ctx: MutationCtx, projectId: Id<"projects">) {
  const project = await ctx.db.get(projectId);

  if (!project) {
    throw new Error("Project not found");
  }

  if (project.publicChangelogSlug) {
    return project;
  }

  const publicChangelogSlug = buildProjectPublicChangelogSlug(project);
  await ctx.db.patch(project._id, { publicChangelogSlug });

  return {
    ...project,
    publicChangelogSlug,
  };
}
