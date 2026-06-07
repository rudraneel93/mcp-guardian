import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { StoredSemanticAudit } from '../../src/ai/semantic-audit-store.js';
import type { ThreatLabCandidateRecord } from '../../src/utils/swarm-artifacts.js';

const mockRecord: StoredSemanticAudit = {
  id: 'sem-test-001',
  tenantId: 'default',
  requestId: 'inv-test-1',
  serverName: 'filesystem',
  toolName: 'read_file',
  syncDecision: { action: 'block', rule: 'path-guard', reason: 'sensitive path' },
  semanticAudit: {
    suspicious: true,
    confidence: 0.91,
    categories: ['path-traversal'],
    reasoning: 'Attempt to read sensitive file',
  },
  timestamp: new Date().toISOString(),
};

const mockInvestigation = {
  incidentId: 'inc-123',
  triggerId: mockRecord.id,
  triggerType: 'semantic_flag' as const,
  generatedAt: new Date().toISOString(),
  citations: [{ id: mockRecord.id, kind: 'semantic_audit' as const, summary: 'read_file on filesystem' }],
  sessionFlow: [],
  relatedRecords: [],
  hypotheses: [
    {
      attackClass: 'path-traversal',
      confidence: 0.91,
      reasoning: 'Attempt to read sensitive file',
      citations: [mockRecord.id],
    },
  ],
  recommendations: [],
  narrative: 'test narrative',
  threatLabReady: true,
};

const mockDiscovery = {
  attackClass: 'path-traversal',
  hypothesis: 'Block path traversal in read_file',
  corpusCandidate: {
    id: 'threat-lab-001',
    toolName: 'read_file',
    arguments: { path: '../../../etc/passwd' },
    expected: 'block' as const,
    category: 'path-traversal',
  },
  policyRule: {
    name: 'incident-block-path-traversal',
    description: 'Block traversal paths',
    action: 'block' as const,
    patterns: ['\\.\\./'],
  },
  confidence: 0.88,
};

const mockCandidate: ThreatLabCandidateRecord = {
  id: 'tl-candidate-001',
  fingerprint: mockRecord.id,
  attackClass: 'path-traversal',
  hypothesis: 'Existing candidate rule',
  confidence: 0.9,
  reviewStatus: 'pending',
  policyRule: mockDiscovery.policyRule,
  validation: { ok: true, errors: [], replayBlocked: true },
};

vi.mock('../../src/utils/swarm-artifacts.js', () => ({
  findThreatLabCandidateUngated: vi.fn(() => null as ThreatLabCandidateRecord | null),
}));

vi.mock('../../src/ai/incident-investigator.js', () => ({
  investigateIncident: vi.fn(async () => mockInvestigation),
}));

vi.mock('../../src/ai/semantic-audit-store.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/ai/semantic-audit-store.js')>();
  return {
    ...actual,
    loadSemanticAuditRecordsWithTenantFallback: vi.fn(async () => ({
      records: [mockRecord],
      resolvedTenantId: 'default',
    })),
    findSemanticAuditRecord: actual.findSemanticAuditRecord,
  };
});

vi.mock('../../src/ai/threat-lab.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/ai/threat-lab.js')>();
  return {
    ...actual,
    discoverFromSemanticFlag: vi.fn(async () => mockDiscovery),
    discoverFromSemanticAudit: vi.fn(async () => null),
    ensureThreatLabLlmReady: vi.fn(async () => ({ ok: true, llm: {} })),
  };
});

vi.mock('../../src/ai/policy-copilot.js', () => ({
  generatePolicyCopilotSuggestion: vi.fn(async () => null),
}));

describe('incident-policy-generator', () => {
  beforeEach(async () => {
    const swarm = await import('../../src/utils/swarm-artifacts.js');
    vi.mocked(swarm.findThreatLabCandidateUngated).mockReturnValue(null);

    const inv = await import('../../src/ai/incident-investigator.js');
    vi.mocked(inv.investigateIncident).mockResolvedValue(mockInvestigation);

    const store = await import('../../src/ai/semantic-audit-store.js');
    vi.mocked(store.loadSemanticAuditRecordsWithTenantFallback).mockResolvedValue({
      records: [mockRecord],
      resolvedTenantId: 'default',
    });

    const tl = await import('../../src/ai/threat-lab.js');
    vi.mocked(tl.discoverFromSemanticFlag).mockResolvedValue(mockDiscovery);
    vi.mocked(tl.ensureThreatLabLlmReady).mockResolvedValue({ ok: true, llm: {} as never });
  });

  it('returns existing pending Threat Lab candidate when linked', async () => {
    const swarm = await import('../../src/utils/swarm-artifacts.js');
    vi.mocked(swarm.findThreatLabCandidateUngated).mockReturnValue(mockCandidate);

    const { generateIncidentPolicyDraft } = await import('../../src/ai/incident-policy-generator.js');
    const draft = await generateIncidentPolicyDraft({ triggerId: mockRecord.id });

    expect(draft.source).toBe('existing-candidate');
    expect(draft.linkedCandidateId).toBe('tl-candidate-001');
    expect(draft.rule.name).toBe('incident-block-path-traversal');
    expect(draft.yaml).toContain('incident-block-path-traversal');
  });

  it('builds draft from Threat Lab discovery for semantic flag anchor', async () => {
    const { generateIncidentPolicyDraft } = await import('../../src/ai/incident-policy-generator.js');
    const draft = await generateIncidentPolicyDraft({ triggerId: mockRecord.id });

    expect(draft.source).toBe('threat-lab');
    expect(draft.attackClass).toBe('path-traversal');
    expect(draft.incidentId).toBe('inc-123');
    expect(draft.rule.name).toBe('incident-block-path-traversal');
  });

  it('falls back to policy copilot when Threat Lab discovery returns null', async () => {
    const tl = await import('../../src/ai/threat-lab.js');
    vi.mocked(tl.discoverFromSemanticFlag).mockResolvedValue(null);

    const copilot = await import('../../src/ai/policy-copilot.js');
    vi.mocked(copilot.generatePolicyCopilotSuggestion).mockResolvedValue({
      goal: 'test',
      rule: {
        name: 'copilot-incident-rule',
        description: 'from copilot',
        action: 'block',
        patterns: ['evil'],
      },
      yaml: '- name: copilot-incident-rule\n  action: block',
      confidence: 0.8,
      reason: 'copilot reason',
      validationErrors: [],
      replay: { total: 10, passed: 10, failed: 0, results: [], readyForReview: true },
      staged: true,
    });

    const { generateIncidentPolicyDraft } = await import('../../src/ai/incident-policy-generator.js');
    const draft = await generateIncidentPolicyDraft({ triggerId: mockRecord.id });

    expect(draft.source).toBe('policy-copilot');
    expect(draft.rule.name).toBe('copilot-incident-rule');
  });

  it('throws not_found when investigation anchor is missing', async () => {
    const inv = await import('../../src/ai/incident-investigator.js');
    vi.mocked(inv.investigateIncident).mockResolvedValue(null);

    const { generateIncidentPolicyDraft, IncidentPolicyGenerateError } = await import(
      '../../src/ai/incident-policy-generator.js'
    );

    await expect(generateIncidentPolicyDraft({ triggerId: 'missing' })).rejects.toThrow(
      IncidentPolicyGenerateError,
    );
  });

  it('throws llm_unavailable when copilot path needs LLM and it is down', async () => {
    const tl = await import('../../src/ai/threat-lab.js');
    vi.mocked(tl.discoverFromSemanticFlag).mockResolvedValue(null);
    vi.mocked(tl.ensureThreatLabLlmReady).mockResolvedValue({
      ok: false,
      llm: {} as never,
      reason: 'Ollama unreachable',
    });

    const store = await import('../../src/ai/semantic-audit-store.js');
    vi.mocked(store.loadSemanticAuditRecordsWithTenantFallback).mockResolvedValue({
      records: [],
      resolvedTenantId: 'default',
    });

    const { generateIncidentPolicyDraft, IncidentPolicyGenerateError } = await import(
      '../../src/ai/incident-policy-generator.js'
    );

    await expect(generateIncidentPolicyDraft({ triggerId: 'unknown-trigger' })).rejects.toMatchObject({
      code: 'llm_unavailable',
    });
  });
});
