---
title: Errors & Status Codes
description: How the API signals failures and validation issues.
---

## Error responses

Public routes now return a consistent JSON shape:

```json
{
  "error": "string",
  "code": "string",
  "retryAfterMs": 12000
}
```

The `retryAfterMs` field is only present for rate limiting. Successful mutations still return `200` with `{}`.

## Public error contract

| HTTP status | Code | Meaning | Client action |
| --- | --- | --- | --- |
| `400` | `validation_failed` | The request body or parameters were invalid. | Fix the payload and retry. |
| `401` | `missing_api_key` | No API key was provided. | Add an API key. |
| `401` | `invalid_api_key` | The key was malformed, expired, or otherwise not valid. | Replace the key. |
| `403` | `insufficient_scope` | The key does not have the required scope. | Use a broader-scoped key. |
| `403` | `forbidden` | The caller is authenticated but cannot perform the action. | Change the caller or stop the action. |
| `404` | `not_found` | The resource does not exist or is intentionally hidden. | Treat it as unavailable. |
| `429` | `rate_limited` | The caller is temporarily throttled. | Wait `retryAfterMs` and retry. |
| `500` | `internal_error` | An unexpected server error occurred. | Retry later or report the failure. |

## Validation errors

Common validation checks enforced by the API:
- Request text must be at least 3 characters.
- Requester email must be a valid email address when provided.
- Comment body must be non-empty and up to 1000 characters.
- `clientId` is required for public comments, public comment deletion, and upvotes.
- Project and request ids must be valid and consistent.

## Existence hiding

Public routes intentionally return `not_found` for cases where exposing a resource relationship would leak ownership or cross-project existence:

- A request id does not exist.
- A request exists but does not belong to the project in the path.
- A comment id exists but does not belong to the supplied request or project.
- A project lookup fails on API-key-protected project routes.

That keeps the public API from distinguishing "missing" from "not yours" in places where the distinction would disclose data.
