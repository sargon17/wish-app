---
title: Errors & Status Codes
description: How the API signals failures and validation issues.
---

## Error responses

The public API uses simple error responses:
- `200` with `{}` for successful mutations.
- `400` with `{}` for validation, missing ids, or auth errors.

The body is intentionally minimal, so clients should rely on the status code.

## Validation errors

Common validation checks enforced by the API:
- Request text must be at least 4 characters.
- Comment body must be non-empty and up to 1000 characters.
- `clientId` is required for public comments and upvotes.
- Project and request ids must be valid and consistent.

## 200 vs 400 responses

- Use `200` to confirm a mutation succeeded.
- Use `400` to treat the request as failed and show a retry message.
