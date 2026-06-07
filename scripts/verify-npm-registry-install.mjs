#!/usr/bin/env node
/**
 * Verify a published package can be installed cleanly from npm registry.
 * Performs a fresh install in a temp directory to catch missing dependencies.
 *
 * Usage:
 *   node scripts/verify-npm-registry-install.mjs 4.1.8
 */
import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const [version] = process.argv.slice(2);
const packageName = '@mcp-guardian/server';

if (!version) {
  console.error(`Usage: node scripts/verify-npm-registry-install.mjs <version>`);
  process.exit(1);
}

const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'npm-verify-'));

try {
  console.log(`Testing clean install of ${packageName}@${version}...`);
  console.log(`Temp directory: ${tmpDir}`);
  
  // Create minimal package.json
  execSync(`cd "${tmpDir}" && npm init -y > /dev/null 2>&1`, { stdio: 'pipe' });
  
  // Install the package (no scripts, audit, fund)
  console.log(`Running: npm install --ignore-scripts --no-audit --no-fund ${packageName}@${version}`);
  execSync(
    `cd "${tmpDir}" && npm install --ignore-scripts --no-audit --no-fund "${packageName}@${version}"`,
    { stdio: 'inherit' }
  );
  
  console.log(`✓ Clean install of ${packageName}@${version} succeeded`);
} catch (err) {
  console.error(`✗ Clean install of ${packageName}@${version} failed:`);
  console.error(err.message);
  process.exit(1);
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}
