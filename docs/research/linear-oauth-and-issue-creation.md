# Linear OAuth and issue-creation research

Research date: 2026-07-12

## Recommendation

Use Linear's OAuth 2.0 authorization-code flow with `actor=app`, the `read` and `issues:create` scopes, and one installation-backed connection per configured Wish project.

`actor=app` is the honest actor model for a project-level connection: issues appear as created by the Wish application instead of permanently impersonating the person who installed it. Linear describes this mode as appropriate for apps and service accounts, and mutations made with the token are attributed to the application. Installing an app actor is workspace-scoped and requires a Linear workspace administrator. This is a real onboarding constraint and must be visible in the UI, not treated as an unexpected authorization failure.

Do not request the broad `write` or `admin` scopes. `read` is always present and is needed to discover the workspace and accessible teams; `issues:create` is the narrow scope for creating issues and their attachments. Wish does not need comments, administrative endpoints, or general mutation access for the agreed first version.

## OAuth installation flow

1. Create a public OAuth application in Linear and register exact callback URLs.
2. From a server-generated endpoint, create a cryptographically random, single-use `state` value tied to the Wish user and project being connected. Persist it with a short expiry.
3. Redirect the user to:

   ```text
   https://linear.app/oauth/authorize
     ?client_id=<client-id>
     &redirect_uri=<registered-callback>
     &response_type=code
     &scope=read,issues:create
     &state=<single-use-state>
     &actor=app
   ```

4. At the callback, reject missing, expired, reused, or mismatched `state` before exchanging the authorization code.
5. Exchange the code server-side with an `application/x-www-form-urlencoded` `POST` to `https://api.linear.app/oauth/token`. Send `code`, the identical `redirect_uri`, `client_id`, `client_secret`, and `grant_type=authorization_code`.
6. Store the returned access token, refresh token, expiry, granted scopes, and discovered Linear workspace identity as secrets. Never send either token to the browser.
7. Query the workspace and accessible teams, let the Project Owner select one team, then persist that team ID and display name on the Wish project connection.

Linear recommends OAuth for third-party applications. Its callback returns both the authorization `code` and the original `state`; Linear explicitly says a mismatched state must not be trusted. PKCE is supported, but it does not remove the need for a server-side client secret in this server-rendered product and is not required for the initial confidential-client implementation. See [OAuth 2.0 authentication](https://linear.app/developers/oauth-2-0-authentication) and [OAuth actor authorization](https://linear.app/developers/oauth-actor-authorization).

Use `prompt=consent` only when the user explicitly chooses to connect another workspace. Linear documents this option as a way to show consent again when previously granted scopes would otherwise skip that choice.

## Token lifecycle and disconnection

Authorization-code exchange returns an access token, refresh token, `expires_in`, token type, and granted scopes. Linear access tokens are valid for 24 hours. Refreshing through the same token endpoint returns both a new access token and a new refresh token, so refresh tokens rotate and replacement must be atomic.

Serialize refreshes per connection. Before an API call, refresh when the access token is near expiry, then atomically replace both tokens and expiry. Linear gives refresh-token consumption a 30-minute grace period specifically so the same refresh request can be replayed after a network failure and return the replacement token. This grace period handles token-refresh uncertainty; it does not make issue creation idempotent.

On explicit disconnect, first attempt an `application/x-www-form-urlencoded` `POST` to `https://api.linear.app/oauth/revoke` using the current refresh token in the `token` field with `token_type_hint=refresh_token`. Then delete all local credentials even if Linear reports that the token was already revoked. Keep previously stored external issue identifiers and URLs as historical links, as already decided.

Linear can also notify configured OAuth applications when an installation is revoked. A later implementation may use the `OAuthApp revoked` webhook to disable the affected connection promptly, but webhooks are not required for one-way creation. See [OAuth 2.0 authentication](https://linear.app/developers/oauth-2-0-authentication) and [Webhooks](https://linear.app/developers/webhooks).

## Workspace and team discovery

Linear's API endpoint is `https://api.linear.app/graphql`, with the access token sent as `Authorization: Bearer <token>`.

After token exchange, request only the identity needed to bind and configure the connection:

```graphql
query ConfigureLinearConnection($first: Int!) {
  organization {
    id
    name
    urlKey
  }
  teams(first: $first) {
    nodes {
      id
      key
      name
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

Paginate teams instead of relying on the default connection size. Store the immutable workspace and team IDs as identities; names, keys, and URL keys are display metadata and can change. An app actor can operate only on teams available to its installation, so the discovery result is also the valid destination list. Linear's official getting-started examples expose the `organization`, `teams`, and single-team queries; the current official schema defines their IDs and pagination. See [GraphQL getting started](https://linear.app/developers/graphql), [Pagination](https://linear.app/developers/pagination), and the [official Linear SDK schema](https://github.com/linear/linear/blob/master/packages/sdk/src/schema.graphql).

If the configured team later becomes inaccessible, fail the send clearly and require reconfiguration. Do not silently choose another team.

## Issue creation contract

Create issues with the `issueCreate` GraphQL mutation. For the agreed first version, send only:

- a caller-generated UUID v4 in `id`;
- the configured Linear `teamId`;
- the original Wish Request or Complaint title;
- a Markdown description containing the original description and a clearly separated canonical Wish source URL.

```graphql
mutation CreateLinearIssue($input: IssueCreateInput!) {
  issueCreate(input: $input) {
    success
    issue {
      id
      identifier
      url
      title
    }
  }
}
```

The current official schema requires `teamId`, accepts Markdown in `description`, permits the caller to supply an issue UUID v4, and returns an issue payload. The created issue exposes an immutable ID, human-readable identifier, and canonical URL. Persist all three; display and open the returned URL. Check both the GraphQL top-level `errors` array and `data.issueCreate.success` before treating the operation as successful, because GraphQL responses can contain partial data with HTTP 200. See [GraphQL getting started](https://linear.app/developers/graphql), [SDK error handling](https://linear.app/developers/sdk-errors), and the [official Linear SDK schema](https://github.com/linear/linear/blob/master/packages/sdk/src/schema.graphql).

Do not set status, project, assignee, labels, priority, requester identity, comments, or votes. Their omission is deliberate: sending to Linear does not change Wish status and does not invent workflow mappings.

## Duplicate prevention and uncertain outcomes

Linear's public documentation does **not** promise idempotency for `issueCreate`, does not document an idempotency-key header, and does not define the result of replaying `issueCreate` with the same caller-supplied UUID. The UUID field is useful for reconciliation, but treating it as a guaranteed idempotency mechanism would be an unsupported assumption.

The safe application contract is therefore:

1. Enforce a unique local record for `(Wish item, provider=linear)` before any network call. This prevents concurrent clicks and guarantees at most one intended Linear destination per Wish item.
2. Generate and persist a Linear UUID v4 before calling the mutation. Mark the local send attempt `pending`.
3. Submit `issueCreate` once with that persisted UUID.
4. On a confirmed success, atomically persist the returned Linear ID, identifier, and URL and mark the attempt `succeeded`.
5. On a definite rejection where Linear could not have committed the mutation (validation, authorization, inaccessible team), mark the attempt `failed` and allow an explicit retry using the same local attempt identity.
6. On timeout, connection reset, 5xx response, malformed response, or any result where commit status is unknown, mark the attempt `unknown`. Do not automatically repeat `issueCreate`.
7. Reconcile by querying `issue(id: <persisted-uuid>)`. If found, persist its ID, identifier, and URL as success. If not found, the absence is only a point-in-time observation; retry the query with bounded backoff before permitting a new mutation. If the issue remains absent, retry creation using the same persisted UUID and reconcile again if the response is uncertain.

This strategy makes blind duplicate creation hard while keeping the unsupported assumption narrow. It still cannot claim mathematical exactly-once delivery without Linear documenting same-ID replay semantics. The implementation should log and surface an unresolved `unknown` state for manual recovery rather than create a second issue with a new UUID.

Linear explicitly documents idempotency for attachment URLs on the same issue, which makes the absence of an equivalent issue-creation guarantee significant. See [Attachments](https://linear.app/developers/attachments) and the [official Linear SDK schema](https://github.com/linear/linear/blob/master/packages/sdk/src/schema.graphql).

## Rate limits and retries

Linear uses leaky-bucket request and complexity limits. OAuth applications currently receive 5,000 requests per user or app user per hour and 2,000,000 complexity points per hour, with a maximum of 10,000 complexity points for one query. Specific queries and mutations can have lower endpoint limits.

Read the request, endpoint, and complexity headers on every response. A rate-limit failure is a GraphQL response with HTTP 400 and an error extension code of `RATELIMITED`. Delay until the applicable reset time with jitter. Rate limiting is a definite rejection only when a valid `RATELIMITED` response identifies the mutation as rejected; a transport failure remains an uncertain outcome and must enter reconciliation instead of a blind retry.

The small discovery and creation queries above are far below the complexity ceiling. Avoid polling after creation; this feature deliberately has no status synchronization. See [Rate limiting](https://linear.app/developers/rate-limiting).

## Decisions enabled by this research

- Authentication: OAuth authorization code, confidential server-side exchange.
- Actor: `actor=app`; connection requires a Linear workspace admin.
- Minimum scopes: `read,issues:create`.
- Destination identity: immutable workspace ID plus one accessible team ID per Wish project.
- Credentials: encrypted server-side access and rotating refresh tokens; never client-visible.
- Creation response: persist Linear ID, identifier, and canonical URL.
- Retry model: local uniqueness, preallocated UUID, explicit `pending`/`unknown` states, query reconciliation, and no blind mutation retries.
- Disconnect: revoke best-effort, always remove credentials, retain historical issue links.
- Webhooks and bidirectional synchronization: unnecessary for the initial one-way handoff.

## Remaining product or implementation decisions

- Where encrypted OAuth credentials live and which backend boundary owns refresh serialization.
- Exact persistence schema and state machine for send attempts.
- How long bounded reconciliation runs before requiring manual recovery.
- Whether Linear app installation access can be edited after setup and how Wish prompts reconfiguration when the selected team disappears.
- Production and preview callback URLs, and ownership of the Linear OAuth application.
