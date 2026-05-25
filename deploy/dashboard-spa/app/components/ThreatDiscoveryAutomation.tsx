'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  fetchPromotionStats,
  fetchThreatDiscoverySchedulerStatus,
  fetchThreatDiscoveryStatus,
  runAutoThreatResearch,
  runThreatLab,
  startThreatDiscoveryScheduler,
  stopThreatDiscoveryScheduler,
  type PromotionStats,
  type ThreatDiscoverySchedulerStatus,
  type ThreatDiscoveryStatus,
} from '@/lib/guardian-api';
import { hasPermission } from '@/lib/dashboard-roles';

type Props = {
  roles?: string[];
  onAction?: (msg: string) => void;
};

export function ThreatDiscoveryAutomation({ roles, onAction }: Props) {
  const canRun = hasPermission(roles, 'policy_test');
  const [scheduler, setScheduler] = useState<ThreatDiscoverySchedulerStatus | null>(null);
  const [tdStatus, setTdStatus] = useState<ThreatDiscoveryStatus | null>(null);
  const [promotionStats, setPromotionStats] = useState<PromotionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'threat-lab' | 'auto-research' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [sched, td, promo] = await Promise.all([
        fetchThreatDiscoverySchedulerStatus(),
        fetchThreatDiscoveryStatus(),
        fetchPromotionStats(),
      ]);
      setScheduler(sched);
      setTdStatus(td.status);
      if (td.error) setError(td.error);
      setPromotionStats(promo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load automation status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const interval = setInterval(() => void load(), 10_000);
    return () => clearInterval(interval);
  }, [load]);

  const startScheduler = async () => {
    if (!canRun) {
      onAction?.('Requires operator role');
      return;
    }
    await startThreatDiscoveryScheduler();
    void load();
  };

  const stopScheduler = async () => {
    if (!canRun) {
      onAction?.('Requires operator role');
      return;
    }
    await stopThreatDiscoveryScheduler();
    void load();
  };

  if (loading && !scheduler) {
    return <p className="hint">Loading automation panel…</p>;
  }

  if (error && !tdStatus) {
    return <p className="status status-error">{error}</p>;
  }

  const pipeline = tdStatus?.pipeline;
  const llm = tdStatus?.llm;
  const promo = promotionStats ?? {
    enabled: false,
    dailyQuota: { used: 0, max: 5 },
    totalPromoted: 0,
    lastPromotionAt: null,
  };

  return (
    <section className="threat-discovery-automation" aria-label="Automation Panel">
      <h3>Threat Discovery Automation</h3>
      <p className="hint">
        Scheduler, pipeline health, and corpus promotion — all metrics from live dashboard APIs (no synthetic placeholders).
      </p>

      <div className="card">
        <h4>Continuous Pipeline</h4>
        <div className="row" style={{ gap: '1rem', marginTop: '0.5rem' }}>
          <div className="col" style={{ flex: 1 }}>
            <strong>Status:</strong>{' '}
            <span className={scheduler?.running ? 'status-green' : 'status-gray'}>
              {scheduler?.running ? 'Running' : 'Stopped'}
            </span>
          </div>
          <div className="col" style={{ flex: 2 }}>
            <strong>Last run:</strong>{' '}
            {scheduler?.lastRunAt ? new Date(scheduler.lastRunAt).toLocaleString() : 'Never'}
            {scheduler?.lastRunAt != null && (
              <span
                className={scheduler.lastRunOk !== false ? 'status-green' : 'status-red'}
                style={{ marginLeft: '0.5rem' }}
              >
                {scheduler.lastRunOk !== false ? 'ok' : 'failed'}
              </span>
            )}
          </div>
          <div className="col" style={{ flex: 1 }}>
            <strong>Total:</strong> {scheduler?.totalRuns ?? 0} runs
          </div>
        </div>
        {scheduler?.message ? <p className="hint">{scheduler.message}</p> : null}
        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="primary btn-sm"
            onClick={() => void startScheduler()}
            disabled={!canRun || !!scheduler?.running}
          >
            Start scheduler
          </button>
          <button
            type="button"
            className="secondary btn-sm"
            onClick={() => void stopScheduler()}
            disabled={!canRun || !scheduler?.running}
          >
            Stop scheduler
          </button>
          <button type="button" className="secondary btn-sm" onClick={() => void load()}>
            Refresh
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: '0.75rem' }}>
        <h4>Pipeline Health</h4>
        <div className="row" style={{ gap: '1rem', marginTop: '0.5rem' }}>
          <div className="col" style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{pipeline?.queued ?? 0}</div>
            <small>Queued events</small>
          </div>
          <div className="col" style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              {pipeline?.writesThisHour ?? 0} / {pipeline?.maxPerHour ?? '—'}
            </div>
            <small>Writes (hour)</small>
          </div>
          <div className="col" style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{pipeline?.enabled ? 'on' : 'off'}</div>
            <small>Pipeline</small>
          </div>
        </div>
        <div style={{ marginTop: '0.5rem' }}>
          <strong>Sources:</strong>{' '}
          {pipeline?.sources
            ? Object.entries(pipeline.sources)
                .filter(([, v]) => v)
                .map(([k]) => k)
                .join(', ') || 'none'
            : '—'}
        </div>
        <div style={{ marginTop: '0.25rem' }}>
          <strong>LLM:</strong>{' '}
          {llm ? (
            <span className={llm.ok ? 'status-green' : 'status-red'}>
              {llm.ok ? `ready (${llm.model || 'default'})` : llm.reason || 'unavailable'}
            </span>
          ) : (
            <span className="muted">unknown</span>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '0.75rem' }}>
        <h4>Auto-corpus promotion</h4>
        <p className="hint">
          Promotions from adversarial harness into corpus/attacks/ (GUARDIAN_AUTO_CORPUS_PROMOTE on server).
        </p>
        <div className="row" style={{ gap: '1rem', marginTop: '0.5rem' }}>
          <div className="col" style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{promo.totalPromoted}</div>
            <small>Total promoted</small>
          </div>
          <div className="col" style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              {promo.dailyQuota.used} / {promo.dailyQuota.max}
            </div>
            <small>Daily quota</small>
          </div>
          <div className="col" style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{promo.enabled ? 'on' : 'off'}</div>
            <small>Enabled</small>
          </div>
        </div>
        {promo.lastPromotionAt ? (
          <div style={{ marginTop: '0.5rem' }}>
            <strong>Last promotion:</strong> {new Date(promo.lastPromotionAt).toLocaleString()}
          </div>
        ) : null}
        {promo.error ? <p className="status status-error">{promo.error}</p> : null}
      </div>

      <div className="card" style={{ marginTop: '0.75rem' }}>
        <h4>Quick actions</h4>
        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="primary btn-sm"
            disabled={!canRun || busy === 'threat-lab'}
            onClick={async () => {
              setBusy('threat-lab');
              const r = await runThreatLab('reactive');
              onAction?.(r.ok ? `Threat Lab job ${r.jobId || 'started'}` : r.error || 'Threat Lab failed');
              setBusy(null);
              void load();
            }}
          >
            {busy === 'threat-lab' ? 'Running…' : 'Run Threat Lab'}
          </button>
          <button
            type="button"
            className="primary btn-sm"
            disabled={!canRun || busy === 'auto-research'}
            onClick={async () => {
              setBusy('auto-research');
              const r = await runAutoThreatResearch();
              onAction?.(r.ok ? `Auto research ${r.jobId || 'started'}` : r.error || 'Auto research failed');
              setBusy(null);
              void load();
            }}
          >
            {busy === 'auto-research' ? 'Running…' : 'Run auto research'}
          </button>
        </div>
      </div>
    </section>
  );
}
