export interface Filter {
  label: string;
  value: string;
  count?: number;
}

export const buildFilters = (filters?: readonly Filter[]) => {
  if (!filters || filters.length === 0) return [];
  const count = filters.reduce((acc, filter) => acc + (filter.count ?? 0), 0);
  return [{ label: "All", value: "all", count }, ...filters];
};
