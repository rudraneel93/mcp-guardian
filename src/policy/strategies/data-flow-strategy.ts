import { evaluateSessionDataFlow } from '../session-data-flow-guard.js';
import { isDataFlowEnabled } from '../session-data-flow-store.js';
import type { PolicyStrategy } from './types.js';

/**
 * Session data-flow strategy — must run async; evaluate() triggers async path via PolicyEngine.
 * Placeholder sync evaluate returns null; PolicyEngine calls evaluateSessionDataFlow in evaluateAsync.
 */
export const dataFlowStrategy: PolicyStrategy = {
  name: 'session-data-flow',
  evaluate() {
    return null;
  },
};

export async function evaluateDataFlowAsync(
  ctx: import('../policy-types.js').CallContext,
  config: import('../policy-types.js').PolicyConfig,
): Promise<import('../policy-types.js').PolicyDecision | null> {
  if (!isDataFlowEnabled(config.policy.data_flow)) return null;
  return evaluateSessionDataFlow(ctx, true);
}
