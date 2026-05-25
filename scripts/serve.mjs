#!/usr/bin/env node
/**
 * Serve the Guardian SOC Dashboard (dashboard-v3):
 *   - SOC API backend on :4040 (src/soc-api-server.ts) — real DB/policy data
 *   - Next.js dev UI on :3000 (GuardianSOCDashboard) — proxies /api → :4040
 *
 * Usage: pnpm serve
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SPA_ROOT = join(ROOT, 'deploy', 'dashboard-spa');
const SOC_COMPONENT = join(SPA_ROOT, 'app', 'components', 'GuardianSOCDashboard.tsx');

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { cwd: opts.cwd ?? ROOT, stdio: 'inherit', ...opts });
}

function killPort(port) {
  spawnSync('bash', ['-c', `lsof -ti :${port} 2>/dev/null | xargs -r kill -9 2>/dev/null`], {
    stdio: 'ignore',
  });
}

if (!existsSync(SOC_COMPONENT)) {
  console.error(
    '[serve] GuardianSOCDashboard not found. Merge branch dashboard-v3 or pull latest:\n' +
      '  git fetch origin dashboard-v3 && git merge origin/dashboard-v3',
  );
  process.exit(1);
}

if (!existsSync(join(SPA_ROOT, 'node_modules'))) {
  console.log('[serve] Installing dashboard-spa dependencies…');
  const inst = run('npm', ['install'], { cwd: SPA_ROOT });
  if (inst.status !== 0) process.exit(inst.status ?? 1);
}

// Ensure concurrently for soc:full-style orchestration
try {
  await import('concurrently');
} catch {
  console.log('[serve] Installing concurrently…');
  const add = run('pnpm', ['add', '-D', 'concurrently']);
  if (add.status !== 0) process.exit(add.status ?? 1);
}

killPort(3000);
killPort(4040);
killPort(4000);

process.env.SOC_API_PORT = process.env.SOC_API_PORT || '4040';
process.env.GUARDIAN_CI_BYPASS_LICENSE = process.env.GUARDIAN_CI_BYPASS_LICENSE ?? 'true';

console.log('[serve] Guardian SOC Dashboard');
console.log('[serve]   UI:  http://localhost:3000/  (GuardianSOCDashboard + Tailwind)');
console.log('[serve]   API: http://localhost:4040/  (soc-api-server → ~/.mcp-guardian DB)');
console.log('[serve] Press Ctrl+C to stop both processes.\n');

const child = spawn(
  'pnpm',
  ['exec', 'concurrently', '--kill-others', '-n', 'api,ui', '-c', 'cyan,magenta',
    'pnpm soc:api:dev',
    'pnpm dashboard:dev',
  ],
  {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' },
  },
);

child.on('exit', (code) => process.exit(code ?? 0));
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
