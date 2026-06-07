#!/usr/bin/env node
/**
 * Fail if @mcp-guardian/* dependencies in a package manifest cannot be resolved on npm.
 *
 * Usage:
 *   node scripts/verify-npm-deps-resolvable.mjs @mcp-guardian/server 4.1.7
 *   node scripts/verify-npm-deps-resolvable.mjs --local-tgz ./mcp-guardian-server-4.1.7.tgz
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);

function usage() {
  console.error('Usage:');
  console.error('  node scripts/verify-npm-deps-resolvable.mjs <package> <version>');
  console.error('  node scripts/verify-npm-deps-resolvable.mjs --local-tgz <path.tgz>');
  process.exit(1);
}

async function fetchRegistryManifest(name, version) {
  const url = `https://registry.npmjs.org/${encodeURIComponent(name)}/${encodeURIComponent(version)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${name}@${version} not found on registry (${res.status})`);
  }
  return res.json();
}

function loadManifestFromTgz(tgzPath) {
  const raw = execSync(`tar -xOf ${JSON.stringify(tgzPath)} package/package.json`, {
    encoding: 'utf8',
  });
  return JSON.parse(raw);
}

function guardianDeps(manifest) {
  const out = [];
  for (const section of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
    const deps = manifest[section];
    if (!deps || typeof deps !== 'object') continue;
    for (const [name, spec] of Object.entries(deps)) {
      if (name.startsWith('@mcp-guardian/') && typeof spec === 'string') {
        out.push({ name, spec, section });
      }
    }
  }
  return out;
}

function npmViewVersion(name, spec) {
  try {
    return execSync(`npm view ${JSON.stringify(`${name}@${spec}`)} version`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
}

async function main() {
  let manifest;
  let label;

  if (args[0] === '--local-tgz') {
    const tgzPath = args[1];
    if (!tgzPath) usage();
    manifest = loadManifestFromTgz(tgzPath);
    label = `${manifest.name}@${manifest.version} (local tarball)`;
  } else {
    const [name, version] = args;
    if (!name || !version) usage();
    manifest = await fetchRegistryManifest(name, version);
    label = `${name}@${version}`;
  }

  const deps = guardianDeps(manifest);
  if (deps.length === 0) {
    console.log(`[verify-deps] OK ${label} (no @mcp-guardian/* deps)`);
    return;
  }

  const failures = [];
  for (const { name, spec, section } of deps) {
    const resolved = npmViewVersion(name, spec);
    if (!resolved) {
      failures.push(`${section}.${name} = ${spec} → ETARGET (no matching version on npm)`);
      continue;
    }
    console.log(`[verify-deps] OK ${name}@${spec} → ${resolved}`);
  }

  if (failures.length > 0) {
    console.error(`[verify-deps] FAILED ${label} — unresolved @mcp-guardian dependencies:\n`);
    for (const f of failures) console.error(`  - ${f}`);
    console.error('\nPublish dependency packages first, then wait for registry replication.');
    process.exit(1);
  }

  console.log(`[verify-deps] OK ${label} (all @mcp-guardian/* deps resolve on npm)`);
}

await main();
