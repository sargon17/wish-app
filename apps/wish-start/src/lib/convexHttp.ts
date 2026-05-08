export function getConvexHttpBaseUrl(convexUrl?: string) {
  if (!convexUrl) {
    return "";
  }

  const parsedUrl = new URL(convexUrl);

  if (parsedUrl.hostname.endsWith(".convex.cloud")) {
    parsedUrl.hostname = parsedUrl.hostname.replace(/\.convex\.cloud$/, ".convex.site");
  }

  return parsedUrl.origin;
}
