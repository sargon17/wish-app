export const STARTER_PROJECT_STATUSES = [
  { name: "open", displayName: "Open" },
  { name: "under-review", displayName: "Under Review" },
  { name: "planned", displayName: "Planned" },
  { name: "in-progress", displayName: "In Progress" },
  { name: "done", displayName: "Done" },
] as const;

export const STARTER_PROJECT_STATUS_NAMES = STARTER_PROJECT_STATUSES.map((status) => status.name) as [
  "open",
  "under-review",
  "planned",
  "in-progress",
  "done",
];
