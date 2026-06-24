import { isRequesterEmail, normalizeRequesterEmail } from "./requesterIdentity";

export type RequestInputError =
  | "TITLE_TOO_SHORT"
  | "TITLE_TOO_LONG"
  | "DESCRIPTION_TOO_LONG"
  | "REQUESTER_EMAIL_INVALID";

export function requestInputErrorMessage(error: RequestInputError) {
  switch (error) {
    case "TITLE_TOO_SHORT":
      return "Request title must be at least 3 characters";
    case "TITLE_TOO_LONG":
      return "Request title is too long";
    case "DESCRIPTION_TOO_LONG":
      return "Request description is too long";
    case "REQUESTER_EMAIL_INVALID":
      return "Requester email is invalid";
  }
}

function normalizeRequestDescription(value: string | undefined) {
  const description = value?.trim();
  return description || undefined;
}

export function normalizeRequestInput(input: {
  text: string;
  description?: string;
  requesterEmail?: string;
}) {
  const text = input.text.trim();
  const description = normalizeRequestDescription(input.description);
  const requesterEmail = normalizeRequesterEmail(input.requesterEmail);

  if (text.length < 3) {
    return { ok: false as const, error: "TITLE_TOO_SHORT" as const };
  }

  if (text.length > 120) {
    return { ok: false as const, error: "TITLE_TOO_LONG" as const };
  }

  if (description && description.length > 1000) {
    return { ok: false as const, error: "DESCRIPTION_TOO_LONG" as const };
  }

  if (requesterEmail && !isRequesterEmail(requesterEmail)) {
    return { ok: false as const, error: "REQUESTER_EMAIL_INVALID" as const };
  }

  return {
    ok: true as const,
    value: {
      text,
      description,
      requesterEmail,
    },
  };
}
