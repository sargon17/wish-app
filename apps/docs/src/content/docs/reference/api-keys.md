---
title: API Keys
description: How to create, store, and send API keys correctly.
---

## Where API keys come from

Project API keys are created in the dashboard:
- A new project returns one plaintext API key once, right after creation.
- Additional keys can be created from the project's **Settings -> API keys** tab.
- Existing keys can be revoked individually.

Important:
- The raw API key is shown only once.
- The app stores only a hash and a short preview.
- If you lose a key, create a new one or use another active key.

## How to store the key

Treat the API key like a server secret:
- Store it in your backend environment variables or secret manager.
- Do not hardcode it in frontend bundles.
- Do not log it.
- Do not send it to browsers unless the browser is the intended trusted caller.

Recommended env var example:

```bash
WISH_API_KEY=wish_pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WISH_PROJECT_ID=projects:abc123
```

## How to send the key

Protected endpoints accept either:
- `x-api-key: <apiKey>`
- `authorization: Bearer <apiKey>`

Example with `x-api-key`:

```bash
curl -s \
  "https://<your-wish-app-host>/api/project/<projectId>/requests/" \
  -H "x-api-key: $WISH_API_KEY"
```

Example with `Authorization`:

```bash
curl -s \
  "https://<your-wish-app-host>/api/project/<projectId>/requests/" \
  -H "authorization: Bearer $WISH_API_KEY"
```

## Scopes

Current API key scopes:
- `read`: list requests and list comments
- `write`: create requests, create comments, and toggle upvotes
- `admin`: destructive operations such as deleting a request

Scope inheritance:
- `admin` also satisfies `write` and `read`
- `write` also satisfies `read`

## Protected vs public endpoints

Protected endpoints require an API key:
- `GET /api/project/:id/requests/`
- `POST /api/project/:id/request/`
- `DELETE /api/project/:id/request/:reqID`
- `GET /api/project/:id/request/:reqID/comments`
- `POST /api/project/:id/request/:reqID/comment`
- `POST /api/project/:id/request/:reqID/upvote`

Public endpoint:
- `GET /api/project/:id/upvotes?clientId=<clientId>`

## Correct request handling

When integrating:
1. Keep the `projectId` in the URL path.
2. Send the API key on every protected request.
3. Send a stable `clientId` for create request, comment, and upvote flows when the caller is public.
4. Handle `401`, `403`, and `429` explicitly.

Recommended behavior:
- `401`: rotate or replace the API key, or verify the key/project pair
- `403`: use a key with a broader scope
- `429`: retry later using the returned `retryAfterMs`

## Rotation and revocation

- Revoked keys stop working immediately.
- Existing integrations should each get their own key when possible.
- If one integration is compromised, revoke only that key instead of replacing every caller.

## Legacy projects

Older projects may still have a legacy project key internally.
The backend migrates that key into the new API key system automatically the first time it is used.
