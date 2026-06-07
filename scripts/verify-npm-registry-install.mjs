#!/usr/bin/env node
/**
 * Clean registry install smoke test for @mcp-guardian/server.
 * Usage: node scripts/verify-npm-registry-install.mjs [version]
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const version = process.argv[2];
if (!version) {
  console.error('Usage: node scripts/verify-npm-registry-install.mjs <version>');
  process.exit(1);
}

const pkg = `@mcp-guardian/server@${version}`;
const tmp = mkdtempSync(join(tmpdir(), 'mcp-guardian-install-'));

try {
  execSync('npm init -y', { cwd: tmp, stdio: 'pipe' });
  console.log(`[verify-install] npm install ${pkg} in ${tmp}`);
  execSync(`npm install --ignore-scripts --no-audit --no-fund ${JSON.stringify(pkg)}`, {
    cwd: tmp,
    stdio: 'inherit',
  });

  const cliPath = join(tmp, 'node_modules', '@mcp-guardian', 'server', 'dist', 'cli.js');
  if (!existsSync(cliPath)) {
    console.error(`[verify-install] FAILED — missing ${cliPath}`);
    process.exit(1);
  }

  const out = execSync(`node ${JSON.stringify(cliPath)} --version`, {
    cwd: tmp,
    encoding: 'utf8',
  }).trim();
  console.log(`[verify-install] OK ${pkg} installed; cli --version → ${out}`);
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[verify-install] FAILED ${pkg}: ${msg}`);
  process.exit(1);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
