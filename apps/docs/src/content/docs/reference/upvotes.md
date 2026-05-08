---
title: Upvotes API
description: Toggle upvotes and understand the rules.
---

## Toggle upvote

`POST /api/project/:id/request/:reqID/upvote`

Auth:
- Requires an API key with `write` scope.

Request body:
```json
{
  "clientId": "string"
}
```

Notes:
- If the caller is authenticated, the upvote is linked to the user.
- Public callers must supply a `clientId`.
- The API toggles the upvote state for the viewer.

Response:
- `200` with `{}` on success.
- Public failures use the stable error contract documented in [Errors & Status Codes](/reference/errors/).
- Common responses include `400 validation_failed`, `401 missing_api_key` or `invalid_api_key`, `403 insufficient_scope` or `forbidden`, `404 not_found`, and `429 rate_limited`.
- Request and project mismatches remain hidden behind `404 not_found` when revealing ownership would leak existence.

## Upvote behavior and rules

- One upvote per request per viewer.
- Toggling removes the existing upvote if it exists.
- Upvote counts are stored on the request and kept in sync with upvote records.

## Read current viewer upvotes

`GET /api/project/:id/upvotes?clientId=<clientId>`

This endpoint is currently public and does not require an API key.

Response example:
```json
{
  "upvotes": [
    "requests:xyz789"
  ]
}
```
