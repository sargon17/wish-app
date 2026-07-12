# GitHub Issues integration delta

Research date: 2026-07-12

## Recommendation

Use a public GitHub App, not an OAuth App, with only **Issues: write** repository permission. Configure one GitHub App installation and one destination repository per Wish Project Board. Create issues as the app installation, not as the Project Owner.

This preserves the locked Linear product contract: explicit one-click handoff, one destination per Project Board, provider-attributed creation, one Handoff per source item and Work Tracker, retained historical links, and no synchronization. GitHub Apps are the narrower and more durable fit: repository access is selected during installation, installation tokens are independent of a person's continued access, permissions are fine-grained, repository-access changes have native webhooks, and rate limits belong to the installation. GitHub itself recommends considering a GitHub App over an OAuth App. See [Differences between GitHub Apps and OAuth apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps), [Choosing permissions for a GitHub App](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app), and [Rate limits for OAuth apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/rate-limits-for-oauth-apps).

## Installation and connection setup

Register Wish as a public GitHub App with:

- repository permission `issues: write`;
- a setup URL returning to Wish;
- **Request user authorization (OAuth) during installation** enabled;
- the default `installation` and `installation_repositories` webhook events; and
- no Contents, Metadata beyond GitHub's implicit minimum, Administration, organization, or account permissions.

The user chooses a personal account or organization and grants either all repositories or selected repositories during GitHub's installation flow. Organization policy may require an organization owner to approve the installation; Wish must present that as a pending approval, not an authentication error. See [Installing a GitHub App from a third party](https://docs.github.com/en/apps/using-github-apps/installing-a-github-app-from-a-third-party).

Wish should generate the same kind of single-use, Project Board-bound setup state already locked for Linear and put it on the GitHub App installation URL. GitHub documents `state` specifically for correlating an installation with a user or account. GitHub's setup callback includes `installation_id`, but GitHub warns that this value can be spoofed. Because Wish must prove that the signed-in Project Owner can use the installation, request GitHub user authorization during installation, exchange the authorization code server-side, then use the short-lived user token to verify the installation and enumerate repositories the user can access through it. Do not retain the user token after setup. See [Sharing your GitHub App](https://docs.github.com/en/apps/sharing-github-apps/sharing-your-github-app), [About the setup URL](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/about-the-setup-url), [Generating a user access token for a GitHub App](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app), and [REST API endpoints for GitHub App installations](https://docs.github.com/en/rest/apps/installations).

After verification, list and paginate repositories accessible to both the installation and user. Let the Project Owner select one repository; preselect it when there is only one. Store immutable `installation_id`, repository numeric `id` and GraphQL `node_id`; store account login and repository `full_name` only as mutable display metadata. The active connection needs no customer OAuth access or refresh token.

Repository selection has two layers:

1. The GitHub account owner controls which repositories the installation may access (`all` or `selected`).
2. The Wish Project Owner chooses one repository from that allowed set as the Project Board destination.

Changing the Wish destination within the currently accessible set needs no reinstall. Adding a repository requires GitHub installation settings/approval. Existing Handoffs never move; only future sends use the newly selected repository. If the chosen repository is removed, archived, deleted, transferred beyond the installation, has Issues disabled, or otherwise becomes inaccessible, show **Fix GitHub connection** and require a new valid destination. Never silently choose another repository. GitHub provides `installation_repositories` events when access is added or removed, and its create endpoint returns `410 Gone` when Issues are disabled. See [Webhook events and payloads](https://docs.github.com/en/webhooks/webhook-events-and-payloads) and [REST API endpoints for issues](https://docs.github.com/en/rest/issues/issues).

## Authentication and secret lifecycle

Wish authenticates as the GitHub App by signing a short-lived RS256 JWT with the app's private key, then exchanges it for an installation access token using `POST /app/installations/{installation_id}/access_tokens`. Mint the token on demand, scope it to the configured repository ID and `issues: write`, and cache it only until shortly before expiry. Installation access tokens expire after one hour. There is no customer refresh token and no reason to persist installation tokens in `workTrackerConnections`. See [Generating a JSON Web Token for a GitHub App](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-json-web-token-jwt-for-a-github-app), [Generating an installation access token](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app), and [REST API endpoints for GitHub Apps](https://docs.github.com/en/rest/apps/apps).

The GitHub App ID/client ID and private key are deployment-wide server secrets, not per-connection credentials. Keep the private key outside the database as a server environment secret for v1 and rotate it without changing connections. GitHub explicitly warns that the private key is the app's highest-value secret and must never be hard-coded. See [Managing private keys for GitHub Apps](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/managing-private-keys-for-github-apps).

Installation suspension immediately prevents access. Installation deletion/uninstall permanently removes access. The mandatory `installation` webhook reports creation, deletion, suspension, and unsuspension; `installation_repositories` reports repository access changes. Handle these webhooks to mark the connection as needing attention promptly, but still treat API `401`, `403`, `404`, and `410` responses as authoritative because webhook delivery is asynchronous. Historical issue IDs and URLs remain after suspension, uninstall, repository removal, or Wish disconnection. See [Suspending a GitHub App installation](https://docs.github.com/en/apps/maintaining-github-apps/suspending-a-github-app-installation) and [Webhook events and payloads](https://docs.github.com/en/webhooks/webhook-events-and-payloads).

Wish disconnection is local: remove the Project Board's binding to the installation/repository after enforcing the existing unresolved-Handoff blocker. Do **not** uninstall the GitHub App, because one installation may serve other Wish Project Boards or unrelated uses. Offer a link to GitHub installation settings if the account owner wants to revoke repository access or uninstall it.

## Issue creation contract

Use REST `POST /repos/{owner}/{repo}/issues` with the current versioned API headers and installation token. Send only:

- `title`: original Request or Complaint title;
- `body`: original description when present, then `---` and the authenticated canonical `[View original in Wish](...)` link.

Do not set assignees, labels, milestone, issue type, or project fields. This exactly matches the locked Linear payload boundary. The endpoint needs **Issues: write**, triggers GitHub notifications, returns `201 Created`, and returns an issue containing numeric `id`, GraphQL `node_id`, repository-local `number`, `html_url`, title, body, and timestamps. Persist `id`, `node_id`, `number`, repository ID, and `html_url`; display/open `html_url`. Repository ID plus issue number is the human identity, while numeric ID/node ID is the durable provider identity. See [REST API endpoints for issues](https://docs.github.com/en/rest/issues/issues) and [Best practices for using the REST API](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api).

## Duplicate prevention and uncertain outcomes

GitHub's create-issue contract documents no idempotency header, caller-supplied issue ID, or replay guarantee. GraphQL's `clientMutationId`, if used, is an echoed correlation value; GitHub does not document it as an idempotency key. Therefore GitHub cannot reuse Linear's preallocated provider UUID mechanism.

The provider-neutral Handoff still owns local uniqueness, `pending`/`succeeded`/`failed`/`unknown`, the 60-second lease, attempt count, safe error fields, and the rule against blind retries. The GitHub adapter must use a different reconciliation key: the canonical Wish owner deep link already embedded in the issue body uniquely identifies the source item in that repository. Persist the destination repository ID and creation start time before the mutation.

On an uncertain outcome (timeout, connection reset, 5xx, malformed response, or contradictory response), do not repeat `POST /issues`. Reconcile with an installation token by listing repository issues in descending creation order, `state=all`, at 100 per page, and compare full bodies for the exact canonical Wish URL. Stop only after passing issues created before the original attempt (with a safety margin for timestamp precision). The issues listing also includes pull requests, so ignore entries containing `pull_request`. If found, persist the returned identity and URL as `succeeded`.

This scan avoids dependence on GitHub Search indexing, but it still cannot prove non-creation when access was removed, the repository disappeared, or GitHub repeatedly fails. Reuse the locked Linear policy: bounded checks, then remain `unknown` with **Check again** and a support reference. Never turn `unknown` into `failed` automatically and never offer **Create again**. This is the only honest no-duplicates behavior without a documented idempotency primitive. The listing fields and pagination behavior are documented by [REST API endpoints for issues](https://docs.github.com/en/rest/issues/issues) and [Using pagination in the REST API](https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api).

Definite pre-creation rejection may become `failed`: validation `422`, Issues disabled `410`, and confirmed authorization/repository-access rejection before the create request can be accepted. Be conservative with `403`: GitHub also uses it for secondary rate limiting, and an ambiguous transport path remains `unknown`. As with Linear, connection failures should lead to **Fix GitHub connection**, not a blind retry.

## Rate limits and retry behavior

Installation REST requests receive at least 5,000 requests per hour per installation on GitHub.com, scale with repositories/users up to 12,500 for non-Enterprise Cloud installations, and receive 15,000 for Enterprise Cloud organization installations. Issue creation can also trigger secondary rate limits because it creates content. GitHub recommends serial requests and at least one second between mutating requests. See [Rate limits for the REST API](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api) and [Best practices for using the REST API](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api).

Read `x-ratelimit-limit`, `x-ratelimit-remaining`, `x-ratelimit-reset`, `x-ratelimit-resource`, and `retry-after`. For a confirmed `403`/`429` rate-limit response, wait for `retry-after`; otherwise wait until `x-ratelimit-reset` when remaining is zero; otherwise wait at least one minute and use bounded exponential backoff for continuing secondary-limit failures. GitHub warns that continuing while limited may ban the integration. A received rate-limit response is a definite rejection; a timeout while sending is still `unknown` and enters reconciliation. See [Troubleshooting the REST API](https://docs.github.com/en/rest/using-the-rest-api/troubleshooting-the-rest-api).

The expected Wish volume is trivial relative to primary limits. Do not add a general queue or rate-limit subsystem in v1; serialize per installation/Handoff, respect returned headers, and schedule the existing bounded reconciliation checks.

## Shared surface versus GitHub-specific adapter

### Shared with Linear

- Project Board-scoped Work Tracker connection and one configured destination.
- Unified Connect, Send, Open, Checking, Retry, Fix connection, and Disconnect UI states.
- Original title/body plus canonical authenticated Wish link.
- One Handoff per `(source item, provider)` for the source lifetime.
- Provider-neutral Handoff lifecycle, lease, local uniqueness, sanitized errors, support reference, bounded reconciliation, deletion/disconnection blockers, and retained historical links.
- Connection replacement remains atomic; destination changes affect only future sends.
- Provider operations behind one Wish-facing boundary: begin/finish setup, list/select destinations, validate/disconnect connection, create item, and reconcile uncertain creation.

### GitHub-specific

- GitHub App installation plus repository selection, instead of Linear OAuth workspace plus team.
- Temporary user authorization only to validate setup; no retained customer OAuth credentials.
- Deployment-wide App private key/JWT and on-demand one-hour installation tokens.
- `installation` and `installation_repositories` webhook handling.
- Repository access/installation status and `issues: write` permission checks.
- REST issue payload and returned repository ID/issue number/node ID fields.
- Reconciliation by scanning recent repository issue bodies for the canonical Wish URL; GitHub has no caller-supplied issue UUID.
- Local disconnect must not uninstall a potentially shared GitHub App installation.

Do not encode these differences as provider conditionals throughout Convex or UI code. The provider-neutral surface should route to small Linear and GitHub adapters, while provider-specific setup data and external identity fields remain opaque payloads owned by each adapter. Do not build a provider registry, plugin system, or capability negotiation for two providers.

## Decisions enabled by this research

- Authentication: GitHub App installation token, not OAuth App or retained user token.
- Minimum permission: repository **Issues: write** only.
- Installation verification: single-use Wish state plus temporary GitHub user authorization; never trust callback `installation_id` alone.
- Destination: one immutable repository ID per Project Board connection; account/repository names are display metadata.
- Secrets: one deployment-wide GitHub App private key; no per-connection token ciphertext.
- Creation response: persist repository ID, issue ID, node ID, number, and canonical HTML URL.
- Recovery: provider-neutral Handoff semantics, GitHub-specific canonical-link scan, and no blind mutation retry.
- Lifecycle: react to installation/repository webhooks, retain links, and never uninstall on a local disconnect.
- Synchronization: issue-state, comment, label, assignee, and project synchronization remain out of scope.

## Remaining decisions for the provider-boundary ticket

- Exact opaque connection and external-identity field shape that lets both providers share the existing three-table limit without weak untyped blobs spreading beyond adapters.
- Whether one GitHub installation may be referenced by multiple Project Board connection records and how webhook fan-out finds them efficiently.
- Exact setup URL/callback route choreography for a flow that combines GitHub App installation and temporary user authorization.
- Whether GitHub's canonical-link reconciliation scan needs a small adapter-specific cursor/checkpoint for very high-volume repositories; do not add one until a measured repository makes the bounded scan insufficient.
