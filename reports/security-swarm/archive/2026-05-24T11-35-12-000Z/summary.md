# Security Swarm Report

Generated: 2026-05-24T11:32:09.199Z  
Commit: `c5e34a0fc6cf093d98aa21c2d184e2182d7317d7`  
Mode: **fast**  
Overall: **FAIL**

## Gates

| Gate | Status |
|------|--------|
| Corpus (301 entries) | PASS |
| Parity (corpus 100%) | FAIL |
| Steps | FAIL |
| Bypasses (detected / net-new / max) | 0 / 0 / 0 |
| Bypass baseline | PASS |
| Scout audit | PASS |

## Recommended runtime profile

`hybrid` — see [docs/AI_LEARNING.md](../docs/AI_LEARNING.md#deployment-profiles-security-swarm).

## Steps

- **scout-audit**: OK (exit 0)
- **pnpm-build**: OK (exit 0)
- **vitest-policy-proxy-utils**: OK (exit 0)
- **corpus-eval**: OK (exit 0)
- **setup-python-venv**: OK (exit 0)
- **harness-node-tests**: OK (exit 0)
- **harness-parity**: FAIL (exit 1)

## Bypasses

_None detected._

## Evidence links

- [enterprise-findings-fixes/summary.md](enterprise-findings-fixes/summary.md)
- [adversarial-harness/reports/harness-summary.md](../../adversarial-harness/reports/harness-summary.md)
