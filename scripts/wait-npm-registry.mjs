#!/usr/bin/env node
/**
 * Wait for a package version to appear on npm registry.
 * Polls with exponential backoff up to 2 minutes.
 *
 * Usage:
 *   node scripts/wait-npm-registry.mjs @mcp-guardian/core 4.1.8
 */
import { execSync } from 'node:child_process';

const [name, version] = process.argv.slice(2);

if (!name || !version) {
  console.error('Usage: node scripts/wait-npm-registry.mjs <package> <version>');
  process.exit(1);
}

const maxWaitMs = 2 * 60 * 1000; // 2 minutes
const startTime = Date.now();
let attempt = 0;
const maxAttempts = 12;

async function isPublished() {
  try {
    const result = execSync(`npm view ${JSON.stringify(`${name}@${version}`)} version`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return result === version;
  } catch {
    return false;
  }
}

async function wait() {
  while (Date.now() - startTime < maxWaitMs && attempt < maxAttempts) {
    attempt++;
    if (await isPublished()) {
      console.log(`✓ ${name}@${version} is now available on npm (attempt ${attempt})`);
      return;
    }
    const delayMs = Math.min(1000 * Math.pow(1.5, attempt - 1), 30000);
    console.log(`Waiting for ${name}@${version}... (attempt ${attempt}, retry in ${delayMs}ms)`);
    await new Promise((r) => setTimeout(r, delayMs));
  }

  if (!(await isPublished())) {
    console.error(`✗ Timeout: ${name}@${version} not available after ${maxAttempts} attempts`);
    process.exit(1);
  }
}

await wait();
