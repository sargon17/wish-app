# Wish App Monetizable V1 Gap Analysis

Date: 2026-02-11  
Scope: `apps/wish-app` product, backend, and operational readiness

## 1) Executive Summary

The product is a strong prototype for collecting and triaging feature requests. It already includes:
- Landing page and waitlist capture
- Authenticated dashboard
- Project and request management
- Custom statuses and drag-and-drop workflow
- Upvotes, comments, and basic request analytics
- Public HTTP endpoints for request/comment/upvote actions

However, it is not yet ready to charge reliably. The largest gaps are:
- Missing billing and subscription management
- Missing team/workspace model (single-user ownership today)
- Missing customer-facing portal experience (public board/submission UI)
- Missing critical authorization hardening across backend operations
- Missing onboarding, lifecycle communication, and support operations

Bottom line: this is pre-revenue beta quality, not paid-SaaS quality yet.

## 2) Current State (What Exists)

### Product capabilities
- Project creation and deletion
- Request CRUD and board workflow by status
- Manual status creation and color updates
- Request upvoting and comments
- Stats dashboard (totals, trends, status/project breakdown)
- Waitlist management panel

### Technical foundation
- Next.js + React + shadcn UI
- Convex backend with Clerk auth integration
- Hono-based public API routes through Convex HTTP router
- Basic environment validation

### Observed constraints
- No automated tests wired for behavior validation
- No billing stack
- No role model, team invites, or org boundaries
- No lifecycle notifications or outbound communications

## 3) Monetization Readiness Scorecard

| Dimension | Current Score | Why |
|---|---:|---|
| Core Product Value | 7/10 | Request workflow is usable and differentiated enough for early adopters. |
| Revenue Infrastructure | 1/10 | No plans, checkout, subscription lifecycle, invoices, or usage limits. |
| Security & Trust | 3/10 | Several mutations/queries lack ownership authorization checks. |
| Collaboration | 2/10 | No teams, roles, invites, or permission boundaries. |
| Customer Experience | 4/10 | Good internal board, weak external submit/roadmap/journey flows. |
| Reliability & Ops | 3/10 | No monitoring/alerts, incident workflows, or regression safety net. |
| Go-To-Market Readiness | 3/10 | Waitlist exists, but onboarding and conversion funnel are incomplete. |

Overall readiness: **3.3 / 10**

## 4) Hard Blockers Before Charging (P0)

These are non-negotiable for paid launch.

| Blocker | Why it blocks revenue | Suggested implementation direction |
|---|---|---|
| Authorization hardening across backend | Paid customers expect strict data isolation and access control. | Add project ownership checks to all project-scoped queries/mutations and HTTP routes; enforce user/org scope server-side only. |
| Billing + subscription lifecycle | Cannot charge without checkout, recurring billing, plan state, cancellation, and dunning behavior. | Integrate Stripe Billing: checkout, customer portal, webhooks, subscription state sync in Convex. |
| Team/workspace model | B2B buyers pay for team workflows, not single-user tools. | Add workspace/org entity, membership table, invites, and role-based access (`owner/admin/member/viewer`). |
| Public feedback intake UX | Core promise requires customer submission without internal access. | Add public board + submit form per project with stable anonymous identity and anti-abuse controls. |
| Plan limits and enforcement | No pricing power without gated value. | Add limits by plan: projects, requests/month, seats, API usage; enforce in mutations and UI. |
| Basic legal and trust baseline | Required for procurement and buyer trust. | Terms, Privacy, DPA-lite stance, data retention policy, security page. |

## 5) Strategic Gaps by Parallel Workstreams

### Workstream A: Revenue Engine
- Pricing model definition (Free/Pro/Business)
- Metering model (what is counted, when, and why)
- Stripe integration (checkout, portal, webhooks)
- Entitlement enforcement in backend and UI
- Billing admin view (current plan, renewal date, seat usage, upgrade CTA)

### Workstream B: Product Completeness
- Public project page with:
  - Request submission
  - Upvoting
  - Commenting
  - Status visibility / lightweight roadmap
- Request deduplication suggestions (title similarity)
- Merge duplicate requests
- Status update notes/changelog entries
- Search/filter/sort across requests

### Workstream C: Trust, Security, and Platform Reliability
- Ownership and role checks for every mutable operation
- Rate limiting for public endpoints
- Spam protection (captcha/turnstile + body limits + abuse throttling)
- Audit trail for admin actions (delete/edit/status changes)
- Error tracking + alerting + structured logs
- Daily backups / restore runbook

### Workstream D: Activation and Retention
- First-run onboarding wizard (create project, statuses, first request)
- Empty-state guidance and templates
- Invite teammate flow
- Email notifications:
  - New request
  - Status changed
  - Comment received
- Digest emails (weekly highlights)

### Workstream E: Go-To-Market Operations
- Marketing site messaging aligned with paid value
- Self-serve documentation for API and product setup
- In-app support channel / contact path
- Conversion analytics funnel (visit -> signup -> project -> first request -> activation)

## 6) Feature Baseline for a Paid “Basic” Plan

To start charging confidently, the basic paid tier should include at minimum:

1. One workspace with multiple members.
2. Role-based permissions.
3. Public request board per project.
4. Public request submission + upvote + comment.
5. Internal triage board with custom statuses.
6. Request search/filter/sort.
7. Status change history and timestamp visibility.
8. Email notifications for key events.
9. Usage limits with clear upgrade messaging.
10. Stripe checkout + subscription management portal.
11. Secure data access boundaries.
12. Basic analytics (request volume, top requests, status aging).
13. Export capability (CSV for requests/comments).
14. Basic support and docs.
15. Legal pages and trust baseline.

## 7) Recommended Monetization Positioning (Creative but Practical)

### Option 1: “Feedback Inbox”
- Focus: collect + triage requests.
- Pros: fastest to ship.
- Cons: weak differentiation, lower willingness to pay.

### Option 2 (Recommended): “Public Feedback + Internal Prioritization”
- Focus: bridge customer voice and internal roadmap execution.
- Pros: strongest value narrative for small SaaS teams; clear ROI story.
- Cons: requires public UX + notifications + stronger permissions.

### Option 3: “API-first Feedback Infrastructure”
- Focus: embedded/API-heavy integrations.
- Pros: technical moat.
- Cons: higher engineering cost before proven demand.

Recommendation: start with **Option 2**, then evolve into Option 3 after paid traction.

## 8) 90-Day Parallel Delivery Plan

### Phase 1 (Weeks 1-3): Revenue + Security Foundation
- Stripe billing skeleton and subscription state model
- Workspace/membership schema
- Authorization and ownership hardening pass
- Public endpoint protection (rate limit + abuse controls)

### Phase 2 (Weeks 4-7): Core Paid Value
- Public board and submit experience
- Team invites and role management
- Notifications (email + in-app toasts where relevant)
- Request search/filter + duplicate handling v1

### Phase 3 (Weeks 8-12): Launch Readiness
- Entitlement enforcement + plan limits
- Billing/settings UI polish
- Export + audit logs + support surface
- Legal/trust pages
- Conversion analytics and onboarding improvements

## 9) Launch Gate Checklist (Must Be True Before Charging)

- Authorization audit completed and verified for all project-scoped operations.
- Billing tested end-to-end (new subscription, upgrade, cancel, failed payment).
- Plan limits are enforced in backend and clearly shown in UI.
- Public feedback flow is stable and abuse-protected.
- Team collaboration works (invite, role assignment, member removal).
- Critical events generate notifications.
- Error monitoring and alerting are active.
- Legal/trust baseline is published.
- Manual QA pass completed on core journeys.

## 10) Suggested Next Build Order (Highest ROI First)

1. Authorization hardening + workspace model.
2. Stripe subscriptions + entitlements.
3. Public board/submission flow.
4. Team invites and roles.
5. Notifications and onboarding.
6. Export, audit logs, and launch polish.

---

This sequence gives the fastest path from prototype to a trustworthy paid product while keeping engineering risk controlled and conversion potential high.
