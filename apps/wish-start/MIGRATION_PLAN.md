# Wish App → TanStack Start Migration Plan

Status: **in progress**

## Phase 0 (this PR)
- [x] Scaffolded a new TanStack Start app at `apps/wish-start`
- [x] Added workspace-compatible scripts (`dev`, `build`, `lint`, `fmt`, `check-types`)
- [x] Removed the legacy Next.js app after the port stabilized

## Phase 1
- [x] Port base app shell/layout + theme setup
- [ ] Port shared UI components and utility modules
- [x] Wire auth provider (Clerk)
- [x] Wire Convex client setup

## Phase 2
- [ ] Port core routes/pages from Next App Router to TanStack file-based routes
- [ ] Replace Next-only APIs (`next/link`, `next/image`, middleware, server actions)

## Phase 3
- [ ] Port API integration (Hono endpoints/clients)
- [ ] Add parity checks for loading/error/auth boundaries
- [ ] Ensure build + typecheck + lint pass in CI

## Notes
- This branch intentionally starts with a minimal scaffold so code review can begin early.
- Subsequent commits will migrate feature slices incrementally.
