---
title: Errors & Status Codes
description: How the API signals failures and validation issues.
---

## Error responses

The API currently uses two error styles:
- `200` with `{}` for successful mutations.
- `400` with `{}` for validation, missing ids, or auth errors.
- `401`, `403`, and `429` with JSON error payloads for API key and rate-limit failures.

Protected endpoint error payloads:

```json
{
  "error": "Missing API key",
  "code": "missing_api_key"
}
```

```json
{
  "error": "Invalid API key",
  "code": "invalid_api_key"
}
```

```json
{
  "error": "Insufficient API key scope",
  "code": "insufficient_scope"
}
```

```json
{
  "error": "Too many requests",
  "code": "rate_limited",
  "retryAfterMs": 12000
}
```

## Validation errors

Common validation checks enforced by the API:
- Request text must be at least 4 characters.
- Comment body must be non-empty and up to 1000 characters.
- `clientId` is required for public comments and upvotes.
- Project and request ids must be valid and consistent.

## 200 vs 400 responses

- Use `200` to confirm a mutation succeeded.
- Use `400` to treat the request as failed and show a retry message.
- Use `401` to rotate or replace the API key.
- Use `403` to switch to a key with a broader scope.
- Use `429` to retry after `retryAfterMs`.
