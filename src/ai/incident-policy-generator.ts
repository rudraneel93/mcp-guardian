/**
 * Generate policy drafts from incident investigation context (Threat Lab + copilot fallback).
 */
import { randomUUID } from 'node:crypto';
import type { PolicyRule } from '../policy/policy-types.js';
import { investigateIncident } from './incident-investigator.js';
import {
  findSemanticAuditRecord,
  loadSemanticAuditRecordsWithTenantFallback,
} from './semantic-audit-store.js';
import {
  findThreatLabCandidateUngated,
  type ThreatLabCandidateRecord,
} from '../utils/swarm-artifacts.js';
import {
  discoverFromSemanticAudit,
  discoverFromSemanticFlag,
  ensureThreatLabLlmReady,
  validatePolicyRuleSafe,
  validateThreatLabDiscovery,
  type ThreatLabDiscovery,
} from './threat-lab.js';
import { generatePolicyCopilotSuggestion } from './policy-copilot.js';
import { PolicyAssist } from './policy-assist.js';
import { Logger } from '../utils/logger.js';
import type { IncidentInvestigation } from './incident-investigator.js';

export type IncidentPolicyDraftSource = 'threat-lab' | 'policy-copilot' | 'existing-candidate';

export type IncidentPolicyDraftReplay = {
  passed: number;
  total: number;
  readyForReview: boolean;
  blockReason?: string;
};

export type IncidentPolicyDraft = {
  draftId: string;
  triggerId: string;
  incidentId?: string;
  attackClass: string;
  hypothesis: string;
  rule: PolicyRule;
  yaml: string;
  confidence: number;
  replay?: IncidentPolicyDraftReplay;
  validationErrors?: string[];
  source: IncidentPolicyDraftSource;
  linkedCandidateId?: string;
};

export class IncidentPolicyGenerateError extends Error {
  constructor(
    message: string,
    public readonly code: 'not_found' | 'llm_unavailable' | 'generation_failed',
  ) {
    super(message);
    this.name = 'IncidentPolicyGenerateError';
  }
}

function ruleToYaml(rule: PolicyRule): string {
  return new PolicyAssist().toYAML(rule);
}

function draftFromCandidate(
  triggerId: string,
  candidate: ThreatLabCandidateRecord,
): IncidentPolicyDraft | null {
  if (!candidate.policyRule) return null;
  const rule = candidate.policyRule as unknown as PolicyRule;
  const validationErrors = validatePolicyRuleSafe(rule);
  const candidateErrors = candidate.validation?.errors ?? [];
  const mergedErrors = [...new Set([...validationErrors, ...candidateErrors])];
  const readyForReview = Boolean(candidate.validation?.ok && mergedErrors.length === 0);

  return {
    draftId: randomUUID(),
    triggerId,
    attackClass: candidate.attackClass,
    hypothesis: candidate.hypothesis,
    rule,
    yaml: ruleToYaml(rule),
    confidence: candidate.confidence,
    replay: candidate.validation
      ? {
          passed: candidate.validation.ok ? 1 : 0,
          total: 1,
          readyForReview,
          blockReason: mergedErrors[0],
        }
      : undefined,
    validationErrors: mergedErrors.length ? mergedErrors : undefined,
    source: 'existing-candidate',
    linkedCandidateId: candidate.id,
  };
}

function draftFromThreatLabDiscovery(
  triggerId: string,
  investigation: IncidentInvestigation,
  discovery: ThreatLabDiscovery,
): IncidentPolicyDraft {
  const validation = validateThreatLabDiscovery(discovery);
  const rule = discovery.policyRule;
  const validationErrors = [...new Set([...validation.errors, ...validatePolicyRuleSafe(rule)])];

  return {
    draftId: randomUUID(),
    triggerId,
    incidentId: investigation.incidentId,
    attackClass: discovery.attackClass,
    hypothesis: discovery.hypothesis,
    rule,
    yaml: ruleToYaml(rule),
    confidence: discovery.confidence,
    replay: {
      passed: validation.replayBlocked ? 1 : 0,
      total: 1,
      readyForReview: validation.ok,
      blockReason: validation.errors[0],
    },
    validationErrors: validationErrors.length ? validationErrors : undefined,
    source: 'threat-lab',
  };
}

function buildCopilotGoal(investigation: IncidentInvestigation, triggerId: string): string {
  const hyp = investigation.hypotheses[0];
  const citation = investigation.citations.find(
    (c) => c.id === triggerId || c.id.includes(triggerId),
  );
  return [
    `Block MCP attack: ${hyp?.attackClass || 'suspicious-activity'}.`,
    hyp?.reasoning ? `Reason: ${hyp.reasoning}` : '',
    citation?.summary ? `Evidence: ${citation.summary}` : '',
    'Generate a blocking policy rule with regex patterns for tool arguments.',
  ]
    .filter(Boolean)
    .join(' ');
}

function draftFromCopilot(
  triggerId: string,
  investigation: IncidentInvestigation,
  suggestion: NonNullable<Awaited<ReturnType<typeof generatePolicyCopilotSuggestion>>>,
): IncidentPolicyDraft {
  const hyp = investigation.hypotheses[0];
  return {
    draftId: randomUUID(),
    triggerId,
    incidentId: investigation.incidentId,
    attackClass: hyp?.attackClass || 'incident-generated',
    hypothesis: suggestion.reason || hyp?.reasoning || 'Policy copilot draft from incident',
    rule: suggestion.rule,
    yaml: suggestion.yaml,
    confidence: suggestion.confidence,
    replay: suggestion.replay
      ? {
          passed: suggestion.replay.passed,
          total: suggestion.replay.total,
          readyForReview: suggestion.replay.readyForReview,
          blockReason: suggestion.replay.blockReason,
        }
      : undefined,
    validationErrors: suggestion.validationErrors?.length ? suggestion.validationErrors : undefined,
    source: 'policy-copilot',
  };
}

async function tryThreatLabDiscovery(
  anchor: import('./semantic-audit-store.js').StoredSemanticAudit,
): Promise<ThreatLabDiscovery | null> {
  if (anchor.semanticAudit?.suspicious) {
    return discoverFromSemanticFlag(anchor);
  }
  if (anchor.label === 'true_positive') {
    return discoverFromSemanticAudit(anchor);
  }
  return null;
}

export async function generateIncidentPolicyDraft(opts: {
  triggerId: string;
  tenantId?: string;
}): Promise<IncidentPolicyDraft> {
  const triggerId = opts.triggerId.trim();
  if (!triggerId) {
    throw new IncidentPolicyGenerateError('triggerId required', 'not_found');
  }

  const existing = findThreatLabCandidateUngated(opts.tenantId, triggerId);
  if (existing?.policyRule && (!existing.reviewStatus || existing.reviewStatus === 'pending')) {
    const draft = draftFromCandidate(triggerId, existing);
    if (draft) return draft;
  }

  const investigation = await investigateIncident({
    triggerId,
    tenantId: opts.tenantId,
    useLlm: false,
  });
  if (!investigation) {
    throw new IncidentPolicyGenerateError('Trigger record not found', 'not_found');
  }

  const { records } = await loadSemanticAuditRecordsWithTenantFallback({
    tenantId: opts.tenantId,
  });
  const anchor = findSemanticAuditRecord(records, triggerId);

  if (anchor) {
    const discovery = await tryThreatLabDiscovery(anchor);
    if (discovery) {
      Logger.info(`[IncidentPolicy] Threat Lab draft for ${triggerId}: rule "${discovery.policyRule.name}"`);
      return draftFromThreatLabDiscovery(triggerId, investigation, discovery);
    }
  }

  const llmReady = await ensureThreatLabLlmReady();
  if (!llmReady.ok) {
    throw new IncidentPolicyGenerateError(
      llmReady.reason || 'LLM unavailable — start Ollama and verify OLLAMA_BASE_URL',
      'llm_unavailable',
    );
  }

  const goal = buildCopilotGoal(investigation, triggerId);
  const suggestion = await generatePolicyCopilotSuggestion(goal, { tenantId: opts.tenantId });
  if (!suggestion) {
    throw new IncidentPolicyGenerateError('Could not generate policy suggestion', 'generation_failed');
  }

  Logger.info(`[IncidentPolicy] Copilot draft for ${triggerId}: rule "${suggestion.rule.name}"`);
  return draftFromCopilot(triggerId, investigation, suggestion);
}
