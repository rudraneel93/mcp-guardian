#!/usr/bin/env node
/**
 * Build artifacts for the installable MCP Guardian SOC desktop app:
 *   - TypeScript (dist/ + dist/cli.js)
 *   - Static SOC UI (deploy/dashboard-spa/out)
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SPA = join(ROOT, 'deploy', 'dashboard-spa');

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: opts.cwd ?? ROOT, stdio: 'inherit', env: opts.env ?? process.env });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log('[desktop:build] Compiling MCP Guardian (TypeScript)…');
run('pnpm', ['run', 'build:guardian']);

if (!existsSync(join(SPA, 'node_modules'))) {
  console.log('[desktop:build] Installing dashboard-spa dependencies…');
  run('npm', ['install'], { cwd: SPA });
}

console.log('[desktop:build] Building static SOC UI (export)…');
run('npm', ['run', 'build'], {
  cwd: SPA,
  env: { ...process.env, NODE_ENV: 'production', GUARDIAN_DESKTOP_BUILD: 'true' },
});

const index = join(SPA, 'out', 'index.html');
if (!existsSync(index)) {
  console.error('[desktop:build] Missing deploy/dashboard-spa/out/index.html — build failed.');
  process.exit(1);
}

console.log('[desktop:build] Ready. Launch with: mcp-guardian desktop');
console.log('[desktop:build] Package installers with: pnpm desktop:pack');
