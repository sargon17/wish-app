# Coding Standards

## Language and style

- Write TypeScript with clear module boundaries.
- Prefer named exports for shared utilities.
- Keep components, hooks, Convex functions, and helpers small and single-purpose.
- Avoid `any`; use generated Convex types and existing project types where available.
- Handle errors with `try`/`catch` and throw `Error` instances with actionable messages.
- Never commit secrets or raw environment values.

## Architecture

- Respect the monorepo layout: `apps/` for applications and `packages/` for shared/backend code.
- Prefer Radix/shadcn primitives and Tailwind utilities for UI changes.
- Keep client UI, server routes, Convex backend logic, and shared utilities separated.
- Follow `AGENTS.md` and package-local README/config files before changing behavior.
- Avoid broad rewrites unless the GitHub issue explicitly calls for them.

## Testing and validation

- Run `bun run check-types` for TypeScript changes.
- Run `bun run lint` for source changes where lint applies.
- Run `bun run test` if tests exist or if you added tests.
- Prefer focused tests for new validation, schema, transformation, API, or UI behavior.
- Do not commit with failing typecheck, lint, or tests.
