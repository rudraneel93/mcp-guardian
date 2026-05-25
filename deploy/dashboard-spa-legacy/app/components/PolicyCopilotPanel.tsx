'use client';

import { useEffect, useState } from 'react';
import { fetchPolicyCopilot, fetchPolicyCounterfactual } from '@/lib/guardian-api';
import { hasPermission } from '@/lib/dashboard-roles';

type Props = {
  roles?: string[];
  onAction?: (msg: string) => void;
  initialTab?: 'generate' | 'counterfactual';
};

type ReplayResult = {
  id: string;
  source: string;
  toolName: string;
  expected: string;
  actual: string;
  ok: boolean;
};

type CounterfactualDelta = {
  id: string;
  toolName: string;
  direction: string;
  baselineAction: string;
  counterfactualAction: string;
};

export function PolicyCopilotPanel({ roles, onAction, initialTab }: Props) {
  const canTest = hasPermission(roles, 'policy_test');
  const [tab, setTab] = useState<'generate' | 'counterfactual'>(initialTab ?? 'generate');

  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);
  const [goal, setGoal] = useState('');
  const [busy, setBusy] = useState(false);
  const [yaml, setYaml] = useState('');
  const [draftRule, setDraftRule] = useState<Record<string, unknown> | null>(null);
  const [replay, setReplay] = useState<{
    readyForReview?: boolean;
    passed?: number;
    total?: number;
    failed?: number;
    blockReason?: string;
    results?: ReplayResult[];
  } | null>(null);
  const [counterfactual, setCounterfactual] = useState<{
    summary?: string;
    newBlocks?: number;
    newPasses?: number;
    fpRiskScore?: number;
    deltas?: CounterfactualDelta[];
  } | null>(null);

  const onGenerate = async () => {
    if (!canTest) {
      onAction?.('Requires operator role');
      return;
    }
    const g = goal.trim();
    if (!g) {
      onAction?.('Describe a policy goal first');
      return;
    }
    setBusy(true);
    try {
      const result = await fetchPolicyCopilot(g);
      if (!result) {
        onAction?.('Policy Copilot unavailable — check LLM / proxy');
        return;
      }
      setYaml(String(result.yaml || ''));
      setDraftRule((result.rule as Record<string, unknown>) || null);
      setReplay((result.replay as typeof replay) || null);
      if (result.staged) {
        onAction?.('Replay passed — ready to stage for review');
      } else {
        const reason = (result.replay as { blockReason?: string })?.blockReason;
        onAction?.(reason || 'Replay did not pass — review matrix');
      }
    } finally {
      setBusy(false);
    }
  };

  const onRunCounterfactual = async () => {
    if (!canTest) {
      onAction?.('Requires operator role');
      return;
    }
    setBusy(true);
    try {
      const report = await fetchPolicyCounterfactual(draftRule ?? undefined, 14);
      if (!report) {
        onAction?.('Counterfactual simulation failed');
        return;
      }
      setCounterfactual(report as typeof counterfactual);
      onAction?.(String(report.summary || 'Counterfactual complete'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="policy-copilot-panel">
      <h3>Policy Copilot</h3>
      <div className="btn-row tab-row">
        <button
          type="button"
          className={tab === 'generate' ? '' : 'secondary'}
          onClick={() => setTab('generate')}
        >
          Generate + replay
        </button>
        <button
          type="button"
          className={tab === 'counterfactual' ? '' : 'secondary'}
          onClick={() => setTab('counterfactual')}
        >
          What-if replay
        </button>
      </div>
      {tab === 'generate' ? (
        <>
          <p className="hint">
            Describe a rule in plain language — Copilot generates YAML and runs mandatory corpus replay before staging.
          </p>
          <label className="policy-field">
            Policy goal
            <textarea
              className="policy-yaml"
              rows={3}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Block exfil to .env via read_file"
            />
          </label>
          <div className="btn-row">
            <button type="button" disabled={!canTest || busy} onClick={() => void onGenerate()}>
              {busy ? 'Generating…' : 'Generate + replay'}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="hint">
            Replay historical semantic audits against the current policy or a draft rule from Generate tab.
          </p>
          <div className="btn-row">
            <button type="button" disabled={!canTest || busy} onClick={() => void onRunCounterfactual()}>
              {busy ? 'Simulating…' : draftRule ? 'Simulate with draft rule' : 'Simulate baseline (14d)'}
            </button>
          </div>
          {counterfactual ? (
            <div className="copilot-replay-summary">
              <p>{counterfactual.summary}</p>
              <p className="hint">
                New blocks: {counterfactual.newBlocks ?? 0} · New passes: {counterfactual.newPasses ?? 0} · FP risk:{' '}
                {Math.round((counterfactual.fpRiskScore ?? 0) * 100)}%
              </p>
              {counterfactual.deltas?.length ? (
                <table className="data-table compact">
                  <thead>
                    <tr>
                      <th>Tool</th>
                      <th>Direction</th>
                      <th>Before</th>
                      <th>After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {counterfactual.deltas.slice(0, 10).map((d) => (
                      <tr key={d.id}>
                        <td>{d.toolName}</td>
                        <td>{d.direction}</td>
                        <td>{d.baselineAction}</td>
                        <td>{d.counterfactualAction}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </div>
          ) : null}
        </>
      )}
      {replay ? (
        <div className="copilot-replay-summary">
          <p>
            Replay: <strong>{replay.passed ?? 0}</strong> / {replay.total ?? 0} samples
            {replay.readyForReview ? (
              <span className="badge-ok"> · Ready for review</span>
            ) : (
              <span className="badge-warn">
                {' '}
                · Not ready{replay.blockReason ? `: ${replay.blockReason}` : ''}
              </span>
            )}
          </p>
          {replay.results?.length ? (
            <table className="data-table compact">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Tool</th>
                  <th>Expected</th>
                  <th>Actual</th>
                  <th>OK</th>
                </tr>
              </thead>
              <tbody>
                {replay.results.slice(0, 12).map((r) => (
                  <tr key={r.id}>
                    <td>{r.source}</td>
                    <td>{r.toolName}</td>
                    <td>{r.expected}</td>
                    <td>{r.actual}</td>
                    <td>{r.ok ? '✓' : '✗'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      ) : null}
      {yaml ? (
        <>
          <h4>Suggested YAML</h4>
          <pre className="code-block">{yaml}</pre>
          <p className="hint">Human accept only — paste into policy editor below after review.</p>
        </>
      ) : null}
    </section>
  );
}
