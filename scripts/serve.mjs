#!/usr/bin/env node
/**
 * Serve the MCP Guardian SOC dashboard (Next.js static export from deploy/dashboard-spa/out).
 * Builds the SPA automatically when out/index.html is missing.
 *
 * Usage: pnpm serve
 * Env: DASHBOARD_PORT (default 4000), DASHBOARD_AUTH_DISABLED, GUARDIAN_CI_BYPASS_LICENSE
 */
import { spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_INDEX = join(ROOT, 'deploy', 'dashboard-spa', 'out', 'index.html');
const DIST_SERVER = join(ROOT, 'dist', 'utils', 'dashboard-server.js');
const SRC_SERVER = join(ROOT, 'src', 'utils', 'dashboard-server.ts');

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', ...opts });
}

function needsDistRebuild() {
  if (!existsSync(DIST_SERVER)) return true;
  try {
    return statSync(SRC_SERVER).mtimeMs > statSync(DIST_SERVER).mtimeMs;
  } catch {
    return false;
  }
}

if (!existsSync(OUT_INDEX)) {
  console.log('[serve] SOC dashboard not built — running pnpm dashboard:build …\n');
  const build = run('pnpm', ['dashboard:build']);
  if (build.status !== 0) {
    console.error('\n[serve] Build failed. Fix errors above, then retry: pnpm serve');
    process.exit(build.status ?? 1);
  }
  if (!existsSync(OUT_INDEX)) {
    console.error('[serve] Expected deploy/dashboard-spa/out/index.html after build');
    process.exit(1);
  }
}

if (needsDistRebuild()) {
  console.log('[serve] Compiling dashboard API (tsc)…');
  const tsc = run('pnpm', ['exec', 'tsc', '--project', 'tsconfig.json']);
  if (tsc.status !== 0) process.exit(tsc.status ?? 1);
}

process.env.DASHBOARD_ENABLED = 'true';
process.env.GUARDIAN_WS_ENABLED = process.env.GUARDIAN_WS_ENABLED ?? 'true';
process.env.GUARDIAN_CI_BYPASS_LICENSE = process.env.GUARDIAN_CI_BYPASS_LICENSE ?? 'true';
process.env.DASHBOARD_AUTH_DISABLED = process.env.DASHBOARD_AUTH_DISABLED ?? 'true';
process.env.GUARDIAN_DASHBOARD_SPA = 'true';
process.env.GUARDIAN_DASHBOARD_LEGACY = 'false';

const port = process.env.DASHBOARD_PORT || '4000';
console.log(`[serve] MCP Guardian SOC dashboard → http://localhost:${port}/`);
console.log('[serve] Tabbed UI: Overview, SOC / AI, Threat Discovery, Policy, Analysis, …');
console.log('[serve] For live proxy metrics: pnpm dashboard:proxy guardian-configs/filesystem.json\n');

await import('./serve-dashboard.mjs');
