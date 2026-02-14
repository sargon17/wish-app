---
title: Requests API
description: List, create, and delete requests.
---

## List requests

`GET /api/project/:id/requests/`

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

## Delete request

`DELETE /api/project/:id/request/:reqID`

Notes:
- Deletes the request and any related upvotes.

Response:
- `200` with `{}` on success.
- `400` with `{}` on errors or invalid ids.

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
