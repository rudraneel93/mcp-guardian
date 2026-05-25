#!/usr/bin/env node
/**
 * CI/local smoke test for the enterprise desktop loopback stack (no Electron window).
 */
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const PORT = process.env.GUARDIAN_DESKTOP_TEST_PORT || '19192';
const ROOT = new URL('..', import.meta.url).pathname;

const env = { ...process.env };
if (!env.MCP_GUARDIAN_DB_PATH) delete env.MCP_GUARDIAN_DB_PATH;

const child = spawn(process.execPath, ['dist/cli.js', 'desktop', '--server-only', '--port', PORT], {
  cwd: ROOT,
  stdio: ['ignore', 'pipe', 'pipe'],
  env,
});

let ready = false;
child.stdout?.on('data', (buf) => {
  const text = buf.toString();
  process.stdout.write(text);
  if (text.includes('SOC desktop runtime ready')) ready = true;
});

child.stderr?.on('data', (buf) => process.stderr.write(buf));

await delay(6000);

if (!ready) {
  child.kill('SIGTERM');
  console.error('[desktop-smoke] Runtime did not become ready');
  process.exit(1);
}

const base = `http://127.0.0.1:${PORT}`;
const checks = [
  ['/', `${base}/`],
  ['/api/auth/status', `${base}/api/auth/status`],
];

for (const [name, url] of checks) {
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`[desktop-smoke] ${name} failed: ${res.status}`);
    child.kill('SIGTERM');
    process.exit(1);
  }
  console.log(`[desktop-smoke] ${name} OK (${res.status})`);
}

child.kill('SIGTERM');
await delay(500);
console.log('[desktop-smoke] Passed');
process.exit(0);
