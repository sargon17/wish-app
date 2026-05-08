// Lead-delivery Sandcastle loop for Wish App.
//
// Flow per selected issue:
//   architect → coder → review/coder fixes → tester/coder fixes → merge
//
// This TypeScript monorepo can validate inside the Docker sandbox with pnpm and
// TypeScript checks.
//
// Usage:
//   pnpm run sandcastle:lead-delivery

import * as sandcastle from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";

const MAX_ITERATIONS = 10;
const MAX_REVIEW_ROUNDS = 2;
const MAX_VALIDATION_FIX_ATTEMPTS = 3;
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
type ReviewResult = {
  verdict: "pass" | "needs_fixes" | "blocker";
  findings?: unknown[];
  summary?: string;
};
type TestResult = {
  verdict: "pass" | "fail";
  commands?: string[];
  failures?: unknown[];
  summary?: string;
};

function parseTaggedJson<T>(stdout: string, tag: string): T {
  const match = stdout.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  if (!match) {
    throw new Error(`Agent did not produce a <${tag}> tag.\n\n${stdout}`);
  }
  return JSON.parse(match[1]!);
}

function stringify(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
  console.log(`\n=== Lead Delivery Iteration ${iteration}/${MAX_ITERATIONS} ===\n`);

  const plan = await sandcastle.run({
    hooks,
    sandbox: sandboxProvider,
    name: "planner",
    maxIterations: 1,
    agent: sandcastle.codex("gpt-5.5"),
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
      try {
        return await runIssuePipeline(issue);
      } catch (error) {
        console.error(`  ✗ ${issue.id} (${issue.branch}) failed during pipeline:`, error);
        throw error;
      }
    }),
  );

  async function runIssuePipeline(issue: Issue) {
    const sandbox = await sandcastle.createSandbox({
      branch: issue.branch,
      sandbox: sandboxProvider,
      hooks,
      copyToWorktree,
    });

    const allCommits: unknown[] = [];

    try {
      const architectureRun = await sandbox.run({
        name: "architect",
        maxIterations: 1,
        agent: sandcastle.codex("gpt-5.5"),
        promptFile: "./.sandcastle/lead-delivery/architect-prompt.md",
        promptArgs: {
          TASK_ID: issue.id,
          ISSUE_TITLE: issue.title,
          BRANCH: issue.branch,
          BASE_BRANCH,
        },
      });
      allCommits.push(...architectureRun.commits);

      const architecture = parseTaggedJson<unknown>(architectureRun.stdout, "architecture");

      const implementRun = await sandbox.run({
        name: "coder",
        maxIterations: 100,
        agent: sandcastle.codex("gpt-5.4-mini"),
        promptFile: "./.sandcastle/lead-delivery/coder-prompt.md",
        promptArgs: {
          MODE: "implement",
          TASK_ID: issue.id,
          ISSUE_TITLE: issue.title,
          BRANCH: issue.branch,
          BASE_BRANCH,
          ARCHITECTURE: stringify(architecture),
          FEEDBACK: "",
        },
      });
      allCommits.push(...implementRun.commits);

      for (let round = 1; round <= MAX_REVIEW_ROUNDS; round++) {
        const reviewRun = await sandbox.run({
          name: `reviewer-${round}`,
          maxIterations: 1,
          agent: sandcastle.codex("gpt-5.5"),
          promptFile: "./.sandcastle/lead-delivery/review-prompt.md",
          promptArgs: {
            TASK_ID: issue.id,
            ISSUE_TITLE: issue.title,
            BRANCH: issue.branch,
            BASE_BRANCH,
            ROUND: String(round),
            ARCHITECTURE: stringify(architecture),
          },
        });
        allCommits.push(...reviewRun.commits);

        const review = parseTaggedJson<ReviewResult>(reviewRun.stdout, "review");
        if (review.verdict === "pass") {
          console.log(`  ✓ ${issue.id}: review passed on round ${round}`);
          break;
        }

        const fixRun = await sandbox.run({
          name: `coder-review-fixes-${round}`,
          maxIterations: 50,
          agent: sandcastle.codex("gpt-5.4-mini"),
          promptFile: "./.sandcastle/lead-delivery/coder-prompt.md",
          promptArgs: {
            MODE: "review-fixes",
            TASK_ID: issue.id,
            ISSUE_TITLE: issue.title,
            BRANCH: issue.branch,
            BASE_BRANCH,
            ARCHITECTURE: stringify(architecture),
            FEEDBACK: stringify(review),
          },
        });
        allCommits.push(...fixRun.commits);
      }

      let testResult: TestResult | undefined;
      for (let attempt = 0; attempt <= MAX_VALIDATION_FIX_ATTEMPTS; attempt++) {
        const testRun = await sandbox.run({
          name: attempt === 0 ? "tester" : `tester-rerun-${attempt}`,
          maxIterations: 1,
          completionSignal: "</test>",
          agent: sandcastle.codex("gpt-5.4-mini"),
          promptFile: "./.sandcastle/lead-delivery/test-prompt.md",
          promptArgs: {
            TASK_ID: issue.id,
            ISSUE_TITLE: issue.title,
            BRANCH: issue.branch,
            BASE_BRANCH,
            ARCHITECTURE: stringify(architecture),
          },
        });
        allCommits.push(...testRun.commits);

        testResult = parseTaggedJson<TestResult>(testRun.stdout, "test");
        if (testResult.verdict === "pass") {
          console.log(`  ✓ ${issue.id}: validation passed`);
          break;
        }

        if (attempt === MAX_VALIDATION_FIX_ATTEMPTS) {
          break;
        }

        const validationFixRun = await sandbox.run({
          name: `coder-validation-fixes-${attempt + 1}`,
          maxIterations: 50,
          agent: sandcastle.codex("gpt-5.4-mini"),
          promptFile: "./.sandcastle/lead-delivery/coder-prompt.md",
          promptArgs: {
            MODE: "validation-fixes",
            TASK_ID: issue.id,
            ISSUE_TITLE: issue.title,
            BRANCH: issue.branch,
            BASE_BRANCH,
            ARCHITECTURE: stringify(architecture),
            FEEDBACK: stringify(testResult),
          },
        });
        allCommits.push(...validationFixRun.commits);
      }

      return {
        issue,
        ok: testResult?.verdict === "pass",
        testResult,
        commits: allCommits,
      };
    } finally {
      await sandbox.close();
    }
  }

  for (const [index, outcome] of settled.entries()) {
    if (outcome.status === "rejected") {
      console.error(`  ✗ ${issues[index]!.id} (${issues[index]!.branch}) failed: ${outcome.reason}`);
    } else if (!outcome.value.ok) {
      console.error(`  ✗ ${outcome.value.issue.id} (${outcome.value.issue.branch}) did not pass validation`);
    }
  }

  const completedIssues = settled
    .filter(
      (outcome): outcome is PromiseFulfilledResult<{
        issue: Issue;
        ok: boolean;
        testResult: TestResult | undefined;
        commits: unknown[];
      }> => outcome.status === "fulfilled",
    )
    .filter((outcome) => outcome.value.ok && outcome.value.commits.length > 0)
    .map((outcome) => outcome.value.issue);

  const completedBranches = completedIssues.map((issue) => issue.branch);

  console.log(`\nExecution complete. ${completedBranches.length} validated branch(es):`);
  for (const branch of completedBranches) {
    console.log(`  ${branch}`);
  }

  if (completedBranches.length === 0) {
    console.log("No validated branches. Nothing to merge.");
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

  console.log("\nValidated branches merged.");
}

console.log("\nLead delivery loop done.");
