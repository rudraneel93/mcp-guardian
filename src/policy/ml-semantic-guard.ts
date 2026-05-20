/**
 * Sync policy hook wrapper — ML semantic evaluation runs in evaluateAsync (async inference).
 */
import type { PolicyConfig, PolicyDecision, CallContext } from './policy-types.js';
import {
  classifyToolCallMlSemantic,
  getMlSemanticLoadError,
  isMlSemanticEnabled,
  isMlSemanticStrictMode,
  type MlSemanticClassification,
} from '../ai/distilbert-semantic-classifier.js';
import { Logger } from '../utils/logger.js';
import { StructuredLogger } from '../utils/structured-logger.js';

export async function evaluateMlSemanticGuard(
  ctx: CallContext,
  config: PolicyConfig,
): Promise<{ decision: PolicyDecision | null; classification?: MlSemanticClassification }> {
  const enabled = isMlSemanticEnabled(config.policy.ml_semantic);
  if (!enabled) return { decision: null };

  try {
    const classification = await classifyToolCallMlSemantic(ctx);
    if (!classification.suspicious) {
      return { decision: null, classification };
    }

    const reason =
      `DistilBERT intent: ${classification.topLabel} `
      + `(malicious=${classification.maliciousScore.toFixed(3)}, benign=${classification.benignScore.toFixed(3)})`;

    return {
      classification,
      decision: {
        action: 'block',
        rule: 'ml-semantic-guard',
        reason,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    Logger.warn(`[ml-semantic] Classification failed: ${message}`);
    StructuredLogger.warn({
      event: 'ml_semantic_degraded',
      error: message,
      loadError: getMlSemanticLoadError(),
      strict: isMlSemanticStrictMode(),
      toolName: ctx.toolName,
      serverName: ctx.serverName,
    });

    if (isMlSemanticStrictMode()) {
      return {
        decision: {
          action: 'block',
          rule: 'ml-semantic-unavailable',
          reason: `ML semantic classifier unavailable (strict mode): ${message}`,
        },
      };
    }
    return { decision: null };
  }
}
