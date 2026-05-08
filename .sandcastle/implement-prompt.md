# TASK

Fix issue {{TASK_ID}}: {{ISSUE_TITLE}}

Pull in the issue using `gh issue view {{TASK_ID}}`. If it has a parent PRD, pull that in too.

Only work on the issue specified.

Work on branch `{{BRANCH}}`. Make commits and run validation.

# CONTEXT

Here are the last 10 commits:

<recent-commits>

!`git log -n 10 --format="%H%n%ad%n%B---" --date=short`

</recent-commits>

# EXPLORATION

Explore the repo and fill your context window with relevant information that will allow you to complete the task.

Pay extra attention to the monorepo layout, app routes, React components, Convex backend functions/schema, shared packages, tests, and package scripts that touch the task.

# EXECUTION

Use red-green-refactor where practical:

1. RED: write one focused failing test or type-level check.
2. GREEN: implement the smallest useful change.
3. REPEAT until done.
4. REFACTOR for clarity.

# FEEDBACK LOOPS

Before committing, run the smallest useful validation for the touched files.

Required when applicable:

1. Run `bun run check-types` for TypeScript changes.
2. Run `bun run lint` for lintable source changes.
3. Run `bun run test` if tests exist or if you added tests.
4. Run any relevant package script from `package.json`.
5. Do not ignore failing typecheck, lint, or tests.

# COMMIT

Make a git commit. The commit message must:

1. Start with `SANDCASTLE:` prefix.
2. Include task completed + PRD/reference if known.
3. Mention key decisions made.
4. Mention important files changed.
5. Mention blockers or validation notes, if any.

Keep it concise.

# THE ISSUE

If the task is not complete, leave a comment on the issue with what was done and what remains.

Do not close the issue - this will be done later.

Once complete, output `<promise>COMPLETE</promise>`.

# FINAL RULES

ONLY WORK ON A SINGLE TASK.
