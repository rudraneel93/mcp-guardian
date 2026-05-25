'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  fetchPlainEnglishReport,
  fetchSwarmLatest,
  runSecuritySwarm,
  type PlainEnglishReport,
  type SwarmLatest,
} from '@/lib/guardian-api';
import { PlainEnglishReportView } from '@/app/components/PlainEnglishReportView';
import type { LiveDashboardState } from '@/app/hooks/useLiveDashboard';
import { StateBlock } from '../StateBlock';

export function LiveTestView({ live }: { live: LiveDashboardState }) {
  const [msg, setMsg] = useState('');
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<PlainEnglishReport | null>(null);
  const [latest, setLatest] = useState<SwarmLatest | null>(null);

  const swarm = live.swarm;
  const pipeline = live.ws.pipeline;
  const isRunning =
    running || swarm?.state === 'running' || pipeline.state === 'running';
  const progress = swarm?.progressPct ?? pipeline.progressPct ?? 0;
  const phaseLabel = swarm?.phaseLabel || pipeline.phaseLabel || '—';

  const loadResults = useCallback(async () => {
    const [pr, lat] = await Promise.all([
      fetchPlainEnglishReport(),
      fetchSwarmLatest(),
    ]);
    setReport(pr);
    setLatest(lat);
  }, []);

  const onRun = async (full: boolean) => {
    if (!live.apiOnline) {
      setMsg('API offline — start pnpm serve first');
      return;
    }
    if (full && !window.confirm('Full analysis can take 45–90 minutes. Continue?')) return;

    setMsg('');
    setRunning(true);
    const res = await runSecuritySwarm({ full });
    if (!res?.ok) {
      setMsg(res?.error || 'Failed to start test');
      setRunning(false);
      return;
    }
    setMsg(`Test started (job ${res.jobId?.slice(0, 8) ?? '…'})`);
    live.ws.syncSwarmJobStatus({
      jobId: res.jobId || '',
      state: 'running',
      phase: 'preflight',
      phaseLabel: 'Preflight checks',
      progressPct: 5,
      startedAt: res.startedAt || new Date().toISOString(),
      finishedAt: null,
      exitCode: null,
      error: null,
      analysisPath: '',
      logTail: '',
    });
    setRunning(false);
  };

  const done = swarm?.state === 'done' || pipeline.state === 'done';
  const failed = swarm?.state === 'failed' || pipeline.state === 'failed';

  useEffect(() => {
    if (done) void loadResults();
  }, [done, live.refreshTick, loadResults]);

  useEffect(() => {
    if (!live.apiOnline) return;
    void loadResults();
  }, [live.apiOnline, loadResults]);

  return (
    <StateBlock
      loading={!live.ready}
      error={live.statusError && !live.apiOnline ? live.statusText : null}
      onRetry={live.refresh}
    >
      <div className="gd-card">
        <h3>Security analysis test</h3>
        <p className="hint">
          Triggers a live security-swarm job on the API. Progress streams over SSE; results refresh
          automatically when complete.
        </p>
        <div className="gd-btn-row">
          <button
            type="button"
            className="gd-btn"
            disabled={isRunning || !live.apiOnline}
            onClick={() => void onRun(false)}
          >
            Run analysis
          </button>
          <button
            type="button"
            className="gd-btn secondary"
            disabled={isRunning || !live.apiOnline}
            onClick={() => void onRun(true)}
          >
            Full nightly
          </button>
          <button
            type="button"
            className="gd-btn secondary"
            disabled={isRunning}
            onClick={() => void live.refresh()}
          >
            Refresh
          </button>
        </div>
        {msg ? <p className="hint" style={{ marginTop: 12 }}>{msg}</p> : null}
      </div>

      {isRunning ? (
        <div className="gd-card">
          <h3>Running — {phaseLabel}</h3>
          <div className="gd-progress" aria-label={`Progress ${progress}%`}>
            <div className="gd-progress-fill" style={{ width: `${Math.min(100, progress)}%` }} />
          </div>
          <p className="hint">{progress}% complete · updates via live stream</p>
          {swarm?.logTail ? <pre className="gd-log">{swarm.logTail.slice(-800)}</pre> : null}
        </div>
      ) : null}

      {failed ? (
        <div className="gd-banner err" role="alert">
          Analysis failed: {swarm?.error || pipeline.error || 'Unknown error'}
        </div>
      ) : null}

      {done ? (
        <div className="gd-card">
          <h3>Results</h3>
          {report?.headline ? (
            <p className="hint" style={{ color: 'var(--text-bright)' }}>{report.headline}</p>
          ) : null}
          {report?.verdict ? (
            <p className="hint">
              Verdict: <strong>{report.verdict}</strong>
              {report.generatedAt
                ? ` · ${new Date(report.generatedAt).toLocaleString()}`
                : latest?.timestamp
                  ? ` · ${new Date(latest.timestamp).toLocaleString()}`
                  : ''}
            </p>
          ) : latest?.overall != null ? (
            <p className="hint">
              Overall: <strong>{latest.overall ? 'PASS' : 'FAIL'}</strong>
              {latest.timestamp ? ` · ${new Date(latest.timestamp).toLocaleString()}` : ''}
            </p>
          ) : (
            <p className="hint">Fetching artifacts…</p>
          )}
          {report?.sections?.length ? (
            <div style={{ marginTop: 16 }}>
              <PlainEnglishReportView report={report} />
            </div>
          ) : null}
          <div className="gd-btn-row" style={{ marginTop: 12 }}>
            <button type="button" className="gd-btn secondary" onClick={() => void loadResults()}>
              Reload results
            </button>
          </div>
        </div>
      ) : !isRunning ? (
        <div className="gd-state">
          <p>No test running. Tap Run analysis to start a live security swarm job.</p>
        </div>
      ) : null}

      {live.ws.entries.length > 0 ? (
        <div className="gd-card">
          <h3>Live event feed</h3>
          <ul className="gd-timeline">
            {live.ws.entries.slice(0, 12).map((e) => (
              <li key={e.id}>
                <time>{new Date(e.timestamp).toLocaleTimeString()}</time>
                <strong>{e.title}</strong> — {e.summary}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </StateBlock>
  );
}
