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
- Protected and public failures use the stable error contract documented in [Errors & Status Codes](/reference/errors/).
- The public error payload is structured as `{ "error": string, "code": string }`, with `retryAfterMs` only for rate limiting.
- Lookup failures that would reveal ownership or cross-project existence return `404 not_found` instead of exposing a forbidden or missing-resource distinction.
- List endpoints return JSON objects with arrays of items.
