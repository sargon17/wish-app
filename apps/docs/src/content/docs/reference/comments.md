---
title: Comments API
description: List and create comments on a request.
---

## List comments

`GET /api/project/:id/request/:reqID/comments`

Response example:
```json
{
  "comments": [
    {
      "_id": "requestComments:abc123",
      "_creationTime": 1700000002000,
      "requestId": "requests:xyz789",
      "projectId": "projects:abc123",
      "authorType": "client",
      "authorClientId": "client-42",
      "body": "This would help our team a lot.",
      "createdAt": 1700000001999
    }
  ]
}
```

## Create comment

`POST /api/project/:id/request/:reqID/comment`

Request body:
```json
{
  "clientId": "string",
  "body": "string"
}
```

Notes:
- `body` is trimmed; empty comments are rejected.
- Max length is 1000 characters.
- If the caller is authenticated, the comment is stored as `authorType: developer`.
- Public callers must supply a `clientId`.

Response:
- `200` with `{}` on success.
- `400` with `{}` on validation, missing ids, or auth errors.

## Comment object shape

```json
{
  "_id": "requestComments:abc123",
  "_creationTime": 1700000002000,
  "requestId": "requests:xyz789",
  "projectId": "projects:abc123",
  "authorType": "client",
  "authorUserId": null,
  "authorClientId": "client-42",
  "body": "This would help our team a lot.",
  "createdAt": 1700000001999
}
```
