import type { Doc } from "../_generated/dataModel";

const LEGACY_REVIEW_FEEDBACK_TITLE = "Review feedback: user is not enjoying Yearlit";
const LEGACY_REVIEW_FEEDBACK_SOURCE = "Source: in-app satisfaction prompt";

export function getRequestKind(request: Doc<"requests">) {
  if (request.kind) {
    return request.kind;
  }

  if (
    request.text === LEGACY_REVIEW_FEEDBACK_TITLE ||
    request.description?.includes(LEGACY_REVIEW_FEEDBACK_SOURCE)
  ) {
    return "complaint";
  }

  return "request";
}
