import { ConvexError } from "convex/values";

export const publicErrorCodes = [
  "validation_failed",
  "missing_api_key",
  "invalid_api_key",
  "insufficient_scope",
  "not_found",
  "forbidden",
  "rate_limited",
  "internal_error",
] as const;

export type PublicErrorCode = (typeof publicErrorCodes)[number];

export type PublicErrorResponse = {
  error: string;
  code: PublicErrorCode;
  retryAfterMs?: number;
};

type PublicErrorInput = {
  code: PublicErrorCode;
  error?: string;
  retryAfterMs?: number;
};

const publicErrorMessages: Record<PublicErrorCode, string> = {
  validation_failed: "Invalid request",
  missing_api_key: "Missing API key",
  invalid_api_key: "Invalid API key",
  insufficient_scope: "Insufficient API key scope",
  not_found: "Not found",
  forbidden: "Forbidden",
  rate_limited: "Too many requests",
  internal_error: "Internal server error",
};

const publicErrorStatuses: Record<PublicErrorCode, number> = {
  validation_failed: 400,
  missing_api_key: 401,
  invalid_api_key: 401,
  insufficient_scope: 403,
  not_found: 404,
  forbidden: 403,
  rate_limited: 429,
  internal_error: 500,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPublicErrorCode(value: unknown): value is PublicErrorCode {
  return typeof value === "string" && publicErrorCodes.includes(value as PublicErrorCode);
}

function isPublicErrorInput(value: unknown): value is PublicErrorInput {
  if (!isRecord(value)) {
    return false;
  }

  return isPublicErrorCode(value.code);
}

export function createPublicError(code: PublicErrorCode, error?: string, retryAfterMs?: number) {
  return { code, error, retryAfterMs } satisfies PublicErrorInput;
}

export function publicErrorResponse(error: PublicErrorInput): PublicErrorResponse {
  const response: PublicErrorResponse = {
    error: error.error ?? publicErrorMessages[error.code],
    code: error.code,
  };

  if (typeof error.retryAfterMs === "number") {
    response.retryAfterMs = error.retryAfterMs;
  }

  return response;
}

export function publicErrorStatus(code: PublicErrorCode) {
  return publicErrorStatuses[code];
}

export function publicErrorJson(
  c: { json: (body: PublicErrorResponse, status: number) => Response },
  error: PublicErrorInput,
) {
  return c.json(publicErrorResponse(error), publicErrorStatus(error.code));
}

function publicErrorFromConvexError(error: unknown): PublicErrorResponse | null {
  if (error instanceof ConvexError && isRecord(error.data)) {
    const code = error.data.code;
    if (code === "BAD_REQUEST") return publicErrorResponse({ code: "validation_failed" });
    if (code === "NOT_FOUND") return publicErrorResponse({ code: "not_found" });
    if (code === "FORBIDDEN") return publicErrorResponse({ code: "forbidden" });
    if (code === "UNAUTHENTICATED") return publicErrorResponse({ code: "invalid_api_key" });
    if (code === "RATE_LIMITED") return publicErrorResponse({ code: "rate_limited" });
  }

  if (isRecord(error) && isRecord(error.data)) {
    const code = error.data.code;
    if (
      !isPublicErrorCode(code) &&
      code !== "BAD_REQUEST" &&
      code !== "NOT_FOUND" &&
      code !== "FORBIDDEN" &&
      code !== "UNAUTHENTICATED" &&
      code !== "RATE_LIMITED"
    ) {
      return null;
    }

    if (code === "BAD_REQUEST") return publicErrorResponse({ code: "validation_failed" });
    if (code === "NOT_FOUND") return publicErrorResponse({ code: "not_found" });
    if (code === "FORBIDDEN") return publicErrorResponse({ code: "forbidden" });
    if (code === "UNAUTHENTICATED") return publicErrorResponse({ code: "invalid_api_key" });
    if (code === "RATE_LIMITED") return publicErrorResponse({ code: "rate_limited" });
  }

  return null;
}

export function toPublicErrorResponse(
  error: unknown,
  fallback: PublicErrorCode = "internal_error",
) {
  if (isPublicErrorInput(error)) {
    return publicErrorResponse(error);
  }

  const convexError = publicErrorFromConvexError(error);
  if (convexError) {
    return convexError;
  }

  return publicErrorResponse({ code: fallback });
}
