---
title: Upvotes API
description: Toggle upvotes and understand the rules.
---

## Toggle upvote

`POST /api/project/:id/request/:reqID/upvote`

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

## Upvote behavior and rules

- One upvote per request per viewer.
- Toggling removes the existing upvote if it exists.
- Upvote counts are stored on the request and kept in sync with upvote records.
