---
title: Comments API
description: List, create, and delete comments on a request.
---

## List comments

`GET /api/project/:id/request/:reqID/comments`

Auth:
- Requires an API key with `read` scope.

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

Auth:
- Requires an API key with `write` scope.

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
- Public failures use the stable error contract documented in [Errors & Status Codes](/reference/errors/).
- Common responses include `400 validation_failed`, `401 missing_api_key` or `invalid_api_key`, `403 insufficient_scope` or `forbidden`, `404 not_found`, and `429 rate_limited`.
- Hidden-existence checks keep request, project, and comment mismatches on `404 not_found` rather than exposing ownership details.

## Delete comment

`DELETE /api/project/:id/request/:reqID/comment/:commentId?clientId=<clientId>`

Auth:
- Public callers must send the same `clientId` that created the comment.

Notes:
- Public deletion only works for comments stored as `authorType: client`.
- A public caller cannot delete Project Owner comments or comments created by another `clientId`.
- Project Owner dashboard deletion uses the authenticated app flow, not API-key access.

Response:
- `200` with `{}` on success.
- Public failures use the stable error contract documented in [Errors & Status Codes](/reference/errors/).
- Common responses include `400 validation_failed`, `403 forbidden`, and `404 not_found`.
- Hidden-existence checks keep request, project, and comment mismatches on `404 not_found` rather than exposing ownership details.

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
