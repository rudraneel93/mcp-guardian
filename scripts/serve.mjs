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
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SPA_ROOT = join(ROOT, 'deploy', 'dashboard-spa');
const LIVE_DASHBOARD = join(SPA_ROOT, 'app', 'page.tsx');

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { cwd: opts.cwd ?? ROOT, stdio: 'inherit', ...opts });
}

function killPort(port) {
  spawnSync('bash', ['-c', `lsof -ti :${port} 2>/dev/null | xargs -r kill -9 2>/dev/null`], {
    stdio: 'ignore',
  });
  if (port === 3000) {
    spawnSync('bash', ['-c', "pkill -9 -f 'next-server' 2>/dev/null; pkill -9 -f 'next dev' 2>/dev/null"], {
      stdio: 'ignore',
    });
  }
}

if (!existsSync(LIVE_DASHBOARD)) {
  console.error('[serve] Dashboard page not found — pull latest dashboard-spa (app/page.tsx).');
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
// Do not kill :4000 — a live MCP proxy may be running alongside this stack.

process.env.SOC_API_PORT = process.env.SOC_API_PORT || '4040';
process.env.GUARDIAN_CI_BYPASS_LICENSE = process.env.GUARDIAN_CI_BYPASS_LICENSE ?? 'true';
process.env.MCP_GUARDIAN_DB_PATH =
  process.env.MCP_GUARDIAN_DB_PATH || join(homedir(), '.mcp-guardian', 'history.db');

const UI_PORT = process.env.PORT || '3000';
const UI_HOST = process.env.HOSTNAME || '0.0.0.0';

console.log('[serve] Guardian SOC Dashboard (live API only)');
console.log(`[serve]   UI:  http://127.0.0.1:${UI_PORT}/  (also http://localhost:${UI_PORT}/ and /dashboard → /)`);
console.log(`[serve]   API: http://127.0.0.1:${process.env.SOC_API_PORT}/  (proxied via UI as /api/*)`);
console.log(`[serve]   DB:  ${process.env.MCP_GUARDIAN_DB_PATH}`);
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
    env: {
      ...process.env,
      FORCE_COLOR: '1',
      PORT: UI_PORT,
      HOSTNAME: UI_HOST,
      SOC_API_PORT: process.env.SOC_API_PORT,
    },
  },
);

child.on('exit', (code) => process.exit(code ?? 0));
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
