# TASK

Review the code changes on branch `{{BRANCH}}` and improve code clarity, consistency, and maintainability while preserving exact functionality.

# CONTEXT

## Branch diff

!`git diff {{BASE_BRANCH}}...{{BRANCH}}`

## Commits on this branch

!`git log {{BASE_BRANCH}}..{{BRANCH}} --oneline`

# REVIEW PROCESS

1. **Understand the change**: Read the diff and commits above to understand the intent.

2. **Analyze for improvements**: Look for opportunities to:
   - Reduce unnecessary complexity and nesting
   - Eliminate redundant code and abstractions
   - Improve readability through clear names
   - Consolidate related logic
   - Remove unnecessary comments that describe obvious code
   - Avoid nested ternary operators; prefer switch statements or if/else chains
   - Choose clarity over brevity

3. **Check correctness**:
   - Does the implementation match the issue? Are edge cases handled?
   - Are new/changed behaviours covered by tests where practical?
   - Are there unsafe casts, `any` types, or unchecked assumptions?
   - Does the change introduce injection vulnerabilities, credential leaks, auth bypasses, or other security issues?

4. **Maintain balance**: Avoid over-simplification that could:
   - Reduce clarity or maintainability
   - Create clever code that is hard to understand
   - Combine too many concerns into one function/module
   - Remove helpful domain abstractions

5. **Apply project standards**: Follow `.sandcastle/CODING_STANDARDS.md`.

6. **Preserve functionality**: Never change what the code does - only how it does it.

# EXECUTION

If you find improvements to make:

1. Make the changes directly on this branch.
2. Run `bun run check-types`, `bun run lint`, and any relevant tests.
3. Commit describing the refinements.

If the code is already clean and well-structured, do nothing.

Once complete, output `<promise>COMPLETE</promise>`.
