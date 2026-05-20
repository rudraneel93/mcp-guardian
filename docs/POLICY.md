# Policy evaluation

MCP Guardian evaluates each `tools/call` through layered policy sources. When multiple sources disagree, precedence is **fixed and deterministic**.

## Evaluation order

1. **OPA / Rego** (highest) — When `OPA_URL` is set, POST the call context to OPA. If OPA returns `allow: false`, the request is **blocked immediately** with rule `opa`. OPA does not short-circuit YAML on allow; it only wins on **block**.
2. **YAML `PolicyEngine` rules** — Allow/deny lists, regex, arg patterns, RBAC, rate limits, semantic guards.
3. **`default_action`** — Applied when no YAML rule matches (omit for fail-open; set `block` for fail-closed).

## OPA unavailable

| Condition | Behavior |
|-----------|----------|
| `OPA_URL` unset | Skip OPA; YAML only |
| HTTP error / timeout | Fall through to YAML |
| `GUARDIAN_STRICT_MODE=true` and OPA unreachable | Block (`opa` rule) |

## Examples

| OPA | YAML | Result |
|-----|------|--------|
| block | pass | **block** (OPA) |
| block | block | **block** (OPA — same outcome, OPA reason) |
| pass / no decision | block | **block** (YAML) |
| pass / no decision | pass | **pass** |

Implementation: `src/policy/policy-precedence.ts`, `PolicyEngine.evaluateAsync()`.

## P2: ML semantic (DistilBERT) and session data-flow

### DistilBERT prompt-injection classifier (`ml_semantic`)

- Model: `acuvity/distilbert-base-uncased-prompt-injection-v0.1` (DistilBERT, ~67M params).
- ONNX runtime: `@xenova/transformers` `text-classification` pipeline.
- Weights: `assets/ml/prompt-injection/` (not in git — generate with `pnpm ml:export`).
- Runs in `PolicyEngine.evaluateAsync()` before YAML rules when `policy.ml_semantic` is true (default).
- Labels: `safe`, `prompt_injection` — blocks when injection score ≥ `GUARDIAN_ML_SEMANTIC_THRESHOLD` (default `0.5`).
- Override model path: `GUARDIAN_ML_MODEL_PATH=/path/to/prompt-injection`.
- Pre-warm: `pnpm ml:preload` (after export).
- Strict: `GUARDIAN_ML_SEMANTIC_STRICT=true` blocks if the model cannot load.

### Session data-flow (`data_flow`)

- Tracks tool-call signals per MCP session (`sessionId` / proxy instance id).
- Blocks when a **prior** call read sensitive paths and the **current** call exfiltrates (or the reverse).
- Store: in-memory LRU (default) or Redis (`GUARDIAN_DATA_FLOW_REDIS=true` with `REDIS_URL`).
- TTL / window: `GUARDIAN_DATA_FLOW_TTL_MS` (default 1h), `GUARDIAN_DATA_FLOW_MAX_CALLS` (default 64).
- Proxies set `CallContext.sessionId` (stdio proxy instance UUID, SSE session id, HTTP headers).

### `evaluateAsync` order (after OPA / rate limit)

1. Session data-flow guard  
2. DistilBERT ML semantic guard  
3. Sync strategies (prompt injection, semantic guards, YAML rules)
