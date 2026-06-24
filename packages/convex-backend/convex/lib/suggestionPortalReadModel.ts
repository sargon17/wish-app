import type { Doc } from "../_generated/dataModel";

export const DEFAULT_PORTAL_PAGE_SIZE = 20;
export const MAX_PORTAL_PAGE_SIZE = 200;
export const PORTAL_SORTS = ["top", "newest"] as const;

export type PortalSort = (typeof PORTAL_SORTS)[number];

type PortalRequest = Pick<Doc<"requests">, "_creationTime" | "description" | "text" | "upvoteCount">;

export function normalizePortalQuery(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

export function normalizePortalSearchTokens(value: string) {
  return normalizePortalQuery(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);
}

export function portalRequestMatchesSearch(request: PortalRequest, search: string) {
  if (!search) {
    return true;
  }

  return `${request.text} ${request.description ?? ""}`.toLowerCase().includes(search);
}

export function scoreSimilarPortalRequest(request: PortalRequest, tokens: string[]) {
  const haystack = `${request.text} ${request.description ?? ""}`.toLowerCase();
  return tokens.reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
}

export function normalizePortalSort(value: string | undefined): PortalSort {
  return PORTAL_SORTS.includes(value as PortalSort) ? value as PortalSort : "top";
}

export function sortPortalRequests<T extends PortalRequest>(requests: T[], sort: PortalSort) {
  return [...requests].sort((a, b) => {
    if (sort === "newest") {
      return b._creationTime - a._creationTime;
    }

    const upvoteDiff = (b.upvoteCount ?? 0) - (a.upvoteCount ?? 0);
    if (upvoteDiff !== 0) return upvoteDiff;
    return b._creationTime - a._creationTime;
  });
}

export function getPortalPage<T>(items: T[], cursor: number | undefined, requestedLimit: number | undefined) {
  const safeCursor = Math.max(0, cursor ?? 0);
  const limit = Math.max(1, Math.min(requestedLimit ?? DEFAULT_PORTAL_PAGE_SIZE, MAX_PORTAL_PAGE_SIZE));
  const page = items.slice(safeCursor, safeCursor + limit);
  const nextCursor = safeCursor + limit < items.length ? safeCursor + limit : undefined;

  return {
    page,
    nextCursor,
    totalCount: items.length,
  };
}
