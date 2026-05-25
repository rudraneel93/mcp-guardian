'use client';

import { useState } from 'react';
import { runThreatLab, runAutoThreatResearch, type ThreatDiscoveryStatus } from '@/lib/guardian-api';
import { hasPermission } from '@/lib/dashboard-roles';

type Props = {
  roles?: string[];
  status: ThreatDiscoveryStatus | null;
  onRunStarted?: (msg: string) => void;
  onRefresh?: () => void;
};

export function ThreatDiscoveryRunControls({
  roles,
  status,
  onRunStarted,
  onRefresh,
}: Props) {
  const canRun = hasPermission(roles, 'policy_test');
  const [mode, setMode] = useState<'reactive' | 'proactive'>('reactive');
  const [busy, setBusy] = useState<'threat-lab' | 'auto-research' | null>(null);

  const llmOk = status?.llm?.ok ?? false;
  const tlJob = status?.jobs?.threatLab;
  const arJob = status?.jobs?.autoResearch;
  const tlRunning = tlJob?.state === 'running';
  const arRunning = arJob?.state === 'running';

  const runTl = async () => {
    if (!canRun || tlRunning) return;
    setBusy('threat-lab');
    try {
      const res = await runThreatLab(mode);
      if (res.ok) {
        onRunStarted?.(`Threat Lab started (${mode})`);
        onRefresh?.();
      } else {
        onRunStarted?.(res.error || 'Threat Lab failed to start');
      }
    } finally {
      setBusy(null);
    }
  };

  const runAr = async () => {
    if (!canRun || arRunning) return;
    setBusy('auto-research');
    try {
      const res = await runAutoThreatResearch();
      if (res.ok) {
        onRunStarted?.('Auto threat research started');
        onRefresh?.();
      } else {
        onRunStarted?.(res.error || 'Auto research failed to start');
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="threat-run-controls">
      <h4>Run discovery</h4>
      {!canRun ? (
        <p className="hint">Operator role required to trigger discovery jobs.</p>
      ) : null}
      {!llmOk ? (
        <p className="status status-error">
          LLM offline: {status?.llm?.reason || 'Start Ollama and set GUARDIAN_LLM_ENABLED=true'}
        </p>
      ) : null}
      <div className="threat-run-row">
        <div className="threat-run-block">
          <label htmlFor="tl-mode">Threat Lab mode</label>
          <select
            id="tl-mode"
            value={mode}
            disabled={!canRun || tlRunning}
            onChange={(e) => setMode(e.target.value as 'reactive' | 'proactive')}
          >
            <option value="reactive">Reactive (bypass-driven)</option>
            <option value="proactive">Proactive (corpus-seeded)</option>
          </select>
          <button
            type="button"
            className="primary"
            disabled={!canRun || !llmOk || tlRunning || busy === 'threat-lab'}
            onClick={() => void runTl()}
          >
            {tlRunning || busy === 'threat-lab' ? 'Running…' : 'Run Threat Lab'}
          </button>
          {tlJob && tlJob.state !== 'idle' ? (
            <p className="hint job-status">
              {tlJob.state}: {tlJob.phaseLabel || tlJob.phase}
              {tlJob.logTail ? ` · ${tlJob.logTail.split('\n').slice(-1)[0]?.slice(0, 80)}` : ''}
            </p>
          ) : null}
        </div>
        <div className="threat-run-block">
          <p className="hint">
            Auto research writes adv fixtures directly (requires GUARDIAN_THREAT_RESEARCH_AUTO +
            SWARM_THREAT_RESEARCH_AUTO on server).
          </p>
          <button
            type="button"
            className="secondary"
            disabled={!canRun || !llmOk || arRunning || busy === 'auto-research'}
            onClick={() => void runAr()}
          >
            {arRunning || busy === 'auto-research' ? 'Running…' : 'Run Auto Research'}
          </button>
          {arJob && arJob.state !== 'idle' ? (
            <p className="hint job-status">
              {arJob.state}: {arJob.phaseLabel || arJob.phase}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
