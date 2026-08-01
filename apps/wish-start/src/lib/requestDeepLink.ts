export function requestItemFromSearch(value: unknown) {
  if (value === undefined) return;
  if (typeof value !== "string") return null;

  const item = value.trim();
  return item.length > 0 ? item : null;
}

export function locationWithoutRequestItem(pathname: string, searchString: string) {
  const search = new URLSearchParams(searchString);
  search.delete("item");

  const suffix = search.toString();
  return `${pathname}${suffix ? `?${suffix}` : ""}`;
}
