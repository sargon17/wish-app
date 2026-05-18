import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const args = process.argv.slice(2);

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function workspaceDirs() {
  const rootPackage = readJson(join(repoRoot, 'package.json'));
  const dirs = [];
  for (const pattern of rootPackage.workspaces ?? []) {
    const [prefix] = pattern.split('/*');
    const baseDir = join(repoRoot, prefix);
    if (!existsSync(baseDir)) {
      continue;
    }
    for (const entry of readJson(join(repoRoot, 'package.json')).workspaces ?? []) {
      void entry;
    }
  }
  return ['apps/wish-start', 'apps/docs', 'packages/convex-backend']
    .map((dir) => join(repoRoot, dir))
    .filter((dir) => existsSync(join(dir, 'package.json')));
}

function runBun(cwd, script, scriptArgs = []) {
  const result = spawnSync('bun', ['run', script, ...scriptArgs], {
    cwd,
    stdio: 'inherit',
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runTarget(target, scriptArgs) {
  if (target.includes('#')) {
    const [packageName, script] = target.split('#', 2);
    for (const dir of workspaceDirs()) {
      const pkg = readJson(join(dir, 'package.json'));
      if (pkg.name === packageName) {
        runBun(dir, script, scriptArgs);
        return;
      }
    }
    throw new Error(`Unknown workspace package: ${packageName}`);
  }
  runBun(process.cwd(), target, scriptArgs);
}

if (args[0] === 'run' && args[1] === '-r') {
  const script = args[2];
  const scriptArgs = args.slice(3);
  for (const dir of workspaceDirs()) {
    const pkg = readJson(join(dir, 'package.json'));
    if (pkg.scripts?.[script]) {
      runBun(dir, script, scriptArgs);
    }
  }
} else if (args[0] === 'run') {
  runTarget(args[1], args.slice(2));
} else if (args.length > 0) {
  runTarget(args[0], args.slice(1));
} else {
  throw new Error('Usage: vp [run [-r] <script>|<script>]');
}
