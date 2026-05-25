# Security Swarm Report

Generated: 2026-05-24T11:39:05.020Z  
Commit: `ec9579450acec48a0fb900645ec1626a4a878e54`  
Mode: **fast**  
Overall: **PASS**

## Gates

| Gate | Status |
|------|--------|
| Corpus (300 entries) | PASS |
| Parity (corpus 100%) | PASS |
| Steps | PASS |
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
- **harness-parity**: OK (exit 0)

## Bypasses

_None detected._

## Evidence links

- [enterprise-findings-fixes/summary.md](enterprise-findings-fixes/summary.md)
- [adversarial-harness/reports/harness-summary.md](../../adversarial-harness/reports/harness-summary.md)
