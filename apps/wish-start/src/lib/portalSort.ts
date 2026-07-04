const PORTAL_SORTS = ["top", "newest"] as const;

type PortalSort = (typeof PORTAL_SORTS)[number];

export function normalizePortalSort(value: unknown): PortalSort {
  return PORTAL_SORTS.includes(value as PortalSort) ? (value as PortalSort) : "top";
}
