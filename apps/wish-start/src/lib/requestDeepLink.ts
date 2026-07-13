export function requestItemFromSearch(value: unknown) {
  if (typeof value !== "string") return;

  const item = value.trim();
  return item.length > 0 ? item : undefined;
}

export function locationWithoutRequestItem(pathname: string, searchString: string) {
  const search = new URLSearchParams(searchString);
  search.delete("item");

  const suffix = search.toString();
  return `${pathname}${suffix ? `?${suffix}` : ""}`;
}
