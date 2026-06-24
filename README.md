# Wish App

Wish App is a lightweight feature-suggestion product for small SaaS teams and product builders.

The product connects users with developers through a public feedback loop: users suggest, vote, discuss, and follow feature requests; product owners use that signal to decide what to build next and communicate what shipped.

## Current product thesis

The MVP should not be just a private dashboard for managing requests.

The stronger thesis is:

> A public feature-suggestion loop that helps small product teams know what users want, talk to them, and prove they shipped it.

In practice, each project should get its own public suggestion board, for example:

```txt
wish.app/acme
acme.wish.app
```

That board becomes the place where a product's users can:

- Submit feature suggestions
- Search existing suggestions before submitting duplicates
- Upvote suggestions they care about
- Comment with extra context
- See request status: Open, Under Review, Planned, In Progress, Done
- Follow updates when a suggestion changes status or ships
- Read the public changelog

Product owners should be able to:

- Create and manage project boards
- Customize statuses
- Review incoming requests
- Ask follow-up questions
- Move requests through the workflow
- Prioritize by user demand
- Publish changelog updates
- Share or embed the public board/widget

## Positioning direction

Working positioning:

> Wish is a lightweight feature suggestion board for small SaaS teams. Add a public board or widget, let users suggest and vote, then ship with confidence.

Possible wedge:

- Small SaaS teams
- Indie hackers
- Product-led apps
- Developer tools
- Early-stage startups

The product should avoid competing head-on with heavy enterprise tools like Productboard too early. The opportunity is to be simpler, faster, and more public/customer-facing.

## MVP product loop

The core MVP loop should be:

1. Product owner creates a project.
2. Wish creates a public suggestion board for that project.
3. Owner shares the board link or embeds a widget in their app.
4. Users submit suggestions or upvote existing ones.
5. Owner reviews and prioritizes the strongest requests.
6. Owner asks follow-up questions when needed.
7. Owner moves requests through statuses.
8. Users can see progress.
9. Owner publishes changelog entries when work ships.
10. Interested users are notified.

If this loop works, the MVP has real value.

## What exists today

Current foundations already present in the repository:

- Project boards
- Request statuses
- Request creation/editing
- Request upvotes
- Request comments
- API keys
- Public API endpoints
- Owner dashboard
- Changelog entries
- Waitlist
- Stats page

These are strong internal foundations, but the customer-facing experience needs to become clearer and more complete.

## Highest-priority missing pieces

### 1. Public project board

A hosted public board is probably the most important missing MVP feature.

Minimum public board features:

- Public project landing page
- Request list
- Request detail page
- Submit request form
- Search/filter requests
- Upvote request
- Comment on request
- Show request status
- Link to public changelog

Open questions:

- Should public board URLs use `wish.app/project-slug`, `project.wish.app`, or both?
- Should projects have editable public slugs?
- Should public boards be enabled by default or explicitly published?
- Should owners be able to make boards private?
- Should public boards be indexed by search engines?
- Should there be a global directory of public boards later, or never?

### 2. Embeddable widget

A widget may be the best distribution mechanism because product teams can put Wish directly inside their app.

Possible widget modes:

- Floating feedback button
- Inline request list
- Modal submit form
- Full embedded board
- Changelog widget

Open questions:

- Is the widget MVP, or should the hosted public board come first?
- Should the widget require an API key or only a public project ID?
- How should the widget identify users?
- Should the widget be a script snippet, React package, iframe, or all later?
- How much customization should owners have: colors, logo, copy, default view?

### 3. Duplicate detection before submit

Feature suggestion products get noisy quickly. The MVP should help users find existing suggestions before creating duplicates.

Minimum version:

- User types a title
- App searches similar existing requests
- User can upvote/comment on an existing request instead of creating a new one
- User can still submit a new request if none match

Open questions:

- Is basic text search enough for MVP?
- Should AI-powered semantic matching come later?
- Should duplicate suggestions appear while typing or after clicking submit?
- Should owners be able to merge duplicate requests?
- What happens to upvotes/comments when requests are merged?

### 4. User identity and ownership

The current public model can use a client ID, but the product needs a clearer user identity strategy.

Possible approaches:

1. Anonymous/browser-based identity
   - Lowest friction
   - Uses generated `clientId`
   - Good for quick upvotes and comments

2. Optional email identity
   - Still low friction
   - Enables notifications
   - Better for follow-up and marketing

3. Full account-based identity
   - More powerful
   - More friction
   - Probably not MVP

Recommended MVP direction:

> Use browser-based `clientId` behind the scenes, with optional email capture for notifications.

Open questions:

- Should email be required to submit a request?
- Should email be required to comment?
- Should email be required to follow a request?
- How do users manage/unsubscribe from notifications?
- Can users edit/delete their own requests?
- How long should anonymous ownership persist?
- Should owners see requester emails?

### 5. Notifications and closing the loop

The product becomes much more valuable when users know their feedback was heard.

Possible notification events:

- Request received
- New comment from owner/developer
- Status changed
- Request marked as Done
- Related changelog entry published

Open questions:

- Should notifications be email-only for MVP?
- Should users explicitly follow requests, or auto-follow requests they create/upvote/comment on?
- Should owners be able to send a custom message when changing status?
- Should changelog publishing notify all interested users?
- What email provider should be used?
- What templates are needed?

### 6. Prioritization for owners

Upvotes are useful, but owners need a clear way to decide what to build next.

MVP prioritization signals:

- Upvote count
- Comment count
- Recent activity
- Created date
- Status
- Number of unique requesters
- Manual owner priority: Low, Medium, High

Possible owner views:

- Top requests
- New requests
- Recently active
- Needs response
- Planned
- Shipped

Open questions:

- Is manual priority needed in the MVP?
- Should owners be able to hide/archive requests?
- Should request lists be sorted by upvotes by default?
- Should owners be able to pin requests?
- Should there be an effort/impact score later?
- Should paid customer weighting exist later?

### 7. Changelog connection

Changelog already exists, but it should eventually connect directly to shipped requests.

Possible flow:

- Owner marks one or more requests as Done
- Owner creates a changelog entry from those requests
- Changelog entry links back to the requests
- Users who followed/upvoted/commented are notified

Open questions:

- Should changelog entries be linked to requests in the database?
- Can one changelog entry include multiple requests?
- Can one request appear in multiple changelog entries?
- Should publishing a changelog automatically update request status?
- Should public board show shipped requests separately?

### 8. Owner onboarding

Activation should guide owners to the first useful outcome: sharing a board and receiving feedback.

Possible setup checklist:

1. Create project
2. Customize statuses
3. Copy public board link
4. Install widget or share portal
5. Submit a test request
6. Publish first changelog update

Open questions:

- What is the first-run experience after signup?
- Should every new project get starter data/example requests?
- Should demo content be removable?
- Should the dashboard show an empty state with next steps?
- Should owners be prompted to install the widget or share the link first?

## Things to avoid before MVP

Do not prioritize these until the core loop works:

- Billing
- Complex team permissions
- Enterprise roles
- SSO
- Jira/Linear/Slack integrations
- Advanced AI prioritization
- Complex customer segmentation
- Public global discovery marketplace
- Roadmap timelines
- Heavy analytics
- Multi-workspace organization logic

These may be valuable later, but they are not necessary to prove the product.

## Suggested build order

### Phase 1: Complete the public feedback loop

- Public project board
- Public request detail page
- Submit request from public board
- Upvote/comment from public board
- Search existing suggestions
- Optional email capture

### Phase 2: Help owners act on signal

- Top requests view
- Better request detail/triage experience
- Owner reply UX
- Manual priority or pinning
- Setup checklist

### Phase 3: Close the loop

- Request follow/notification system
- Status-change emails
- Changelog connected to shipped requests
- Public changelog surfaced on project board

### Phase 4: Distribution

- Embeddable widget
- Integration docs
- Demo board
- Landing page rewrite
- Early-access onboarding

## Product questions to revisit

- Who is the exact ICP for the first version?
- Is the primary buyer an indie founder, product manager, developer, or support lead?
- Should Wish be API-first, widget-first, or hosted-board-first?
- What makes Wish meaningfully different from Canny, Featurebase, Nolt, Frill, UserVoice, and Productboard?
- Is the strongest promise prioritization, customer engagement, or changelog/closing-the-loop?
- Should the product be branded around “feature suggestions,” “feedback boards,” “wishlists,” or “roadmaps”?
- Should public boards feel community-like or simple/form-like?
- How much anonymity should users have?
- Should owners moderate/approve requests before they appear publicly?
- Should comments require moderation?
- How should spam be prevented?
- Should there be rate limiting per IP/client ID/email?
- Should public requests support attachments/screenshots?
- Should requests have categories/tags?
- Should users be able to subscribe to an entire project?
- Should project owners invite teammates before MVP?
- Should there be a demo project available from the homepage?
- What is the minimum activation event: project created, board shared, first request received, or first request shipped?

## Tech Stack

### Backend

- Convex

### Auth

- Clerk

### Frontend

- TanStack Start
- React
- Vite
- Astro
- Tailwind
- shadcn/ui

### Tooling

- Vite+

## Remaining TODO

- [ ] Request follow/notification system
- [ ] Link changelog entries to shipped requests
- [ ] Embeddable widget
- [ ] Setup checklist for new project owners
- [ ] Moderation controls for public requests and comments
- [ ] Stronger spam protection beyond requester-identity rate limits
