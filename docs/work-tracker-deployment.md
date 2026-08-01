# Work Tracker deployment

Linear OAuth stays disabled in Project Settings until all five Convex deployment variables exist:

- `LINEAR_CLIENT_ID`
- `LINEAR_CLIENT_SECRET`
- `LINEAR_REDIRECT_URI`
- `WORK_TRACKER_ENCRYPTION_KEY`
- `WISH_APP_BASE_URL`

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
as available before enabling the flow for Project Owners.
