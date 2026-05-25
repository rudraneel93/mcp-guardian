# Security Swarm Report

Generated: 2026-05-23T22:05:05.836Z  
Commit: `8691d4fb2536ccd0dddf9d1ff267c2c86b013411`  
Mode: **fast**  
Overall: **FAIL**

## Gates

| Gate | Status |
|------|--------|
| Corpus (228 entries) | PASS |
| Parity (corpus 100%) | PASS |
| Steps | PASS |
| Bypasses (detected / net-new / max) | 7 / 7 / 0 |
| Bypass baseline | FAIL |
| Scout audit | PASS |

## Recommended runtime profile

`high-paranoia` — see [docs/AI_LEARNING.md](../docs/AI_LEARNING.md#deployment-profiles-security-swarm).

## Steps

- **scout-audit**: OK (exit 0)
- **pnpm-build**: OK (exit 0)
- **vitest-policy-proxy-utils**: OK (exit 0)
- **corpus-eval**: OK (exit 0)
- **setup-python-venv**: OK (exit 0)
- **harness-node-tests**: OK (exit 0)
- **harness-parity**: OK (exit 0)
- **evasion-generate**: OK (exit 0)

## Bypasses

- **[NEW]** adv-123
- **[NEW]** adv-124
- **[NEW]** adv-125
- **[NEW]** adv-126
- **[NEW]** adv-127
- **[NEW]** adv-128
- **[NEW]** adv-130

## Evidence links

- [enterprise-findings-fixes/summary.md](enterprise-findings-fixes/summary.md)
- [adversarial-harness/reports/harness-summary.md](../../adversarial-harness/reports/harness-summary.md)
