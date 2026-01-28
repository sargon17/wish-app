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

## Fetch requests for a project

```bash
curl -s \
  "https://<your-wish-app-host>/api/project/<projectId>/requests/"
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
  "https://<your-wish-app-host>/api/project/<projectId>/request/" \
  -H "content-type: application/json" \
  -d '{
    "text": "Add CSV export",
    "description": "Allow CSV + JSON",
    "project": "<projectId>",
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
  "https://<your-wish-app-host>/api/project/<projectId>/request/<requestId>/comment" \
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
  "https://<your-wish-app-host>/api/project/<projectId>/request/<requestId>/upvote" \
  -H "content-type: application/json" \
  -d '{
    "clientId": "client-42"
  }'
```

Success response:
```json
{}
```
