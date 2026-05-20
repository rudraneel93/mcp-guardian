/**
 * Cross-request data-flow guard — blocks when prior session calls + current call
 * form a sensitive-read → exfiltration chain (each call may pass in isolation).
 */
import type { CallContext, PolicyDecision } from './policy-types.js';
import { extractCallDataFlowSignals, type CallDataFlowSignals } from './call-signal-extractor.js';
import {
  getSessionDataFlowStore,
  isDataFlowEnabled,
  resolveSessionKey,
  type SessionDataFlowSnapshot,
} from './session-data-flow-store.js';

export interface DataFlowChainMatch {
  rule: string;
  reason: string;
}

function priorSensitiveReads(history: CallDataFlowSignals[]): string[] {
  const out = new Set<string>();
  for (const c of history) {
    for (const p of c.sensitiveReads) out.add(p);
    if (c.isReadTool && c.sensitiveReads.length === 0 && /\b(?:read|file|path)\b/i.test(c.toolName)) {
      out.add(`tool:${c.toolName}`);
    }
  }
  return [...out];
}

function priorExfilSinks(history: CallDataFlowSignals[]): string[] {
  const out = new Set<string>();
  for (const c of history) {
    for (const s of c.exfilSinks) out.add(s);
    if (c.isExfilTool) out.add(`tool:${c.toolName}`);
  }
  return [...out];
}

export function evaluateCrossCallDataFlow(
  history: SessionDataFlowSnapshot,
  current: CallDataFlowSignals,
): DataFlowChainMatch | null {
  const reads = priorSensitiveReads(history.calls);
  const exfils = priorExfilSinks(history.calls);

  if (reads.length > 0 && (current.isExfilTool || current.exfilSinks.length > 0)) {
    return {
      rule: 'session-data-flow-read-then-exfil',
      reason:
        `Session chain: prior sensitive read(s) [${reads.slice(0, 3).join(', ')}] `
        + `followed by exfiltration via '${current.toolName}'`,
    };
  }

  if (exfils.length > 0 && (current.isReadTool || current.sensitiveReads.length > 0)) {
    return {
      rule: 'session-data-flow-exfil-then-read',
      reason:
        `Session chain: prior exfiltration step(s) followed by sensitive read via '${current.toolName}'`,
    };
  }

  const priorReadTools = history.calls.filter((c) => c.isReadTool && c.sensitiveReads.length > 0);
  if (priorReadTools.length > 0 && current.isExfilTool && history.calls.length >= 1) {
    return {
      rule: 'session-data-flow-staged-exfil',
      reason:
        `Session chain: ${priorReadTools.length} prior read(s) of sensitive paths, now exfil via '${current.toolName}'`,
    };
  }

  return null;
}

export async function evaluateSessionDataFlow(
  ctx: CallContext,
  enabled = true,
): Promise<PolicyDecision | null> {
  if (!enabled || !isDataFlowEnabled()) return null;

  const store = getSessionDataFlowStore();
  const sessionKey = resolveSessionKey(ctx);
  const history = await store.getSnapshot(sessionKey, ctx.tenantId);
  const current = extractCallDataFlowSignals(ctx);

  const match = evaluateCrossCallDataFlow(history, current);
  await store.appendCall(sessionKey, current, ctx.tenantId);

  if (!match) return null;

  return {
    action: 'block',
    rule: match.rule,
    reason: match.reason,
  };
}
