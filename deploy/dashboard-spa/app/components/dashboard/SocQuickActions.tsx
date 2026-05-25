'use client';

import { useState } from 'react';
import {
  pollAiThreats,
  runAiLearningCycle,
  runThreatLab,
  runAutoThreatResearch,
} from '@/lib/guardian-api';
import { hasPermission } from '@/lib/dashboard-roles';

type Props = {
  roles?: string[];
  onAction?: (msg: string) => void;
  onOpenThreatDiscovery?: () => void;
  lastUpdated?: string | null;
};

export function SocQuickActions({
  roles,
  onAction,
  onOpenThreatDiscovery,
  lastUpdated,
}: Props) {
  const canOperate = hasPermission(roles, 'policy_test');
  const canAi = hasPermission(roles, 'ai');
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (label: string, fn: () => Promise<{ ok?: boolean; error?: string }>) => {
    setBusy(label);
    try {
      const res = await fn();
      onAction?.(res.ok !== false && !res.error ? `${label} started` : res.error || `${label} failed`);
    } catch (e) {
      onAction?.(e instanceof Error ? e.message : `${label} failed`);
    } finally {
      setBusy(null);
    }
  };

  const freshness =
    lastUpdated && !Number.isNaN(new Date(lastUpdated).getTime())
      ? `Metrics updated ${new Date(lastUpdated).toLocaleString()}`
      : 'Metrics refresh on each poll from proxy call_records';

  return (
    <section className="soc-quick-actions card" aria-label="SOC quick actions">
      <div className="soc-quick-actions-head">
        <h3>Operations</h3>
        <span className="hint">{freshness}</span>
      </div>
      <div className="btn-row soc-quick-actions-row">
        {onOpenThreatDiscovery ? (
          <button type="button" className="secondary" onClick={onOpenThreatDiscovery}>
            Open Threat Discovery
          </button>
        ) : null}
        {canOperate ? (
          <>
            <button
              type="button"
              className="primary"
              disabled={!!busy}
              onClick={() =>
                void run('Threat Lab', async () => {
                  const r = await runThreatLab('reactive');
                  return { ok: r.ok, error: r.error };
                })
              }
            >
              {busy === 'Threat Lab' ? 'Starting…' : 'Run Threat Lab'}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={!!busy}
              onClick={() =>
                void run('Auto research', async () => {
                  const r = await runAutoThreatResearch();
                  return { ok: r.ok, error: r.error };
                })
              }
            >
              {busy === 'Auto research' ? 'Starting…' : 'Run auto research'}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={!!busy}
              onClick={async () => {
                setBusy('Learning cycle');
                try {
                  const r = await runAiLearningCycle();
                  onAction?.(
                    r.ok
                      ? `Learning cycle: ${r.suggestionCount ?? 0} suggestions, ${r.autoAppliedCount ?? 0} auto-applied`
                      : r.error || 'Learning cycle failed',
                  );
                } catch (e) {
                  onAction?.(e instanceof Error ? e.message : 'Learning cycle failed');
                } finally {
                  setBusy(null);
                }
              }}
            >
              {busy === 'Learning cycle' ? 'Running…' : 'Run AI learning cycle'}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={!!busy}
              onClick={() =>
                void run('Threat intel poll', async () => {
                  const r = await pollAiThreats();
                  if (r.ok && r.status) {
                    onAction?.(`Threat feeds refreshed (${r.status.threats} IDs)`);
                    return { ok: true };
                  }
                  return { ok: false, error: r.error };
                })
              }
            >
              {busy === 'Threat intel poll' ? 'Polling…' : 'Poll threat feeds'}
            </button>
          </>
        ) : (
          <span className="hint">Operator role required for Threat Lab, learning cycle, and feed poll.</span>
        )}
        {canAi && !canOperate ? (
          <span className="hint">Some actions need operator; rollback stays under Admin → Enterprise AI.</span>
        ) : null}
      </div>
    </section>
  );
}
