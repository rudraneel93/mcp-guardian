'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  fetchTenantModelReadiness,
  fetchTenantModelTrain,
  fetchTenantModelTrainStatus,
  type TenantModelExportResponse,
  type TenantModelReadinessResponse,
  type TenantModelTrainStatus,
} from '@/lib/guardian-api';
import { hasPermission } from '@/lib/dashboard-roles';

type Props = {
  roles?: string[];
  refreshTick?: number;
  onAction?: (msg: string) => void;
};

export function TenantLoraPanel({ roles, refreshTick = 0, onAction }: Props) {
  const canAi = hasPermission(roles, 'ai');
  const [readiness, setReadiness] = useState<TenantModelReadinessResponse | null>(null);
  const [exportResult, setExportResult] = useState<TenantModelExportResponse | null>(null);
  const [trainStatus, setTrainStatus] = useState<TenantModelTrainStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [ready, job] = await Promise.all([
      fetchTenantModelReadiness(),
      fetchTenantModelTrainStatus(),
    ]);
    setReadiness(ready);
    setTrainStatus(job);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshTick]);

  useEffect(() => {
    if (trainStatus?.state !== 'running') return;
    const t = window.setInterval(() => void refresh(), 2000);
    return () => window.clearInterval(t);
  }, [trainStatus?.state, refresh]);

  const pct =
    readiness && readiness.minRequired > 0
      ? Math.min(100, Math.round((readiness.labeledCount / readiness.minRequired) * 100))
      : 0;

  const onExport = async () => {
    if (!canAi) {
      onAction?.('Requires admin/ai role');
      return;
    }
    setBusy(true);
    try {
      const result = await fetchTenantModelTrain('export');
      if (result && 'exportPath' in result) {
        setExportResult(result);
        onAction?.(`Exported ${result.rowsExported} training rows`);
      }
      await refresh();
    } catch (e) {
      onAction?.(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  const onTrain = async () => {
    if (!canAi) {
      onAction?.('Requires admin/ai role');
      return;
    }
    setBusy(true);
    try {
      await fetchTenantModelTrain('train');
      onAction?.('LoRA train job queued');
      await refresh();
    } catch (e) {
      onAction?.(e instanceof Error ? e.message : 'Train failed');
    } finally {
      setBusy(false);
    }
  };

  const routingSource = readiness?.routing?.source ?? 'default';
  const routingModel = readiness?.routing?.model;

  return (
    <article className="enterprise-ai-card enterprise-ai-card-wide">
      <h3>Tenant LoRA semantic model</h3>
      <p className="hint">
        Per-tenant classifier fine-tuned from labeled semantic audit outcomes — routes async semantic audits when
        registered.
      </p>

      {!readiness ? (
        <p className="muted">Loading readiness…</p>
      ) : (
        <>
          <div className="lora-progress-row">
            <div className="lora-progress-bar" aria-label="Label progress">
              <div className="lora-progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="hint">
              {readiness.labeledCount} / {readiness.minRequired} labeled rows ({pct}%)
            </span>
          </div>
          <p className="insight-callout-list">{readiness.message}</p>
          <p className="hint">
            Model: <code>{readiness.modelName}</code> · Routing:{' '}
            <span className="badge-role">{routingSource}</span>
            {routingModel ? ` (${routingModel})` : ''}
          </p>

          <div className="btn-row">
            <button type="button" disabled={!canAi || busy} onClick={() => void onExport()}>
              Export training data
            </button>
            <button
              type="button"
              className="secondary"
              disabled={!canAi || busy || !readiness.ready}
              onClick={() => void onTrain()}
            >
              Register model (Ollama)
            </button>
          </div>

          {!readiness.ready ? (
            <p className="muted">
              Label semantic outcomes in the AI copilot tab (TP/FP) to unlock LoRA training.
            </p>
          ) : null}

          {exportResult ? (
            <details open className="lora-export-details">
              <summary>Last export</summary>
              <ul className="insight-callout-list">
                <li>JSONL: <code>{exportResult.exportPath}</code></li>
                <li>Modelfile: <code>{exportResult.modelfilePath}</code></li>
                <li>Rows: {exportResult.rowsExported}</li>
              </ul>
              <p className="hint">
                Enable routing: <code>{exportResult.envHint}</code>
              </p>
            </details>
          ) : null}

          {trainStatus && trainStatus.state !== 'idle' ? (
            <p className={`hint ${trainStatus.state === 'failed' ? 'status-error' : ''}`}>
              Train job {trainStatus.state}
              {trainStatus.error ? `: ${trainStatus.error}` : ''}
            </p>
          ) : null}
        </>
      )}
    </article>
  );
}
