# Use path-based Suggestion Portal URLs for MVP

We will use `wish.app/p/{projectSlug}` as the MVP URL shape for Published Suggestion Portals, where the project slug is generated from the Project Board name and is not editable in v1. This keeps the URL human-readable while avoiding early slug-change redirects and wildcard DNS/subdomain operational complexity; `{projectSlug}.wish.app` remains a future product direction because it feels more branded and premium.
