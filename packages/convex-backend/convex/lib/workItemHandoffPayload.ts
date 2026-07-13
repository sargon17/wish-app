export function buildWorkItemDescription(
  description: string | undefined,
  sourceUrl: string,
) {
  const sourceLink = `[View original in Wish](${sourceUrl})`;
  return description ? `${description}\n\n---\n\n${sourceLink}` : sourceLink;
}

export function buildWishSourceUrl(
  baseUrl: string,
  projectId: string,
  projectSlug: string | undefined,
  kind: "request" | "complaint",
  requestId: string,
) {
  const source = kind === "complaint" ? "complaints" : "requests";
  const path = ["dashboard", "project", projectId, projectSlug ?? "project", source]
    .map(encodeURIComponent)
    .join("/");
  const url = new URL(`/${path}`, baseUrl);
  url.searchParams.set("item", requestId);
  return url.toString();
}
