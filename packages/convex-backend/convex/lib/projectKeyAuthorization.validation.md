# Issue 18 verification notes

Verified design and source behavior for the shared project-key authorization helper in `projectKeyAuthorization.ts` and its HTTP seam in `http.ts`.

- Missing key: helper returns `missing_api_key` before project lookup.
- Invalid key: helper returns `invalid_api_key` after project lookup, migration, IP limit, and candidate hash verification.
- Insufficient scope: helper returns `insufficient_scope` after a matching key is found and key rate limiting passes.
- IP rate limit: helper checks the IP bucket before expensive key matching and returns `rate_limited` with `retryAfterMs` when throttled.
- Key rate limit: helper checks the matched key bucket only after a hash match and returns `rate_limited` with `retryAfterMs` when throttled.
- Legacy migration: helper migrates legacy project keys immediately after project lookup and still allows legacy placeholder matches when no active prefix keys exist.
- Successful authorization: helper returns the project document and matched API key, then marks the key as used.

Repo validation status in this sandbox:

- `npx tsc -p packages/convex-backend/convex/tsconfig.json --noEmit`: passed in this pass.
- `bun`: not available on PATH in this sandbox, so the repo scripts could not be rerun directly here.
- `bun run check-types`: not rerun in this pass because `bun` is unavailable in this sandbox.
- `bun run lint`: not rerun in this pass because `bun` is unavailable in this sandbox.
- `bun run test`: not rerun in this pass.
- `bun run build`: not rerun in this pass.
- `bun --filter @wish/convex-backend run check-types`: not rerun in this pass.
