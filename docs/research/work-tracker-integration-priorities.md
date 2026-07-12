# Work Tracker integration priorities

Research date: 2026-07-12

## Recommendation

After Linear and GitHub Issues, build integrations in this order:

1. **Jira Cloud** — build next. It is the strongest remaining match for software and product teams, and Atlassian says more than 300,000 companies use Jira. The integration is more expensive than Linear or GitHub, but the customer relevance justifies it.
2. **ClickUp** — build after Jira. It has strong startup and cross-functional product-team reach, ClickUp claims 3 million teams, and its one-way task API fits Wish without inventing synchronization.
3. **Asana** — validate demand, then build before enterprise-only trackers. It is less software-specific, but it has broad product-operations adoption, more than 169,000 paying customers as of January 2025, normal OAuth, and unusually good app-specific external IDs for recovery.
4. **Azure DevOps Boards** — demand-gated. It is a good semantic fit for software teams, but Microsoft Entra onboarding, organization/project/process discovery, and enterprise administration make it substantially more expensive to ship and support.
5. **YouTrack** — defer until customers ask for it. Product fit is good; distribution is not. Every YouTrack installation can have a different base URL and requires an administrator to configure and trust an OAuth client.
6. **Trello** — skip. A card maps cleanly to a Wish Handoff, but Trello's current card-creation REST endpoint explicitly says OAuth 2 apps cannot use it. The supported API-key/token authorization is too broad and dated for a new customer-facing integration, and Trello is a weaker issue-tracker fit than every option above.

Do not build all six. Build Jira Cloud and ClickUp, instrument connection requests, and let actual demand choose between Asana and Azure DevOps Boards. Raw vendor size is not enough reason to carry another OAuth implementation and recovery adapter forever.

## Decision table

| Priority | Tracker | Product fit for Wish | Public authorization | Destination | Recovery quality | Relative cost | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Jira Cloud | Excellent | OAuth 2.0 3LO | Site + project + issue type | Recent-issue scan with exact property/link comparison; no documented create idempotency | High | Build next |
| 2 | ClickUp | Strong | OAuth authorization code | Workspace + List | Recent-task scan by canonical Wish link; no documented create idempotency | Medium | Build second |
| 3 | Asana | Good | OAuth authorization code | Workspace + project | Best of this group: app-specific external GID lookup | Medium | Validate, then build |
| 4 | Azure DevOps Boards | Strong, enterprise-heavy | Microsoft Entra OAuth | Organization + project + work-item type | Recent-work-item query by canonical Wish link; no documented create idempotency | Very high | Demand-gated |
| 5 | YouTrack | Strong, niche | Per-installation OAuth client | Instance + project | Issue search by canonical Wish link; no documented create idempotency | High support cost | Defer |
| 6 | Trello | Weak-to-moderate | Legacy API key + member token for card API | Board + List | Card scan by canonical Wish link; no documented create idempotency | Medium, with security debt | Skip |

“Recovery quality” measures how well a provider can reconcile the locked `unknown` Handoff state. It does **not** weaken the provider-neutral rule: uncertain creation is never blindly retried and never automatically becomes `failed`.

## Contract used for comparison

Every candidate was tested against the contracts already established in [Linear OAuth and issue-creation research](./linear-oauth-and-issue-creation.md) and [GitHub Issues integration delta](./github-issues-integration-delta.md):

- one explicit send from a Wish Request or Complaint;
- one configured destination per Wish Project Board;
- original title, optional description, and canonical authenticated Wish link only;
- one durable Handoff per source item and provider;
- `pending`, `succeeded`, `failed`, and `unknown` lifecycle states;
- no blind retry after an uncertain create result;
- retained external identity and URL, with no status or comment synchronization; and
- provider-specific authentication, destination discovery, creation, and reconciliation hidden behind the shared Wish surface.

None of the six create APIs documents a general idempotency header or replay guarantee. Asana is the useful exception in recovery—not documented exactly-once creation—because an OAuth app can assign app-specific external metadata and later address a task by that external GID.

## 1. Jira Cloud — build next

### Why it earns the slot

Jira is the most obvious missing tracker for Wish's software/product audience. Atlassian says [more than 300,000 companies rely on Jira](https://www.atlassian.com/software/jira/guides/getting-started/who-uses-jira), and explicitly positions it for software development, product management, agile, DevOps, bug tracking, and requirements. That is materially better evidence of fit than a generic work-management user count.

Use a public OAuth 2.0 3LO integration, not API tokens and not a customer-created app. Atlassian requires external integrations to use its developer-console 3LO flow and says apps that collect API tokens or make customers create individual 3LO apps violate its cloud-app requirements. Request offline access so Wish receives rotating refresh tokens. Discover authorized sites through `accessible-resources`, then select one Jira project and one issue type. See [OAuth 2.0 3LO apps](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/) and [Jira OAuth scopes](https://developer.atlassian.com/cloud/jira/platform/scopes-for-oauth-2-3LO-and-forge-apps/).

Creation uses `POST /rest/api/3/issue`. The minimum payload still requires project, issue type, and summary; description must be Atlassian Document Format rather than Markdown. Creation is also governed by the user's Browse Projects and Create Issues permissions. The configurable issue-type and field model means setup must inspect create metadata instead of assuming “Task” or “Bug” exists everywhere. See [Jira issue operations](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/).

For an uncertain outcome, persist the Jira site, project, issue type, Handoff identity, and start time before sending. Put the exact canonical Wish URL in the description and, where the create contract accepts it, an app-owned issue property. Reconcile by bounded recent-issue search and exact canonical-link/property comparison. Jira exposes issue properties, but its public create documentation does not promise that replaying a create request is idempotent, so a missing search result never proves non-creation. See [Jira issue properties](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-properties/).

Maintenance cost is high but bounded: rotating refresh tokens, multiple sites, project permissions, issue types, Atlassian Document Format, configurable required fields, and three concurrent rate-limit systems. Jira's current limits use hourly points, per-endpoint bursts, and per-issue write limits; all return `429` with retry headers. Wish's low one-click volume is not a capacity problem, but the adapter must honor those responses. See [Jira rate limiting](https://developer.atlassian.com/cloud/jira/platform/rate-limiting/).

**Decision:** implement after GitHub Issues. Keep v1 to one site, project, and issue type per Project Board. Do not add field mapping, Jira status mapping, components, labels, assignees, or Jira Product Discovery.

## 2. ClickUp — build after Jira

### Why it earns the slot

ClickUp is less specifically an engineering issue tracker than Jira, but it is a credible match for startup and cross-functional product teams. ClickUp's official teams page says [3 million teams use the product](https://clickup.com/teams) and explicitly targets startups as well as enterprises.

ClickUp provides a standard authorization-code flow for public integrations. Users can authorize one or more Workspaces, and the resulting access token currently does not expire. ClickUp does not document refresh-token rotation or granular scopes; the user chooses authorized Workspaces instead. That simplifies token handling but gives Wish a broader, longer-lived credential than the Linear contract. See [ClickUp authentication](https://developer.clickup.com/docs/authentication).

The real setup cost is hierarchy. A task must be created in a List, so destination discovery walks Workspace → Space → optional Folder → List. Store immutable IDs and treat names as display data. One List per Wish Project Board is enough; do not expose ClickUp's status, priority, assignees, custom fields, or custom task types in v1.

Creation is a single `POST /api/v2/list/{list_id}/task` with `name` and `markdown_content`. The task response provides the provider identity and URL. The API has no documented idempotency key or caller-supplied task identity. On uncertainty, query recent tasks for the configured Workspace/List and compare the exact canonical Wish URL in Markdown; if access or transport prevents proof, leave the Handoff `unknown`. See [Create Task](https://developer.clickup.com/reference/createtask) and [Get Filtered Team Tasks](https://developer.clickup.com/reference/getfilteredteamtasks).

Rate limits are simple and token-based: ClickUp documents 100 requests per minute for Free, Unlimited, and Business Workspaces, 1,000 for Business Plus, and 10,000 for Enterprise, returning `429` and reset headers. Wish's one-click volume is trivial. See [ClickUp rate limits](https://developer.clickup.com/docs/rate-limits).

**Decision:** implement after Jira. The main risk is credential breadth, not API complexity. Re-evaluate if ClickUp introduces expiring/rotating OAuth tokens or granular scopes before implementation.

## 3. Asana — validate demand, then build

### Why it ranks above Azure Boards

Asana is broad work management rather than a developer issue tracker, so its raw customer count must not push it ahead of Jira or ClickUp. It is still relevant to product operations and cross-functional product teams. Asana's fiscal-2025 filing reports [more than 169,000 paying customers globally](https://investors.asana.com/node/10786/html), across technology and many non-technical industries.

Its integration mechanics are unusually clean. Asana supports OAuth authorization code, one-hour access tokens, refresh tokens, revocation, and granular scopes. A minimal Wish connection needs task read/write plus enough workspace/project read access to select one project. See [Asana OAuth](https://developers.asana.com/docs/oauth).

Creation is `POST /tasks`, scoped to a workspace and normally one selected project. It accepts the task name and notes and returns a global task GID; `permalink_url` is the canonical external link. See [Create a task](https://developers.asana.com/reference/createtask) and the [Task resource](https://developers.asana.com/reference/tasks).

Asana's strongest differentiator is custom external data. An OAuth app can store its own external GID on a task and later reference that task as `external:<custom_gid>`. Use the immutable Wish Handoff ID as that value. This gives reconciliation a direct provider-supported lookup instead of scanning descriptions. It does not document mutation replay as idempotent, so Wish must still use `unknown` and bounded lookup after transport ambiguity; it simply makes that lookup cheaper and more reliable. See [Custom external data](https://developers.asana.com/docs/custom-external-data).

Asana documents 150 requests per minute for free domains and 1,500 for paid domains, plus concurrent-write limits, all surfaced as `429` with `Retry-After`. Its full-text search is eventually consistent and premium-only, but Wish does not need it because external GID lookup is better. See [Asana rate limits](https://developers.asana.com/docs/rate-limits) and [task search consistency](https://developers.asana.com/reference/searchtasksforworkspace).

**Decision:** do not build speculatively, but put it ahead of Azure DevOps once real users request it. Its lower product specificity is offset by broad product-team use and the best recovery primitive in this group.

## 4. Azure DevOps Boards — demand-gated enterprise integration

### Why it is not third despite strong semantic fit

Azure Boards is a real software work tracker, not generic task management. Microsoft describes Azure DevOps roles around tracking issues, features, code, tests, builds, agile planning, and DevOps. That makes the product fit strong. See [software-development roles in Azure DevOps](https://learn.microsoft.com/en-us/azure/devops/user-guide/roles?view=azure-devops).

The cost is platform and enterprise identity complexity. New integrations must use Microsoft Entra ID OAuth; Microsoft's legacy Azure DevOps OAuth stopped accepting new registrations in April 2025 and is scheduled for removal in 2026. Entra brings tenant consent, conditional-access policy, multi-tenant app configuration, user-bound delegated access, and organization membership into setup and support. See [Azure DevOps OAuth deprecation](https://learn.microsoft.com/en-us/azure/devops/integrate/get-started/authentication/azure-devops-oauth?view=azure-devops) and [Microsoft Entra authentication for Azure DevOps](https://learn.microsoft.com/en-us/azure/devops/integrate/get-started/authentication/entra?view=azure-devops).

Destination configuration requires organization, project, and work-item type. Processes vary: “Task,” “Bug,” “Product Backlog Item,” and “User Story” are not interchangeable or universally available, and project rules can add required fields. Creation uses JSON Patch at `POST https://dev.azure.com/{organization}/{project}/_apis/wit/workitems/${type}`. Store returned work-item ID and HTML relation. See [Create Work Item](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/create?view=azure-devops-rest-7.1) and the [Work Item Tracking API](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/?view=azure-devops-rest-7.1).

The create API documents validation but no idempotency key or caller-supplied work-item ID. Put the canonical Wish URL into `System.Description`, persist the organization/project/type and attempt time, then reconcile through bounded work-item queries and exact link comparison. Ambiguity remains `unknown`.

Azure DevOps throttling is consumption-based rather than a simple per-minute quota. Microsoft documents a 200-TSTU sliding five-minute user limit, possible server-side request delays, `429`, and standard rate headers. One-way Wish volume is tiny; the complexity is correct client behavior and enterprise support, not capacity. See [Azure DevOps rate and usage limits](https://learn.microsoft.com/en-us/azure/devops/integrate/concepts/rate-limits?view=azure-devops).

**Decision:** build only after named customer demand or an enterprise sales requirement. Do not mistake the size of the Microsoft ecosystem for evidence that Wish's current users need Azure Boards.

## 5. YouTrack — defer

### Why product fit is not enough

YouTrack is aimed directly at software teams and its API can create a clean issue using only `summary`, `description`, and a project ID. The result can include the immutable database ID and human-readable issue ID. It therefore fits the Handoff payload better than several higher-ranked products. See [YouTrack Issues API](https://www.jetbrains.com/help/youtrack/devportal/resource-api-issues.html).

Distribution is the blocker. YouTrack supports both Cloud and self-hosted Server instances, each with its own base URL. Starting with YouTrack 2026.2, an administrator can create and trust OAuth clients and register redirect URIs, but that is per installation; there is no evidence in the official documentation of a single globally distributable OAuth application comparable to Linear, Jira, ClickUp, or Asana. JetBrains still recommends permanent tokens for server-side REST integrations, which Wish should not ask customers to paste. See [YouTrack OAuth authorization](https://www.jetbrains.com/help/youtrack/devportal/OAuth-authorization-in-youtrack.html), [REST API URLs](https://www.jetbrains.com/help/youtrack/devportal/api-url-and-endpoints.html), and [YouTrack login guidance](https://www.jetbrains.com/help/youtrack/devportal/api-log-in-to-youtrack.html).

The create API documents no idempotency key. Reconciliation can search the selected project for the exact canonical Wish link and then retain the returned `id`/`idReadable`, but every deployment can differ in version, workflows, permissions, and network reachability. YouTrack's free plan supports up to ten users and both Cloud and Server remain active products, but JetBrains publishes no current adoption figure in the reviewed official materials that justifies this support burden. See [YouTrack pricing](https://www.jetbrains.com/youtrack/buy/).

**Decision:** defer until multiple users request it. If built, support YouTrack Cloud first; self-hosted instances need a separate security and network-access decision.

## 6. Trello — skip

### Why the simple data model is misleading

A Trello Card is technically easy to map: one Board/List destination, card name, description, returned ID, and card URL. Trello also has generous key/token rate limits for Wish's workload. See [Trello cards](https://developer.atlassian.com/cloud/trello/rest/api-group-cards/) and [Trello rate limits](https://developer.atlassian.com/cloud/trello/guides/rest-api/rate-limits/).

The authorization story disqualifies it. The current `POST /cards` documentation explicitly states that Forge and OAuth 2 apps cannot access the resource. Card creation uses a Trello API key plus member API token; the authorization flow can issue tokens with `never` expiration, and the token can read/write the user's Trello account according to the granted scope. See [Trello API introduction](https://developer.atlassian.com/cloud/trello/guides/rest-api/api-introduction/) and [Trello authorization](https://developer.atlassian.com/cloud/trello/guides/rest-api/authorization/).

That would force Wish to implement and defend a legacy credential model for a tracker with weaker software/product issue-management fit than Jira, ClickUp, Azure Boards, or YouTrack. The create endpoint also documents no idempotency key, leaving reconciliation as a recent-card scan by canonical Wish link.

**Decision:** skip. Reconsider only if Atlassian makes card creation available to a modern OAuth 2 integration and customer demand is visible.

## Consequences for the shared provider boundary

The provider-neutral boundary should remain small. This research supports the operations already implied by Linear and GitHub:

- begin and finish provider setup;
- list and select destinations;
- validate or disconnect a connection;
- create one external item from the canonical payload;
- reconcile one uncertain Handoff; and
- render provider-owned destination and external-identity display data.

Do not standardize provider internals that are not actually shared:

- Jira needs site/project/issue-type metadata and Atlassian Document Format.
- ClickUp needs Workspace hierarchy and a List.
- Asana should own its external GID recovery key.
- Azure Boards needs organization/project/process/work-item-type metadata and JSON Patch.
- YouTrack needs an instance base URL and installation-specific OAuth configuration.
- Trello should have no adapter while its supported authorization remains unacceptable.

The generic Handoff should store an opaque provider recovery payload behind the adapter boundary, not a universal `providerUuid`. Linear can use a caller-supplied UUID, GitHub and ClickUp can use canonical-link scans, and Asana can use its app-specific external GID. The shared guarantee is conservative recovery, not a shared recovery mechanism.

## Concrete roadmap

1. Finish and ship Linear.
2. Implement the already-researched GitHub Issues adapter.
3. Implement Jira Cloud with one site/project/issue type and no field mapping.
4. Implement ClickUp with one Workspace/List and no custom-field mapping.
5. Add an in-product “Request another Work Tracker” signal before writing Asana or Azure code.
6. Choose Asana when product/startup-team demand leads; choose Azure Boards when enterprise software-team demand leads.
7. Keep YouTrack deferred and Trello out of scope until their blocking conditions change.
