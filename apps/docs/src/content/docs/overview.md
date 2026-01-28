---
title: Overview
description: What the Wish API provides and how to use it.
---

## What the API provides

The Wish API exposes project requests and the public interactions around them:
- List requests for a project with their current status.
- Create new requests for a project.
- List and create comments on a request.
- Toggle upvotes on a request.

## Base URL

```
https://<your-wish-app-host>
```

All endpoints are rooted under `/api`.

## Authentication and identity model

The public API uses a lightweight identity model:
- For public viewers, supply a stable `clientId` in request bodies to identify the viewer across sessions.
- If the caller is authenticated (Clerk + Convex identity), the API will use the authenticated user instead of `clientId` for comments and upvotes.

## Key resource IDs

- `projectId`: a string Convex id for a project (used in path params).
- `requestId`: a string Convex id for a request (used in path params).

## Response conventions

- Successful mutating endpoints return HTTP 200 with an empty JSON body (`{}`).
- Failed requests return HTTP 400 with an empty JSON body (`{}`).
- List endpoints return JSON objects with arrays of items.
