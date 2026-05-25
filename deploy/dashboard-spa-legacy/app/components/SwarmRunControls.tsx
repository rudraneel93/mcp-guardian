'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  downloadSwarmReport,
  fetchSwarmLiveSession,
  fetchSwarmStatus,
  runSecuritySwarm,
  type SwarmJobStatus,
} from '@/lib/guardian-api';
import { hasPermission } from '@/lib/dashboard-roles';
import type { PipelineState } from '@/lib/flow-types';

const POLL_MS = 2000;

type Props = {
  roles?: string[];
  pipeline?: PipelineState;
  onMessage?: (msg: string) => void;
  onSwarmStatus?: (job: SwarmJobStatus) => void;
  showDownload?: boolean;
};

export function SwarmRunControls({
  roles,
  pipeline,
  onMessage,
  onSwarmStatus,
  showDownload = true,
}: Props) {
  const canRun = hasPermission(roles, 'policy_test');
  const [status, setStatus] = useState<SwarmJobStatus | null>(null);
  const [msg, setMsg] = useState('');
  const [liveFailures, setLiveFailures] = useState<string[]>([]);
  const pollRef = useRef<number | null>(null);

  const setActionMsg = useCallback(
    (text: string) => {
      setMsg(text);
      onMessage?.(text);
    },
    [onMessage],
  );

  const refreshStatus = useCallback(async () => {
    const st = await fetchSwarmStatus();
    if (st) {
      setStatus(st);
      onSwarmStatus?.(st);
    }
    return st;
  }, [onSwarmStatus]);

  useEffect(() => {
    void refreshStatus();
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [refreshStatus]);

  useEffect(() => {
    if (pipeline?.state !== 'failed' && status?.state !== 'failed') {
      setLiveFailures([]);
      return;
    }
    void (async () => {
      const live = await fetchSwarmLiveSession();
      const failed = (live?.proxyResults || [])
        .filter((r) => !r.ok)
        .map(
          (r) =>
            `${r.scenario}: expected ${r.expected}, got ${r.actual}${r.rule ? ` (${r.rule})` : ''}`,
        );
      setLiveFailures(failed);
    })();
  }, [pipeline?.state, status?.state, status?.phase]);

  const running =
    pipeline?.state === 'running' || status?.state === 'running';
  const done = pipeline?.state === 'done' || status?.state === 'done';

  useEffect(() => {
    if (!running) {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
      if (status?.state === 'done' || pipeline?.state === 'done') void refreshStatus();
      return;
    }
    if (pollRef.current) return;
    pollRef.current = window.setInterval(() => void refreshStatus(), POLL_MS);
    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [running, status?.state, pipeline?.state, refreshStatus]);

  const onRun = async (full: boolean) => {
    if (!canRun) {
      setActionMsg('Requires operator role (policy_test)');
      return;
    }
    if (full && !window.confirm('Full nightly analysis can take 45–90 minutes. Continue?')) {
      return;
    }
    setActionMsg('');
    const res = await runSecuritySwarm({ full });
    if (!res?.ok) {
      setActionMsg(res?.error || 'Failed to start analysis');
      return;
    }
    onSwarmStatus?.({
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
    setActionMsg('Analysis started — watch the pipeline and timeline below.');
    const st = await refreshStatus();
    if (st?.state !== 'running') {
      setActionMsg(
        'Start requested — waiting for job (if stuck, run pnpm build and restart dashboard:proxy)',
      );
    }
    if (pollRef.current == null) {
      pollRef.current = window.setInterval(() => void refreshStatus(), POLL_MS);
    }
  };

  const phaseLabel = status?.phaseLabel || pipeline?.phaseLabel;
  const progressPct = status?.progressPct ?? pipeline?.progressPct ?? 0;

  return (
    <div className="swarm-run-controls">
      <div className="btn-row">
        <button type="button" disabled={running || !canRun} onClick={() => void onRun(false)}>
          Run full security analysis
        </button>
        <button
          type="button"
          className="secondary"
          disabled={running || !canRun}
          onClick={() => void onRun(true)}
        >
          Full nightly (~45–90 min)
        </button>
        {showDownload && done ? (
          <button type="button" className="secondary" onClick={() => void downloadSwarmReport()}>
            Download analysis.txt
          </button>
        ) : null}
      </div>
      {!canRun ? (
        <p className="hint">Sign in with operator role to run analysis.</p>
      ) : null}
      {msg ? <p className="action-msg">{msg}</p> : null}
      {running && phaseLabel ? (
        <p className="hint">
          Running: {phaseLabel} ({progressPct}%)
          {status?.logTail ? (
            <>
              <pre className="code-block log-tail">{status.logTail.slice(-600)}</pre>
            </>
          ) : null}
        </p>
      ) : null}
      {status?.state === 'failed' && status.error ? (
        <p className="status status-error" role="alert">
          Analysis failed: {status.error}
        </p>
      ) : null}
      {liveFailures.length > 0 ? (
        <div className="live-failures" role="alert">
          <p className="status status-error">
            <strong>Live MCP scenario failures</strong> (re-run after <code>pnpm build</code>):
          </p>
          <ul>
            {liveFailures.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {liveFailures.some((l) => l.includes('semantic-calibration-probe')) ? (
            <p className="hint">
              Remove stale probe: current repo no longer includes <code>semantic-calibration-probe</code>.
              Restart <code>dashboard:proxy</code> and run analysis again.
            </p>
          ) : null}
        </div>
      ) : null}
      {done && !running ? (
        <p className="hint success-hint">Analysis complete — summary, visuals, and report appear below.</p>
      ) : null}
    </div>
  );
}
