# Adversarial Test Harness

Enterprise security evaluation harness for MCP Guardian policy engine, proxy pipeline, and scanners.

## Components

| Layer | Path | Purpose |
|-------|------|---------|
| **Python policy engine** | `python/policy_engine/` | Faithful port of TS sync pipeline with RBAC, rate limits, isolated rule mode |
| **Comprehensive harness** | `python/comprehensive_test_harness.py` | Policy eval (453 fixtures) + AsyncSerialQueue + streaming + secrets + Node vitest |
| **Comprehensive eval** | `python/run_comprehensive_eval.py` | Corpus + 89 matrix probes + 120 custom attacks |
| **Corpus** | `../../corpus/` | 151 attack + 55 benign fixtures |
| **Matrix fixtures** | `fixtures/matrix/` | Isolated RBAC / rate / token suites (no cross-rule masking) |
| **Custom attacks** | `fixtures/custom-attacks/` | 120 adversarial probes (adv-001…adv-120) |
| **Uploaded bypass suite** | `fixtures/uploaded-bypass/` | 83 probes mirroring upload CSV categories |
| **Generated probes** | `fixtures/generated/` | 38 encoding/unicode/RBAC edge cases |
| **Node integration** | `node/` | Mock MCP, proxy pipeline, AsyncSerialQueue, streaming, secret scanner |
| **Orchestrator** | `run-harness.mjs` | Full run + `reports/harness-summary.md` |

See **[ENTERPRISE_VALIDATION.md](./ENTERPRISE_VALIDATION.md)** for the three deliverables: uploaded-bypass fixtures, production guard hardening, and 637/637 policy validation (includes ADV-001..ADV-008 analysis probes).

## Quick start

```bash
# Full harness
node adversarial-harness/run-harness.mjs

# Regenerate matrix (89 unique ids) + custom attacks
node adversarial-harness/scripts/generate-matrix-fixtures.mjs
node adversarial-harness/scripts/generate-custom-attacks.mjs

# Comprehensive harness (policy + infrastructure)
pnpm run harness:comprehensive

# Python comprehensive eval only
PYTHONPATH=adversarial-harness/python python3 adversarial-harness/python/run_comprehensive_eval.py

# Node tests (Vitest JSON report file — not stdout parsing)
node adversarial-harness/scripts/run-node-tests.mjs

# Parity by fixture id (not integer index)
pnpm exec tsx adversarial-harness/scripts/compare-node-python.ts
```

## Harness design notes

- **Corpus loading**: resolves `../../corpus` from harness root; reports `corpusAttacksOnDisk` / `loaded` in `comprehensive-eval.json`.
- **Matrix isolation**: `policyMode: "isolated"` + `yamlOnly` / `sync_mode: yaml_only` so rate-limit and token tests are not masked by global RBAC.
- **Rate limits**: shared engine per `rate-*` sequence; counters are not reset between calls 1–3 (block from call 4+).
- **Parity**: `batch-node-eval.ts` and `parity_batch.py` emit `byId` maps keyed by string fixture id (`corpus:attacks/...`, `adv-001`, `rate-001`, etc.).
- **Node tests**: `run-node-tests.mjs` uses `--reporter=json --outputFile=...` to avoid log + JSON stdout parse failures.

## Reports

- `reports/test_harness_report.json` — Full comprehensive harness JSON
- `reports/COMPREHENSIVE_HARNESS_ANALYSIS.md` — Human-readable analysis
- `reports/comprehensive-eval.json` — Python matrix + corpus + custom
- `reports/parity-report.json` — Node/Python agreement by id (corpus must be 100%)
- `reports/node-batch-by-id.json` — Node decisions keyed by id
- `reports/node-tests-summary.json` — Vitest harness summary
- `reports/harness-summary.md` — Orchestrator summary
- `../../corpus-eval-report.json` — Canonical Node corpus eval

## Parity gates

- **Corpus**: zero mismatches between Node and Python (required).
- **Overall**: ≥97% agreement including matrix + custom (documented deltas for ZW-normalization / path-heuristic edge cases).
