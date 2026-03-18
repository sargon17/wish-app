---
title: Quickstart
description: Create requests, comments, and upvotes in minutes.
---

## Choose a clientId strategy

Pick a stable identifier for public viewers. Common options:
- A hashed user id from your app.
- A long-lived cookie stored in your frontend.
- A device identifier stored in local storage.

You will send this `clientId` in create request, comment, and upvote calls.

## Set your API credentials

Store the project id and API key in environment variables:

```bash
export WISH_PROJECT_ID="projects:abc123"
export WISH_API_KEY="wish_pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

Protected endpoints require the API key on every request.

## Fetch requests for a project

```bash
curl -s \
  "https://<your-wish-app-host>/api/project/$WISH_PROJECT_ID/requests/" \
  -H "x-api-key: $WISH_API_KEY"
```

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
        "type": "default"
      }
    }
  ]
}
```

## Create a request

```bash
curl -s -X POST \
  "https://<your-wish-app-host>/api/project/$WISH_PROJECT_ID/request/" \
  -H "x-api-key: $WISH_API_KEY" \
  -H "content-type: application/json" \
  -d '{
    "text": "Add CSV export",
    "description": "Allow CSV + JSON",
    "project": "'"$WISH_PROJECT_ID"'",
    "clientId": "client-42"
  }'
```

Success response:
```json
{}
```

## Add a comment

```bash
curl -s -X POST \
  "https://<your-wish-app-host>/api/project/$WISH_PROJECT_ID/request/<requestId>/comment" \
  -H "x-api-key: $WISH_API_KEY" \
  -H "content-type: application/json" \
  -d '{
    "clientId": "client-42",
    "body": "This would help our team a lot."
  }'
```

Success response:
```json
{}
```

## Toggle an upvote

```bash
curl -s -X POST \
  "https://<your-wish-app-host>/api/project/$WISH_PROJECT_ID/request/<requestId>/upvote" \
  -H "x-api-key: $WISH_API_KEY" \
  -H "content-type: application/json" \
  -d '{
    "clientId": "client-42"
  }'
```

Success response:
```json
{}
```

## Handle auth and rate limits

Protected requests can fail with:
- `401` for missing or invalid API keys
- `403` for keys without enough scope
- `429` for rate limiting

Example rate-limit response:

```json
{
  "error": "Too many requests",
  "code": "rate_limited",
  "retryAfterMs": 14321
}
```
