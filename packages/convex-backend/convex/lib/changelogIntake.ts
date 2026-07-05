import { internal } from "../_generated/api";
import type { ProjectKeyAuthorizationContext } from "./projectKeyAuthorization";
import { authorizeProjectKeyRequest } from "./projectKeyAuthorization";

export async function listPublicChangelog(c: ProjectKeyAuthorizationContext, projectId: string) {
  const authorization = await authorizeProjectKeyRequest(c, projectId, "read");
  if (!authorization.ok) {
    return authorization;
  }

  const entries = await c.env.runQuery(internal.changelogEntries.listPublishedByProjectInternal, {
    projectId: authorization.project._id,
  });

  return {
    ok: true as const,
    project: {
      title: authorization.project.title,
      publicChangelogSlug: authorization.project.publicChangelogSlug,
    },
    entries,
  };
}
