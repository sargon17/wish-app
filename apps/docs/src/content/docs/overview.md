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
- Manage access to those protected endpoints with project API keys.

## Base URL

```
https://<your-wish-app-host>
```

All endpoints are rooted under `/api`.

## Authentication and identity model

The API uses two identity layers:
- Protected endpoints require a project API key.
- Public viewer identity is carried by a stable `clientId` where needed.

API key transport:
- `x-api-key: <apiKey>`
- `authorization: Bearer <apiKey>`

Viewer identity:
- For public viewers, supply a stable `clientId` in request bodies to identify the viewer across sessions.
- If the caller is authenticated (Clerk + Convex identity), comment and upvote mutations will use the authenticated user instead of `clientId`.

## Key resource IDs

- `projectId`: a string Convex id for a project (used in path params).
- `requestId`: a string Convex id for a request (used in path params).

## Response conventions

- Successful mutating endpoints return HTTP `200` with an empty JSON body (`{}`).
- Protected endpoints may return `401`, `403`, or `429` with an error payload.
- Some validation and lookup failures still return `400` with an empty JSON body (`{}`).
- List endpoints return JSON objects with arrays of items.
