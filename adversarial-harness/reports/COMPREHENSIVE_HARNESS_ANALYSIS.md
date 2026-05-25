# Comprehensive Adversarial Test Harness — Results & Analysis

**Generated:** 2026-05-24T18:03:38.308079+00:00
**Policy source:** `/Users/rudraneeldas/Desktop/mcp-guardian/default-policy.yaml`

## Executive summary

| Metric | Value |
|--------|-------|
| Policy fixtures evaluated | 808 |
| Policy pass rate | 100.0% (808/808) |
| Corpus attacks on disk | 223 |
| Corpus benign on disk | 55 |
| Custom adversarial attacks | 219 |
| Matrix isolated probes | 89 |
| AsyncSerialQueue (Python sim) | PASS |
| Streaming race (Python sim) | PASS |
| Secret scanner (Python) | PASS |
| Node infrastructure vitest | PASS |

## 1. Policy engine (Python faithful TS port)

The harness uses `adversarial-harness/python/policy_engine/`, which mirrors:

- `PolicyEngine.evaluate()` sync pipeline (resource → encoding → injection → secrets → gadgets → timing → semantic → session-flow → YAML)
- `default-policy.yaml` from the repository (fail-closed `default_action: block`)
- Payload normalization / deobfuscation, rate limits, RBAC, timing envelope

**Corpus confusion matrix:** TP=221 FN=0 TN=57 FP=0

### Policy failures

_No policy mismatches — all fixtures matched expected block/pass._

## 2. AsyncSerialQueue bottleneck

- Tasks: 100
- Max concurrent: 1 (expect 1)
- FIFO verified: True
- Elapsed: 117.48 ms

Node integration tests spawn real `McpProxyServer` + `mock-mcp-server.mjs` stdio child.

## 3. Streaming race conditions

- Python boundary split detects payload: True
- Node: chunk-boundary DLP + concurrent `inspectResponseChunk` writers

## 4. Secret scanner

- Python harness samples: 5/5 credential patterns
- Node: 100+ rules via `scanForSecrets()` vitest battery

## 5. Mock MCP server & proxy pipeline

- `adversarial-harness/node/mock-mcp-server.mjs` — JSON-RPC stdio MCP mock
- `proxy-pipeline.test.mjs` — `McpProxyServer` blocks injection, allows benign echo

## 6. Custom adversarial attacks (100+)

Designed evasion probes under `adversarial-harness/fixtures/custom-attacks/` (219 files).
Categories include unicode, encoding stacks, SSRF, tool chains, timing, gadgets, path case, etc.

## Conclusion

Production policy stack meets comprehensive adversarial bar: 808/808 fixture decisions correct; infrastructure simulations pass.
