# Wish App

Wish App is a product feedback workspace where project owners collect requests and organize them on project boards.

## Language

**Project Owner**:
An authenticated person who creates and manages a Project Board and its Suggestion Portal.
_Avoid_: product owner, developer when referring to ownership

**Project Board**:
A Project Owner-owned workflow board where requests are grouped into ordered statuses.
_Avoid_: board when the project context is unclear, public board

**Suggestion Portal**:
A project-owned page where Requesters browse, search, filter, submit, upvote, comment on, and follow requests in a list-oriented interface after the Project Owner publishes it.
_Avoid_: public board, public roadmap

**Published Suggestion Portal**:
A Suggestion Portal that is publicly accessible to Requesters.
_Avoid_: enabled board, live board

**Unpublished Suggestion Portal**:
A Suggestion Portal that exists for a Project Board but is not accessible to Requesters.
_Avoid_: draft portal, disabled portal

**Requester**:
A person who uses a Suggestion Portal to submit, upvote, comment on, or follow requests.
_Avoid_: user when the role could be confused with a project owner, visitor

**Requester Email**:
An optional email address a Requester provides to receive updates or allow follow-up about their request.
_Avoid_: required account, login email

**Request Subscription**:
A future email-based relationship that will allow a Requester to receive updates about one Public Request after providing a Requester Email.
_Avoid_: follow when no explicit follow action exists in v1

**Requester Identity**:
A browser-scoped identity that associates a Requester's submissions, upvotes, and comments without requiring an account.
_Avoid_: requester account, anonymous user account

**Public Request**:
A Request on a Project Board that is visible to Requesters when its Suggestion Portal is published.
_Avoid_: approved request when no approval step exists

**Request Detail Page**:
A shareable page for one Public Request on a Suggestion Portal where Requesters can read, upvote, and comment on the request.
_Avoid_: request modal when the interaction has its own URL

**Project Slug**:
A stable human-readable URL segment generated from the initial Project Board name and made globally unique for the Suggestion Portal URL.
_Avoid_: editable project URL in v1

**Request Slug**:
A human-readable URL segment generated from a Public Request title and used cosmetically after the request ID.
_Avoid_: request identifier when lookup depends on the request ID

**Similar Suggestion**:
An existing Public Request shown to a Requester during request submission because it may match what they are about to suggest.
_Avoid_: duplicate when the request is only potentially similar

**Top Request**:
A Public Request ranked highly because it has more upvotes than other visible requests on the same Suggestion Portal.
_Avoid_: priority request unless the Project Owner explicitly prioritizes it

**Status**:
A project-owned workflow stage that requests can occupy on a project board, shown in the same order everywhere in the project.
_Avoid_: column, state

**Starter Status**:
One of the initial statuses automatically created for a new project board: Open, Under Review, Planned, In Progress, and Done.
_Avoid_: default status, system status, locked status

**Work Tracker**:
An external system where a Project Owner manages actionable work, such as Linear, GitHub Issues, or ClickUp.
_Avoid_: notification service, export destination, integration when referring to the external system itself

**External Work Item**:
An issue or task created in a Work Tracker from a Request or Complaint and linked back to its source in Wish.
_Avoid_: synchronized request, exported request

**Work Tracker Connection**:
A Project Board's authorized link to one Work Tracker, including the destination used when creating External Work Items.
_Avoid_: global integration, notification connector

## Relationships

- A **Project Owner** creates and manages one or more **Project Boards**
- A **Project Board** must have at least one **Status**
- A **Suggestion Portal** belongs to exactly one **Project Board**
- Every **Project Board** has one **Suggestion Portal**
- A **Suggestion Portal** starts as an **Unpublished Suggestion Portal** and becomes publicly accessible only when the **Project Owner** publishes it
- A **Project Owner** may unpublish a **Published Suggestion Portal** to make it inaccessible to Requesters again
- A **Project Owner** may publish a **Suggestion Portal** after Project Board creation without completing extra setup
- A **Project Slug** is generated when the **Project Board** is created
- A **Published Suggestion Portal** uses `wish.app/p/{projectSlug}` as its MVP URL, where the **Project Slug** is generated from the Project Board name, made globally unique, and not editable in v1
- A **Suggestion Portal** uses the Project Board name for v1 header branding
- `{projectSlug}.wish.app` is reserved as a future direction
- A **Suggestion Portal** presents requests as a searchable and filterable list, not as a workflow board
- Every **Request** on a Project Board becomes a **Public Request** while its **Suggestion Portal** is published
- A new **Request** submitted through a **Published Suggestion Portal** becomes visible immediately
- A new **Request** submitted through a **Published Suggestion Portal** receives an automatic upvote from the submitter's **Requester Identity**
- A **Requester** has a **Requester Identity** when interacting through a **Suggestion Portal**
- A **Requester** may provide a **Requester Email**, but email is not required to submit a request in v1
- A **Requester Email** collected during request submission in v1 may support future **Request Subscriptions**, but v1 does not send request update emails
- A **Requester** interacts with requests through a **Suggestion Portal**
- A **Requester** may comment on a **Public Request** in v1
- A **Requester** may delete their own public comment in v1, but not comments from other Requesters or the Project Owner
- A v1 request submission requires a title and may include an optional description
- A **Suggestion Portal** shows **Similar Suggestions** during request submission, but v1 does not block duplicate requests or merge them
- A **Suggestion Portal** sorts Public Requests by **Top Request** ranking by default in v1
- A **Suggestion Portal** includes always-visible request search in v1
- A **Suggestion Portal** and the Similar Suggestions submit flow should share the same backend search/matching logic in v1
- A **Suggestion Portal** loads request lists with infinite scroll in v1
- A **Suggestion Portal** stores search, filter, and sort state in the URL in v1, but not the infinite-scroll cursor
- A **Suggestion Portal** lets Requesters filter by all requests or by any **Status** on the Project Board in v1
- A **Suggestion Portal** shows an empty state with a request-submission call to action when no requests match the current view
- A **Suggestion Portal** can prefill request submission from the current search text in v1
- Each **Public Request** has a **Request Detail Page** in v1
- A **Request Detail Page** uses the URL shape `wish.app/p/{projectSlug}/r/{requestId}/{requestSlug}` in v1
- A **Request Detail Page** shows the current **Status** only in v1, not status history
- A **Suggestion Portal** shows truncated request descriptions in request lists and full descriptions on Request Detail Pages in v1
- A **Suggestion Portal** shows request creation dates in v1
- A **Suggestion Portal** shows comment counts for requests in v1
- A **Request Slug** is cosmetic; the request ID is the stable lookup identifier
- The first **Status** in a **Project Board** is the starting **Status** for every new **Request** that does not specify a valid **Status**
- A **Starter Status** is created with a new **Project Board** and then treated as a normal **Status**
- A **Status** belongs to exactly one **Project Board**
- Status names are unique within a **Project Board**
- A **Request** belongs to exactly one **Status** on its **Project Board**
- Removing a **Status** that has **Requests** requires moving those **Requests** to another **Status** on the same **Project Board**
- A **Request** or **Complaint** becomes external work only when a **Project Owner** explicitly sends it to a **Work Tracker**
- Creating an **External Work Item** is a one-way action in v1: Wish retains its external identifier and URL but does not synchronize later changes
- A **Request** or **Complaint** may have at most one **External Work Item** in each connected **Work Tracker**
- A **Work Tracker Connection** belongs to exactly one **Project Board** and identifies one destination team, with an optional default project when the Work Tracker supports it
- Sending a **Request** or **Complaint** to a **Work Tracker** creates the **External Work Item** immediately without an intermediate editing step
- After creation, the **Project Owner** is given the **External Work Item** link

## Example dialogue

> **Dev:** "Should the public experience show the same workflow board as the owner dashboard?"
> **Domain expert:** "No — Requesters interact with a Suggestion Portal: a searchable, filterable list of requests. The Project Board is for owner workflow management."

## Flagged ambiguities

- "default status" previously meant a shared locked system status in code, but the resolved term is **Starter Status**: a creation-time seed that becomes an ordinary **Status**.
- "public board" was used for the customer-facing experience, but the resolved term is **Suggestion Portal** because the UI is not a board.
- "product owner" and "developer" were used for the authenticated owner role, but the resolved term is **Project Owner**.
- "public Suggestion Portal" should mean **Published Suggestion Portal**; an unpublished Suggestion Portal exists but is not accessible to Requesters.
- Subdomain portal URLs are desirable later, but the MVP URL is path-based to avoid early routing and DNS complexity.
- Project Slugs are generated from the Project Board name and are not editable in v1 to avoid slug-change redirects.
- Duplicate Project Slugs are resolved by appending a short unique suffix instead of blocking duplicate project names.
- Project Slugs are generated on Project Board creation so the future Suggestion Portal URL can be shown during onboarding.
- Changing the Project Board name after creation does not change the Project Slug in v1.
- Publishing a Suggestion Portal has no v1 setup requirements beyond a valid Project Board with its Starter Statuses.
- The publish action should warn Project Owners that publishing makes all requests on the Project Board visible to anyone with the portal link.
- Unpublishing applies to the entire Suggestion Portal, not to individual requests.
- Request moderation is not part of the MVP: new requests submitted through a Published Suggestion Portal become visible immediately.
- Hidden, pending, rejected, or approval-based request visibility states are intentionally outside v1.
- Publishing a Suggestion Portal exposes all requests on its Project Board in v1.
- Requester Email is optional in v1 to keep submissions low-friction while preserving future follow-up and notification paths.
- Requester Email is stored only when provided during request submission in v1, not for upvotes or comments.
- Project Owners may see Requester Email on request detail in v1 for manual follow-up, and the Suggestion Portal should make that expectation clear.
- Request Subscription is a future capability; v1 may collect Requester Email but does not send request update emails.
- There is no explicit follow button in v1.
- Requester Identity is browser-scoped in v1 and should not be described as an account.
- Public comments are part of v1, but threading, attachments, rich text, and moderation workflows are intentionally excluded.
- Similar Suggestions are a soft duplicate-prevention nudge in v1; duplicate blocking, merging, and AI semantic matching are intentionally excluded.
- Top Request means most-upvoted on the Suggestion Portal, not necessarily highest owner priority.
- A separate owner-side Top Requests view is outside v1; the Project Owner dashboard should stay close to the existing Project Board experience.
- Embeddable widgets, install snippets, and copyable button snippets are outside v1; v1 focuses on the hosted Suggestion Portal.
- A Suggestion Portal may link to an existing public changelog in v1, but request-to-changelog linking is outside v1.
- Suggestion Portal publishing and changelog publishing are separate in v1.
- The hosted Suggestion Portal uses first-party public functions gated by published portal state; project API keys remain for external integrations.
- The hosted Suggestion Portal creates requests through a separate public mutation that checks published portal state, assigns the starting Status, stores optional Requester Email, and auto-upvotes the submitted request.
- Suggestion Portal publication state and Project Slug live on the Project Board record in v1 because each Project Board has exactly one Suggestion Portal.
- The v1 owner dashboard change is limited to publish/unpublish controls and the Suggestion Portal URL in existing project settings.
- Requesters do not authenticate in v1; authentication may be added later for stronger upvote/comment integrity and spam prevention.
- V1 spam prevention is limited to basic rate limiting for request creation, comments, and upvotes; captcha and required email are deferred.
- Requesters cannot edit or delete their submitted requests in v1; Project Owners manage requests from the dashboard.
- Requesters may delete their own client-authored comments in v1; Project Owners manage comments from the dashboard.
- Public comments show role labels in v1, such as Project Owner and Requester, not personal names.
- Requests submitted through the Suggestion Portal are auto-upvoted by the submitting Requester in v1.
- V1 does not distinguish owner upvotes from Requester upvotes; existing owner dashboard upvote behavior may remain unchanged.
- Suggestion Portal search is a primary v1 control, not only part of request submission.
- Portal list search and submit-time Similar Suggestions are separate UI moments backed by shared matching logic.
- Infinite scroll is the v1 list-loading pattern for Suggestion Portal request lists.
- Suggestion Portal search, filter, and sort state should be shareable through URL parameters; scroll cursor state should not.
- Empty Suggestion Portal states should invite Requesters to submit the first matching request.
- Custom portal branding such as logos, colors, and taglines is outside v1.
- Request and comment attachments are outside v1.
- Request categories and tags are outside v1.
- Public status filters use the Project Board's actual Status list in v1; separate public status groups are intentionally deferred.
- Request Detail Pages are part of v1 so requests can be shared and discussed at stable URLs.
- Request Slugs improve shareability but must not be treated as stable identifiers.
- Published Suggestion Portals and Request Detail Pages include basic SEO/share metadata in v1.
- Published Suggestion Portals and Request Detail Pages are noindex by default in v1.
- Unpublished Suggestion Portal URLs return a generic not-found experience to Requesters in v1.
- Request Detail Page URLs return a generic not-found experience when the request does not belong to the referenced Suggestion Portal.
- Status timeline/history is outside v1; public request pages show current Status only.
