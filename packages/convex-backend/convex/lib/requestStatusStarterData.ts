export const STARTER_PROJECT_STATUSES = [
  { name: "open", displayName: "Open", color: "#f97316" },
  { name: "under-review", displayName: "Under Review", color: "#eab308" },
  { name: "planned", displayName: "Planned", color: "#3b82f6" },
  { name: "in-progress", displayName: "In Progress", color: "#8b5cf6" },
  { name: "done", displayName: "Done", color: "#22c55e" },
] as const;

export const STARTER_PROJECT_STATUS_NAMES = STARTER_PROJECT_STATUSES.map((status) => status.name) as [
  "open",
  "under-review",
  "planned",
  "in-progress",
  "done",
];
