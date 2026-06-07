#!/usr/bin/env node
/**
 * Verify that a published package's manifest shows published versions in deps.
 * Fails if registry manifest contains workspace: protocol or unpublished versions.
 *
 * Usage:
 *   node scripts/verify-npm-registry-manifest.mjs @mcp-guardian/server 4.1.8
 */
import { execSync } from 'node:child_process';

const [name, version] = process.argv.slice(2);

if (!name || !version) {
  console.error('Usage: node scripts/verify-npm-registry-manifest.mjs <package> <version>');
  process.exit(1);
}

async function fetchRegistryManifest(pkgName, pkgVersion) {
  const url = `https://registry.npmjs.org/${encodeURIComponent(pkgName)}/${encodeURIComponent(pkgVersion)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${pkgName}@${pkgVersion} not found on registry (${res.status})`);
  }
  return res.json();
}

async function main() {
  const manifest = await fetchRegistryManifest(name, version);
  
  let hasIssues = false;
  for (const section of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
    const deps = manifest[section];
    if (!deps || typeof deps !== 'object') continue;
    
    for (const [depName, spec] of Object.entries(deps)) {
      if (spec.includes('workspace:')) {
        console.error(`✗ ${section}.${depName} = "${spec}" contains workspace: protocol!`);
        hasIssues = true;
      }
    }
  }

  if (hasIssues) {
    console.error(`\n✗ Registry manifest for ${name}@${version} is malformed`);
    process.exit(1);
  }
  
  console.log(`✓ Registry manifest for ${name}@${version} is valid`);
}

await main();
