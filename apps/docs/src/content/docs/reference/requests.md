---
title: Requests API
description: List, create, and delete requests.
---

## List requests

`GET /api/project/:id/requests/`

Auth:
- Requires an API key with `read` scope.

Returns the project and its requests. Each request includes a `computedStatus` object derived from the request's `status` id.

Response example:
```json
{
  "project": {
    "_id": "projects:abc123",
    "_creationTime": 1700000000000,
    "title": "My Project",
    "user": "users:def456"
  },
  "requests": [
    {
      "_id": "requests:xyz789",
      "_creationTime": 1700000001000,
      "text": "Add export",
      "description": "CSV and JSON",
      "clientId": "client-42",
      "status": "requestStatuses:open123",
      "project": "projects:abc123",
      "upvoteCount": 2,
      "computedStatus": {
        "_id": "requestStatuses:open123",
        "_creationTime": 1700000000500,
        "name": "open",
        "displayName": "Open",
        "description": null,
        "type": "default",
        "color": null
      }
    }
  ]
}
```

## Create request

`POST /api/project/:id/request/`

Auth:
- Requires an API key with `write` scope.

Request body:
```json
{
  "text": "string (min 4 chars)",
  "description": "string (optional)",
  "project": "<projectId>",
  "clientId": "string"
}
```

Notes:
- `text` must be at least 4 characters.
- `project` should match the path `:id`.
- The API sets the initial status to the project's `open` status.

Response:
- `200` with `{}` on success.
- `400` with `{}` on validation or project/status errors.
- `401` with `{ "error": "...", "code": "missing_api_key" | "invalid_api_key" }` when the key is missing or invalid.
- `403` with `{ "error": "Insufficient API key scope", "code": "insufficient_scope" }` when the key lacks `write`.
- `429` with `{ "error": "Too many requests", "code": "rate_limited", "retryAfterMs": number }` when throttled.

## Delete request

`DELETE /api/project/:id/request/:reqID`

Auth:
- Requires an API key with `admin` scope.

Notes:
- Deletes the request and any related upvotes.

Response:
- `200` with `{}` on success.
- `400` with `{}` on errors or invalid ids.
- `401`, `403`, and `429` use the same auth error shapes as other protected endpoints.

## Request object shape

```json
{
  "_id": "requests:xyz789",
  "_creationTime": 1700000001000,
  "text": "Add export",
  "description": "CSV and JSON",
  "clientId": "client-42",
  "status": "requestStatuses:open123",
  "project": "projects:abc123",
  "upvoteCount": 2,
  "computedStatus": {
    "_id": "requestStatuses:open123",
    "_creationTime": 1700000000500,
    "name": "open",
    "displayName": "Open",
    "description": null,
    "type": "default",
    "color": null
  }
}
```
