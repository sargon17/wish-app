# Documentation Structure (Draft)

This document outlines the planned structure for the public API documentation section.

## Docs Index (/docs)

- Overview of the Wish API
- Quick links to each guide
- Integration checklist

## Pages

1. Overview (/docs/overview)
   - What the API provides
   - Base URL placeholder
   - Authentication and identity model
   - Key resource IDs
   - Response conventions

2. Quickstart (/docs/quickstart)
   - Choose a clientId strategy
   - Fetch requests for a project
   - Create a request
   - Add comments
   - Toggle upvotes

3. Requests API (/docs/requests)
   - List requests
   - Create request
   - Delete request
   - Request object shape

4. Comments API (/docs/comments)
   - List comments
   - Create comment
   - Comment object shape

5. Upvotes API (/docs/upvotes)
   - Toggle upvote
   - Upvote behavior and rules

6. Errors & Status Codes (/docs/errors)
   - Validation errors
   - 200 vs 400 responses
   - Error response format

## File Layout (Current)

- app/docs/page.tsx (docs home)
- app/docs/overview/page.tsx
- app/docs/quickstart/page.tsx
- app/docs/requests/page.tsx
- app/docs/comments/page.tsx
- app/docs/upvotes/page.tsx
- app/docs/errors/page.tsx
- components/docs/DocsShell.tsx
- components/docs/DocsSection.tsx
- components/docs/DocsCodeBlock.tsx
- lib/docs.ts (navigation + base URL placeholder)

## Shared UI Components (Planned)

- Docs layout with navigation and skip link
- Page header with last-updated metadata
- Code block styling with copy affordance
- Optional callouts (notes, warnings)
