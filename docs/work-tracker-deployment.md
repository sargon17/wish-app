# Work Tracker deployment

## Linear

Linear stays disabled in Project Settings until all five Convex configuration variables exist:

- `LINEAR_CLIENT_ID`
- `LINEAR_CLIENT_SECRET`
- `LINEAR_REDIRECT_URI`
- `WORK_TRACKER_ENCRYPTION_KEY`
- `WISH_APP_BASE_URL`

Linear issue creation has a separate emergency brake:

- `LINEAR_HANDOFF_CREATION_ENABLED`

Set `LINEAR_REDIRECT_URI` to the fixed HTTPS callback registered in Linear:

```text
https://<convex-http-host>/work-trackers/linear/callback
```

Set `WISH_APP_BASE_URL` to the fixed HTTPS origin that owns the dashboard redirects. Localhost HTTP
is accepted for development only. Generate the encryption key as 32 random bytes encoded as base64:

```bash
openssl rand -base64 32
```

After setting the variables, deploy Convex and verify the Work Trackers settings card reports Linear
as available. Set `LINEAR_HANDOFF_CREATION_ENABLED=true` only when issue creation is ready for
Project Owners. Set it to `false` to stop new and failed-retry creations without disabling connection
management, existing external links, or reconciliation of uncertain outcomes.

## GitHub Issues

GitHub stays disabled until all six GitHub App configuration variables exist:

- `GITHUB_APP_CLIENT_ID`
- `GITHUB_APP_CLIENT_SECRET`
- `GITHUB_APP_SLUG`
- `GITHUB_APP_PRIVATE_KEY`
- `GITHUB_APP_REDIRECT_URI`
- `GITHUB_APP_WEBHOOK_SECRET`

`WISH_APP_BASE_URL` and `WORK_TRACKER_ENCRYPTION_KEY` are shared with Linear and are also required.
The encryption key protects temporary GitHub credentials only while authorization cleanup must be
retried.

GitHub issue creation has a separate emergency brake:

- `GITHUB_HANDOFF_CREATION_ENABLED`

Create a public GitHub App with these settings:

- Request user authorization during installation: enabled
- User-to-server token expiration: enabled
- Callback URL: `https://<convex-http-host>/work-trackers/github/callback`
- Webhook URL: `https://<convex-http-host>/work-trackers/github/webhook`
- Repository permission: Issues — read and write
- Subscribe to events: Installation and Installation repositories

The app must be public so Project Owners can install it on organizations outside the app owner's
account. Store the OAuth client ID and secret, URL slug, and webhook secret in Convex. GitHub
downloads private keys in PKCS#1 format; convert the key to the PKCS#8 format used by
the runtime before storing it:

```bash
openssl pkcs8 -topk8 -nocrypt -in github-app.pem -out github-app-pkcs8.pem
```

Set `GITHUB_APP_PRIVATE_KEY` to the converted file contents. It may contain literal newlines or
escaped `\\n` sequences. Generate a webhook secret with at least 32 random characters, for example:

```bash
openssl rand -hex 32
```

The setup flow verifies that the authenticated GitHub user can access the callback's installation,
then immediately deletes the temporary user authorization grant. The access and refresh tokens are
stored only as one encrypted cleanup record until GitHub accepts revocation. If grant deletion
fails, cleanup submits both tokens to GitHub's credential revocation endpoint without depending on
the GitHub App client credentials. Runtime repository discovery uses short-lived installation tokens.
Disconnecting GitHub in Wish removes only the local connection; it does not uninstall the GitHub
App. Set `GITHUB_HANDOFF_CREATION_ENABLED=true` only after issue creation is ready for Project
Owners. Set it to `false` to stop new and failed-retry creations without disabling connection
management, existing issue links, or reconciliation of uncertain outcomes.
