# Next Features Plan: Fast Iterations, Foundation-First (Small SaaS Teams)

## Summary
This plan prioritizes features that reduce structural risk first, then unlock monetization with confidence.  
Guiding choices locked from your input:
- ICP: small SaaS teams
- Optimization: technical foundation
- Cadence: no fixed timeline, ship in fast iterations with strict dependency order

## Prioritized Feature Roadmap (Execution Order)

## Iteration 1: Access Control and Data Isolation (P0)
1. Implement workspace model.
2. Add membership model with roles (`owner`, `admin`, `member`, `viewer`).
3. Move project ownership from single user to workspace scope.
4. Enforce workspace-scoped authorization in all Convex queries/mutations.
5. Enforce the same checks in all public HTTP routes.

Exit criteria:
- No cross-workspace data access possible.
- Every project/request/status/comment/upvote operation is role-gated.

## Iteration 2: Public Feedback Surface (P0)
1. Add public project endpoint with stable slug (`/p/:projectSlug`).
2. Add public request submission UI and endpoint.
3. Add anonymous identity strategy for external users (`clientId` cookie/device key).
4. Add public upvote/comment controls with abuse guards.
5. Add moderation controls (archive/hide/delete external content).

Exit criteria:
- External users can submit, vote, and comment without internal auth.
- Internal team can moderate safely.

## Iteration 3: Anti-Abuse and Operational Safety (P0)
1. Add rate limiting to all public write endpoints.
2. Add spam controls (captcha/turnstile + payload guards).
3. Add action audit logs (status change, delete, role change, moderation actions).
4. Add error monitoring and alerting baseline.
5. Add backup/restore runbook.

Exit criteria:
- Public endpoints resist bot abuse.
- Critical incidents are observable and diagnosable.

## Iteration 4: Team Collaboration UX (P1)
1. Add invite flow (email-based invite links).
2. Add member management screen (role changes/removal).
3. Add project-level access toggles within workspace.
4. Add “activity feed” per project (request and status events).

Exit criteria:
- Small team collaboration is complete end-to-end.
- Owners/admins can manage access without manual DB work.

## Iteration 5: Monetization Infrastructure (P1)
1. Integrate Stripe checkout and subscription state sync via webhooks.
2. Add plan model and entitlements.
3. Enforce limits in backend (`projects`, `members`, `requests/month`, `API usage`).
4. Add billing settings page (plan, renewal, upgrade/downgrade, portal link).

Exit criteria:
- Subscription lifecycle is production-safe.
- Limits are enforced server-side and reflected in UI.

## Iteration 6: Activation and Retention Layer (P2)
1. Add onboarding checklist (create workspace -> project -> first public request).
2. Add email notifications (new request, comment, status update).
3. Add weekly digest.
4. Add CSV export for requests/comments.

Exit criteria:
- New accounts reach first value quickly.
- Teams have enough communication loop to retain.

## Public API / Interface / Type Changes to Introduce

1. Data model additions:
- `workspaces`
- `workspaceMemberships`
- `projectVisibility` (`private` | `public`)
- `projectSlug` (unique)
- `invites`
- `subscriptions`
- `entitlements`
- `auditLogs`

2. Existing model changes:
- `projects.user` -> `projects.workspaceId`
- Requests/comments/upvotes: enforce workspace and role context checks

3. Public HTTP API additions:
- `GET /api/public/project/:slug`
- `POST /api/public/project/:slug/request`
- `POST /api/public/project/:slug/request/:id/comment`
- `POST /api/public/project/:slug/request/:id/upvote`

4. Authz interfaces:
- Shared permission guard helpers for Convex handlers and Hono routes
- Role capability map (single source of truth)

## Testing and Validation Plan

1. Authorization tests:
- Member cannot access another workspace data.
- Viewer cannot mutate.
- Admin/member permissions behave as defined.
- Public routes cannot mutate private projects.

2. Public abuse tests:
- Rate limit reached returns expected failure.
- Invalid payload/captcha failures are rejected.
- Duplicate/bot-like bursts are throttled.

3. Billing tests:
- New subscription activates entitlements.
- Cancellation and failed payments downgrade correctly.
- Limits block writes when exceeded.

4. End-to-end scenarios:
- Team setup: owner creates workspace, invites member, member triages requests.
- External flow: anonymous user submits request, upvotes, comments.
- Internal flow: status changes, notifications emitted, activity logged.

5. Regression gates per iteration:
- `bun lint:strict`
- `bun check-types`
- `bun build`
- Critical smoke e2e for dashboard + public board paths

## Rollout Strategy

1. Feature flags:
- `workspaces_v1`
- `public_board_v1`
- `billing_v1`

2. Progressive release:
- Internal dogfood workspace first.
- Selected beta workspaces second.
- Default-on after metrics stability.

3. Observability metrics:
- Unauthorized access attempts
- Public write success/failure ratio
- Spam rejection rate
- Invite acceptance rate
- Activation funnel: signup -> first project -> first public request

## Assumptions and Defaults
1. No fixed timeline; work ships in rapid iterations with strict dependency order.
2. Small SaaS teams are the primary buyer.
3. Technical foundation is prioritized over immediate feature breadth.
4. Billing is intentionally sequenced after security/workspace/public-surface hardening.
5. Existing UI stack stays Next.js + Convex + Clerk + shadcn/Radix + Tailwind.
