import type { Id } from "@wish/convex-backend/data-model";

export const complaintStages = [
  "new",
  "triaged",
  "in_progress",
  "awaiting_user",
  "closed",
  "rejected",
  "duplicate",
] as const;

export const complaintSeverities = ["S1", "S2", "S3"] as const;

export const complaintCategories = [
  "Product defect",
  "Billing",
  "Account",
  "Abuse",
  "Support",
  "Other",
] as const;

export const complaintOutcomes = [
  "resolved",
  "cannot_fix",
  "rejected",
  "customer_issue",
  "duplicate",
] as const;

export const complaintStageLabels = {
  new: "New",
  triaged: "Triaged",
  in_progress: "In progress",
  awaiting_user: "Awaiting user",
  closed: "Closed",
  rejected: "Rejected",
  duplicate: "Duplicate",
} satisfies Record<(typeof complaintStages)[number], string>;

export const complaintOutcomeLabels = {
  resolved: "Resolved",
  cannot_fix: "Cannot fix",
  rejected: "Rejected",
  customer_issue: "Customer-side issue",
  duplicate: "Duplicate",
} satisfies Record<(typeof complaintOutcomes)[number], string>;

export const terminalComplaintStages = new Set(["closed", "rejected", "duplicate"]);

export function isComplaintStage(value: string | undefined): value is (typeof complaintStages)[number] {
  return complaintStages.some((stage) => stage === value);
}

export function isComplaintSeverity(value: string | undefined): value is (typeof complaintSeverities)[number] {
  return complaintSeverities.some((severity) => severity === value);
}

export function isComplaintOutcome(value: string | undefined): value is (typeof complaintOutcomes)[number] {
  return complaintOutcomes.some((outcome) => outcome === value);
}

export function defaultComplaintEta() {
  return Date.now() + 24 * 60 * 60 * 1000;
}

export function formatDateTime(value: number | undefined) {
  if (!value) return "Unset";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function isComplaintOverdue(stage: string | undefined, firstResponseDueAt: number | undefined) {
  if (!firstResponseDueAt || terminalComplaintStages.has(stage ?? "new")) {
    return false;
  }

  return firstResponseDueAt < Date.now();
}

export function getComplaintAging(createdAt: number) {
  const hours = Math.max(0, Math.floor((Date.now() - createdAt) / (60 * 60 * 1000)));
  if (hours < 24) return `${hours}h old`;
  return `${Math.floor(hours / 24)}d old`;
}

export function toDateTimeLocalValue(value: number | undefined) {
  if (!value) return "";
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export function fromDateTimeLocalValue(value: string) {
  return value ? new Date(value).getTime() : undefined;
}

export function getFilterCounts(
  complaints: Array<{
    _creationTime: number;
    complaintStage?: string;
    complaintOwnerUserId?: Id<"users">;
    complaintFirstResponseDueAt?: number;
    complaintSeverity?: string;
  }>,
  currentUserId: Id<"users">,
) {
  return {
    all: complaints.length,
    triage: complaints.filter((complaint) => (complaint.complaintStage ?? "new") === "new").length,
    overdue: complaints.filter((complaint) =>
      isComplaintOverdue(complaint.complaintStage, complaint.complaintFirstResponseDueAt)
    ).length,
    mine: complaints.filter((complaint) => complaint.complaintOwnerUserId === currentUserId).length,
    critical: complaints.filter((complaint) => complaint.complaintSeverity === "S1").length,
    closed: complaints.filter((complaint) => terminalComplaintStages.has(complaint.complaintStage ?? "new")).length,
  };
}
