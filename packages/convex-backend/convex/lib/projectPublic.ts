import type { Doc } from "../_generated/dataModel";

export function toPublicProject(project: Doc<"projects">) {
  const { apiKeyHash, ...publicProject } = project;
  return publicProject;
}
