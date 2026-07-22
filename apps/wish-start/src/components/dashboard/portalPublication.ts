export function getPortalPublication(projectSlug?: string, publishedAt?: number) {
  const portalPath = projectSlug ? `/p/${projectSlug}` : null;
  const isPublished = Boolean(publishedAt && portalPath);

  return {
    isPublished,
    label: isPublished ? "Published" : "Unpublished",
    portalPath,
  };
}
