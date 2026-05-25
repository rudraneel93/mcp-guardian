#!/usr/bin/env tsx
/**
 * Export injection rules and semantic pattern sources for Python parity harness.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INJECTION_RULES } from '../../src/scanners/prompt-injection-detector.js';
import { SECRET_RULES } from '../../src/scanners/secret-rules.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dir, '..', 'exported');

mkdirSync(OUT, { recursive: true });

writeFileSync(
  join(OUT, 'injection_rules.json'),
  JSON.stringify(INJECTION_RULES, null, 2),
);

writeFileSync(
  join(OUT, 'secret_rules_meta.json'),
  JSON.stringify(
    SECRET_RULES.map((r) => ({
      id: r.id,
      provider: r.provider,
      severity: r.severity,
      regex: r.regex,
      flags: r.flags ?? '',
      entropy: r.entropy,
      falsePositiveExclusions: r.falsePositiveExclusions,
    })),
    null,
    2,
  ),
);

console.log(`Exported ${INJECTION_RULES.length} injection rules and ${SECRET_RULES.length} secret rule metadata to ${OUT}`);
