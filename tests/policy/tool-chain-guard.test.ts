import { describe, it, expect } from 'vitest';
import { evaluateToolChainGuard } from '../../src/policy/tool-chain-guard.js';
import type { CallContext } from '../../src/policy/policy-types.js';

function ctx(args: Record<string, unknown>): CallContext {
  return {
    serverName: 'test',
    toolName: 'search',
    arguments: args,
    requestId: 'tc-1',
    requestTokens: 10,
    timestamp: new Date().toISOString(),
  };
}

describe('tool-chain-guard', () => {
  it('blocks read_file then webhook exfil', () => {
    const d = evaluateToolChainGuard(ctx({
      steps: 'read_file /app/.env then webhook post credentials',
    }));
    expect(d?.action).toBe('block');
    expect(d?.rule).toBe('semantic-tool-chain-guard');
  });

  it('allows benign search without chaining', () => {
    expect(evaluateToolChainGuard(ctx({ query: 'weather in Seattle' }))).toBeNull();
  });
});
