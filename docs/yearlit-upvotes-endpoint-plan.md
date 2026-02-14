# Plan: Add viewer upvotes HTTP endpoint (for Yearlit)

## Context
Yearlit integrates Wish App via the public Convex HTTP API. For upvotes, Yearlit currently can only **toggle** and then optimistically update UI. To render “already upvoted” state reliably, Yearlit needs a **read** endpoint that returns the current viewer’s upvoted request IDs.

The Convex query already exists:
- `requestUpvotes.getViewerUpvotesByProject`

But it is **not exposed** in `convex/http.ts`.

---

## Goal
Expose a lightweight HTTP endpoint that returns request IDs upvoted by the current viewer (public client or authenticated dev), so Yearlit can render an accurate upvote state.

---

## Proposed Endpoint
**GET** `/api/project/:id/upvotes`

### Query params
- `clientId` (optional string) — required for public clients (Yearlit). If omitted, auth identity is used.

### Response
```json
{ "upvotes": ["requestId1", "requestId2", "..."] }
```

### Behavior
- If authenticated user exists → ignore `clientId`, return that user’s upvotes.
- If no auth and no `clientId` → return empty array (200).
- Reuse existing `requestUpvotes.getViewerUpvotesByProject` query.

---

## Implementation Steps
1. **convex/http.ts**
   - Add new `GET` route
   - Call `api.requestUpvotes.getViewerUpvotesByProject`
   - Return `{ upvotes }`

2. (Optional) Add a short doc update in README or a dedicated API doc file if desired.

---

## Notes
- This endpoint is read‑only and public‑safe, consistent with existing request/comment endpoints.
- Enables Yearlit to show the upvoted state immediately on load without toggling.
