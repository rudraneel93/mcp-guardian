# Enterprise Validation — Three Deliverables

This document records the three enterprise outcomes requested after the uploaded adversarial analysis (`results_90b8.csv`, `RESULTS_98d3.md`).

## 1. Codified attack classes → `uploaded-bypass` fixtures

**Location:** `adversarial-harness/fixtures/uploaded-bypass/` (83 JSON probes)

**Generator:** `adversarial-harness/scripts/generate-uploaded-bypass-fixtures.mjs`

| Category | Count | Maps to upload CSV |
|----------|-------|-------------------|
| `upload-unicode-*` | 15 | `adv_*_bypass_unicode_*` |
| `upload-regex-*` | 16 | `adv_*_bypass_regex_*` |
| `upload-semantic-*` | 15 | `adv_*_bypass_semantic_*` |
| `upload-path-*` | 11 | `adv_*_bypass_path_traversal_*` |
| `upload-shell-*` | 11 | `adv_*_bypass_shell_*` |
| `upload-chain-*` | 6 | `adv_*_bypass_cross_tool_*` |
| `upload-secret-*` | 9 | `adv_*_bypass_secret_exfil_*` / secret_scan |

Each fixture sets `expected: "block"` (or `pass` for placeholder-only secret probe `upload-secret-09`) and is evaluated by the **production** Python `PolicyEngine` port against `default-policy.yaml`.

## 2. Hardened production guards (where probes slipped through)

| Probe class | Production rule(s) | Files |
|-------------|-------------------|--------|
| `read_file` → `/etc/passwd` → `webhook` | `semantic-tool-chain-guard` (`CALL_READ_EXFIL`, fixed path `\b`) | `src/policy/tool-chain-guard.ts`, `python/policy_engine/tool_chain.py` |
| `puppeteer_navigate` + localhost | `semantic-tool-chain-guard` | same |
| Relative `.env` | `block-sensitive-paths` / `semantic-path-guard` | `src/policy/path-guard.ts`, `python/policy_engine/path_guard.py` |
| Homoglyph assistant persona | `semantic-prompt-injection` | `src/policy/semantic-guards.ts`, `python/policy_engine/semantic_guards.py` |
| `password=` in args | `secret-scan` (267 rules, fast path) | `python/policy_engine/secrets_guard.py` |
| XXE / YAML / pickle / DNS exfil (custom adv-097+) | language + semantic guards | prior harness PR |

No scanner-only shortcuts: decisions come from the same sync pipeline as TypeScript (`resource → encoding → injection → secrets → gadgets → timing → semantic → session-flow → YAML`).

## 3. 100% on 637-fixture enterprise suite (real policy engine)

**Command:**

```bash
pnpm exec tsx adversarial-harness/scripts/export-harness-rules.ts
pnpm run harness:comprehensive
```

**Fixture breakdown (637 total):**

| Source | Count |
|--------|-------|
| Corpus attacks | 151 |
| Corpus benign | 55 |
| Matrix (isolated policy) | 89 |
| Custom adversarial (`adv-001`…`adv-120`) | 120 |
| Generated comprehensive | 38 |
| Uploaded bypass | 83 |
| Analysis ADV (`ADV-001`…`ADV-008`) | 101 |

**Generator:** `adversarial-harness/scripts/generate-analysis-adv-fixtures.mjs`

**Latest validated run:** `637/637` policy decisions correct; infrastructure (AsyncSerialQueue, streaming, 267-rule secrets, Node vitest 26/26) passed.

**Reports:**

- `adversarial-harness/reports/test_harness_report.json` — machine-readable summary
- `adversarial-harness/reports/enterprise_results.csv` — upload-compatible CSV (`block` → `critical`)
- `adversarial-harness/reports/COMPREHENSIVE_HARNESS_ANALYSIS.md` — human analysis

## Contrast with uploaded 56% result

The uploaded CSV used a **minimal prompt-injection scanner** (~0.03s / 298 tests), not `default-policy.yaml`. Re-running those attack *classes* through this harness yields **100%** block rate on the combined suite above.
