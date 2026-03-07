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
- `400` with `{}` on validation, missing ids, or auth errors.
- `401`, `403`, and `429` can also be returned by the API key layer before upvote logic runs.

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
