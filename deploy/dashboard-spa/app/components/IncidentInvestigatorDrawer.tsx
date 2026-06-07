'use client';

import { useEffect, useState } from 'react';
import {
  acceptIncidentPolicyDraft,
  generateIncidentPolicy,
  investigateIncident,
  rejectIncidentPolicyDraft,
  type IncidentPolicyDraft,
} from '@/lib/guardian-api';
import { hasPermission } from '@/lib/dashboard-roles';

export type ThreatLabContext = {
  semanticAuditId: string;
  toolName: string;
  category: string;
  narrative?: string;
  incidentId?: string;
};

type IntentNode = {
  index: number;
  toolName: string;
  role: string;
  citationId: string;
  sensitiveRead?: boolean;
  encodeHint?: boolean;
  exfilHint?: boolean;
};

type IntentGraph = {
  inferredIntent?: string;
  killChainStages?: string[];
  nodes?: IntentNode[];
  patterns?: Array<{ pattern: string; confidence: number }>;
};

type Investigation = {
  incidentId: string;
  narrative?: string;
  killChainNarrative?: string;
  intentGraph?: IntentGraph;
  citations?: Array<{ id: string; summary: string }>;
  hypotheses?: Array<{ attackClass: string; confidence: number; reasoning: string }>;
  recommendations?: Array<{ action: string; detail: string }>;
};

type Props = {
  triggerId: string;
  onClose: () => void;
  onOpenThreatLab?: (ctx: ThreatLabContext) => void;
  roles?: string[];
  onAction?: (msg: string) => void;
};

export function IncidentInvestigatorDrawer({
  triggerId,
  onClose,
  onOpenThreatLab,
  roles,
  onAction,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [policyDraft, setPolicyDraft] = useState<IncidentPolicyDraft | null>(null);
  const [generateBusy, setGenerateBusy] = useState(false);
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [decisionFeedback, setDecisionFeedback] = useState<string | null>(null);

  const canGenerate = hasPermission(roles, 'policy_test') || hasPermission(roles, 'ai');
  const canMutate = hasPermission(roles, 'policy_mutate');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      setPolicyDraft(null);
      const result = await investigateIncident(triggerId);
      if (!cancelled) {
        setInvestigation((result.investigation as Investigation | null) ?? null);
        setError(result.error ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [triggerId]);

  const openThreatLab = () => {
    if (!investigation || !onOpenThreatLab) return;
    const hyp = investigation.hypotheses?.[0];
    const anchorCitation = investigation.citations?.find((c) => c.id === triggerId);
    const toolFromCitation = anchorCitation?.summary?.split(' on ')[0]?.trim();
    const toolFromGraph = investigation.intentGraph?.nodes?.[0]?.toolName;
    onOpenThreatLab({
      semanticAuditId: triggerId,
      toolName: toolFromCitation || toolFromGraph || 'unknown',
      category: hyp?.attackClass || 'suspicious-activity',
      narrative: investigation.narrative ?? investigation.killChainNarrative,
      incidentId: investigation.incidentId,
    });
  };

  const onGeneratePolicy = async () => {
    if (!canGenerate || generateBusy) return;
    setGenerateBusy(true);
    setDecisionFeedback(null);
    try {
      const result = await generateIncidentPolicy(triggerId);
      if (!result.draft) {
        onAction?.(result.error || 'Could not generate policy draft');
        return;
      }
      setPolicyDraft(result.draft);
      onAction?.(
        result.draft.source === 'existing-candidate'
          ? 'Loaded existing Threat Lab candidate as draft'
          : 'Policy draft generated — review and accept or reject',
      );
    } finally {
      setGenerateBusy(false);
    }
  };

  const onAcceptDraft = async () => {
    if (!policyDraft || !canMutate || decisionBusy) return;
    if (policyDraft.validationErrors?.length && !policyDraft.replay?.readyForReview) {
      const proceed = window.confirm(
        `This draft has validation warnings:\n\n${policyDraft.validationErrors.join('\n')}\n\nApply the rule anyway?`,
      );
      if (!proceed) {
        setDecisionFeedback('Accept cancelled — resolve warnings or confirm to apply anyway.');
        return;
      }
    }
    setDecisionBusy(true);
    setDecisionFeedback('Applying policy rule…');
    try {
      const result = await acceptIncidentPolicyDraft({
        draftId: policyDraft.draftId,
        triggerId: policyDraft.triggerId,
        rule: policyDraft.rule,
        incidentId: policyDraft.incidentId,
        linkedCandidateId: policyDraft.linkedCandidateId,
        confidence: policyDraft.confidence,
        simulationPassed: policyDraft.replay?.readyForReview !== false,
        replayCoverage:
          policyDraft.replay && policyDraft.replay.total > 0
            ? policyDraft.replay.passed / policyDraft.replay.total
            : undefined,
      });
      if (result.ok) {
        const ruleName = result.ruleName || String(policyDraft.rule.name || 'rule');
        const msg = `Policy rule accepted: ${ruleName}`;
        setDecisionFeedback(msg);
        onAction?.(msg);
        setPolicyDraft(null);
      } else {
        const msg = result.error || 'Accept failed';
        setDecisionFeedback(msg);
        onAction?.(msg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Accept failed unexpectedly';
      setDecisionFeedback(msg);
      onAction?.(msg);
    } finally {
      setDecisionBusy(false);
    }
  };

  const onRejectDraft = async () => {
    if (!policyDraft || !canMutate || decisionBusy) return;
    setDecisionBusy(true);
    setDecisionFeedback('Rejecting draft…');
    try {
      const ok = await rejectIncidentPolicyDraft({
        draftId: policyDraft.draftId,
        triggerId: policyDraft.triggerId,
        linkedCandidateId: policyDraft.linkedCandidateId,
        ruleName: String(policyDraft.rule.name || ''),
        confidence: policyDraft.confidence,
      });
      if (ok) {
        setDecisionFeedback('Policy draft rejected.');
        onAction?.('Policy draft rejected');
        setPolicyDraft(null);
      } else {
        setDecisionFeedback('Reject failed — check proxy logs.');
        onAction?.('Reject failed');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Reject failed unexpectedly';
      setDecisionFeedback(msg);
      onAction?.(msg);
    } finally {
      setDecisionBusy(false);
    }
  };

  const graph = investigation?.intentGraph;
  const draftHasWarnings = Boolean(
    policyDraft?.validationErrors?.length && !policyDraft.replay?.readyForReview,
  );

  return (
    <aside className="threat-drawer incident-drawer" role="dialog" aria-label="Incident investigation">
      <header className="threat-drawer-head">
        <h3>Incident investigation</h3>
        <button type="button" className="secondary btn-sm" onClick={onClose}>
          Close
        </button>
      </header>
      {loading ? <p className="hint">Investigating…</p> : null}
      {!loading && error ? <p className="muted">{error}</p> : null}
      {!loading && !error && !investigation ? (
        <p className="muted">Investigation failed or record not found.</p>
      ) : null}
      {investigation ? (
        <>
          {investigation.killChainNarrative || investigation.narrative ? (
            <p className="insight-callout-list">{investigation.killChainNarrative || investigation.narrative}</p>
          ) : null}
          {graph?.nodes?.length ? (
            <>
              <h4>Agent intent graph</h4>
              {graph.inferredIntent ? <p className="hint">{graph.inferredIntent}</p> : null}
              {graph.killChainStages?.length ? (
                <p className="hint">Stages: {graph.killChainStages.join(' → ')}</p>
              ) : null}
              <ul className="intent-graph-list insight-callout-list">
                {graph.nodes.map((n) => (
                  <li key={n.citationId}>
                    <code>{n.toolName}</code> <span className="badge-role">{n.role}</span>
                    {n.sensitiveRead ? <span className="badge-hint"> sensitive-read</span> : null}
                    {n.encodeHint ? <span className="badge-hint"> encode</span> : null}
                    {n.exfilHint ? <span className="badge-hint"> exfil</span> : null}
                  </li>
                ))}
              </ul>
              {graph.patterns?.length ? (
                <p className="hint">
                  Pattern: {graph.patterns[0]?.pattern} ({Math.round((graph.patterns[0]?.confidence ?? 0) * 100)}%)
                </p>
              ) : null}
            </>
          ) : null}
          {investigation.hypotheses?.length ? (
            <>
              <h4>Hypotheses</h4>
              <ul className="insight-callout-list">
                {investigation.hypotheses.map((h) => (
                  <li key={h.attackClass}>
                    <strong>{h.attackClass}</strong> ({Math.round(h.confidence * 100)}%) — {h.reasoning}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {investigation.citations?.length ? (
            <>
              <h4>Cited records</h4>
              <ul className="insight-callout-list">
                {investigation.citations.map((c) => (
                  <li key={c.id}>
                    <code>{c.id}</code> — {c.summary}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {investigation.recommendations?.length ? (
            <>
              <h4>Recommendations</h4>
              <ul className="insight-callout-list">
                {investigation.recommendations.map((r) => (
                  <li key={r.detail}>
                    [{r.action}] {r.detail}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <section className="incident-policy-draft candidate-drawer-section">
            <h4>Policy response</h4>
            {!policyDraft ? (
              <>
                <p className="hint">
                  Generate a blocking rule tailored to this incident. Review the draft before applying.
                </p>
                {canGenerate ? (
                  <div className="btn-row">
                    <button type="button" onClick={() => void onGeneratePolicy()} disabled={generateBusy}>
                      {generateBusy ? 'Generating…' : 'Generate policy'}
                    </button>
                  </div>
                ) : (
                  <p className="muted">Requires operator or admin role to generate policy.</p>
                )}
              </>
            ) : (
              <>
                <dl className="candidate-drawer-meta">
                  <dt>Attack class</dt>
                  <dd>{policyDraft.attackClass}</dd>
                  <dt>Confidence</dt>
                  <dd>{(policyDraft.confidence * 100).toFixed(0)}%</dd>
                  <dt>Source</dt>
                  <dd>{policyDraft.source.replace(/-/g, ' ')}</dd>
                  {policyDraft.replay ? (
                    <>
                      <dt>Replay</dt>
                      <dd>
                        {policyDraft.replay.passed}/{policyDraft.replay.total}
                        {policyDraft.replay.readyForReview ? ' · ready for review' : ''}
                      </dd>
                    </>
                  ) : null}
                </dl>
                <p>{policyDraft.hypothesis}</p>
                {policyDraft.validationErrors?.length ? (
                  <ul className="list compact">
                    {policyDraft.validationErrors.map((e) => (
                      <li key={e} className="status-warning">
                        {e}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <pre className="code-block">{policyDraft.yaml}</pre>
                {draftHasWarnings ? (
                  <p className="hint status-warning">
                    Replay or validation warnings present — you can still accept after confirming.
                  </p>
                ) : null}
                {decisionFeedback ? (
                  <p className={decisionFeedback.includes('accepted') ? 'hint' : 'muted'}>{decisionFeedback}</p>
                ) : null}
                {canMutate ? (
                  <div className="btn-row candidate-drawer-actions">
                    <button
                      type="button"
                      className="primary"
                      onClick={() => void onAcceptDraft()}
                      disabled={decisionBusy}
                    >
                      {decisionBusy ? 'Applying…' : 'Accept rule'}
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => void onRejectDraft()}
                      disabled={decisionBusy}
                    >
                      {decisionBusy ? 'Working…' : 'Reject draft'}
                    </button>
                  </div>
                ) : (
                  <p className="muted">Requires operator role to accept or reject policy drafts.</p>
                )}
              </>
            )}
          </section>

          {onOpenThreatLab ? (
            <div className="btn-row">
              <button type="button" onClick={openThreatLab}>
                Open in Threat Lab
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </aside>
  );
}
