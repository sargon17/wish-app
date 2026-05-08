// Parallel Sandcastle loop for Wish App.
//
// Flow:
//   1. Planner selects currently-unblocked GitHub issues labeled ready-for-agents.
//   2. Each issue runs in its own Docker-backed git worktree: implementer, then reviewer.
//   3. Merger merges branches that produced commits and closes completed issues.
//
// Usage:
//   pnpm run sandcastle

import * as sandcastle from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";

const MAX_ITERATIONS = 10;
const BASE_BRANCH = "main";

const hooks = {
  sandbox: { onSandboxReady: [{ command: "corepack enable && pnpm install --frozen-lockfile" }] },
};

const copyToWorktree = ["node_modules"];

const githubToken = process.env.GH_TOKEN;
if (!githubToken) {
  throw new Error("GH_TOKEN is required. Run `gh auth login` or export GH_TOKEN before running Sandcastle.");
}

const sandboxProvider = docker({
  env: { GH_TOKEN: githubToken },
  mounts: [
    {
      hostPath: "~/.codex",
      sandboxPath: "~/.codex",
    },
    {
      hostPath: "~/.config/gh",
      sandboxPath: "~/.config/gh",
    },
  ],
});

type Issue = { id: string; title: string; branch: string };

function parseTaggedJson<T>(stdout: string, tag: string): T {
  const match = stdout.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  if (!match) {
    throw new Error(`Agent did not produce a <${tag}> tag.\n\n${stdout}`);
  }
  return JSON.parse(match[1]!);
}

for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
  console.log(`\n=== Iteration ${iteration}/${MAX_ITERATIONS} ===\n`);

  const plan = await sandcastle.run({
    hooks,
    sandbox: sandboxProvider,
    name: "planner",
    maxIterations: 1,
    agent: sandcastle.codex("gpt-5.4-mini"),
    promptFile: "./.sandcastle/plan-prompt.md",
  });

  const { issues } = parseTaggedJson<{ issues: Issue[] }>(plan.stdout, "plan");

  if (issues.length === 0) {
    console.log("No unblocked issues to work on. Exiting.");
    break;
  }

  console.log(`Planning complete. ${issues.length} issue(s) to work in parallel:`);
  for (const issue of issues) {
    console.log(`  ${issue.id}: ${issue.title} → ${issue.branch}`);
  }

  const settled = await Promise.allSettled(
    issues.map(async (issue) => {
      const sandbox = await sandcastle.createSandbox({
        branch: issue.branch,
        sandbox: sandboxProvider,
        hooks,
        copyToWorktree,
      });

      try {
        const implement = await sandbox.run({
          name: "implementer",
          maxIterations: 100,
          agent: sandcastle.codex("gpt-5.4-mini"),
          promptFile: "./.sandcastle/implement-prompt.md",
          promptArgs: {
            TASK_ID: issue.id,
            ISSUE_TITLE: issue.title,
            BRANCH: issue.branch,
            BASE_BRANCH,
          },
        });

        if (implement.commits.length === 0) {
          return implement;
        }

        const review = await sandbox.run({
          name: "reviewer",
          maxIterations: 1,
          agent: sandcastle.codex("gpt-5.4-mini"),
          promptFile: "./.sandcastle/review-prompt.md",
          promptArgs: {
            BRANCH: issue.branch,
            BASE_BRANCH,
          },
        });

        return {
          ...review,
          commits: [...implement.commits, ...review.commits],
        };
      } finally {
        await sandbox.close();
      }
    }),
  );

  for (const [index, outcome] of settled.entries()) {
    if (outcome.status === "rejected") {
      console.error(
        `  ✗ ${issues[index]!.id} (${issues[index]!.branch}) failed: ${outcome.reason}`,
      );
    }
  }

  const completedIssues = settled
    .map((outcome, index) => ({ outcome, issue: issues[index]! }))
    .filter(
      (entry) =>
        entry.outcome.status === "fulfilled" && entry.outcome.value.commits.length > 0,
    )
    .map((entry) => entry.issue);

  const completedBranches = completedIssues.map((issue) => issue.branch);

  console.log(`\nExecution complete. ${completedBranches.length} branch(es) with commits:`);
  for (const branch of completedBranches) {
    console.log(`  ${branch}`);
  }

  if (completedBranches.length === 0) {
    console.log("No commits produced. Nothing to merge.");
    continue;
  }

  await sandcastle.run({
    hooks,
    sandbox: sandboxProvider,
    name: "merger",
    maxIterations: 1,
    agent: sandcastle.codex("gpt-5.4-mini"),
    promptFile: "./.sandcastle/merge-prompt.md",
    promptArgs: {
      BRANCHES: completedBranches.map((branch) => `- ${branch}`).join("\n"),
      ISSUES: completedIssues.map((issue) => `- ${issue.id}: ${issue.title}`).join("\n"),
    },
  });

  console.log("\nBranches merged.");
}

console.log("\nAll done.");
