'use client';

import type { LiveDashboardState } from '@/app/hooks/useLiveDashboard';
import { StateBlock } from '../StateBlock';

export function OverviewView({ live }: { live: LiveDashboardState }) {
  const m = live.metrics;
  const loading = !live.ready;
  const error = live.statusError && !live.apiOnline ? live.statusText : null;

  const total = m?.totalRequests ?? 0;
  const blocked = m?.blockedRequests ?? 0;
  const passed = m?.passedRequests ?? Math.max(0, total - blocked);
  const blockPct = total > 0 ? Math.round((blocked / total) * 100) : 0;

  return (
    <StateBlock loading={loading} error={error} onRetry={live.refresh}>
      <section className="gd-section">
        <div className="gd-section-title">Live metrics (7d)</div>
        <div className="gd-kpi-grid">
          <div className="gd-kpi">
            <div className="gd-kpi-label">Requests</div>
            <div className="gd-kpi-value">{total.toLocaleString()}</div>
          </div>
          <div className="gd-kpi">
            <div className="gd-kpi-label">Blocked</div>
            <div className="gd-kpi-value" style={{ color: 'var(--red)' }}>
              {blocked.toLocaleString()}
            </div>
            <div className="gd-kpi-sub">{blockPct}% block rate</div>
          </div>
          <div className="gd-kpi">
            <div className="gd-kpi-label">Passed</div>
            <div className="gd-kpi-value" style={{ color: 'var(--green)' }}>
              {passed.toLocaleString()}
            </div>
          </div>
          <div className="gd-kpi">
            <div className="gd-kpi-label">Latency</div>
            <div className="gd-kpi-value">{m?.avgLatencyMs ?? 0}ms</div>
          </div>
        </div>
      </section>

      {total === 0 ? (
        <div className="gd-banner">
          No proxy traffic in the history DB yet. Run <code>pnpm live:test</code> or point your MCP
          client through the Guardian proxy, then refresh.
        </div>
      ) : null}

      <section className="gd-section">
        <div className="gd-section-title">Posture</div>
        <div className="gd-kpi-grid">
          <div className="gd-kpi">
            <div className="gd-kpi-label">Security score</div>
            <div className="gd-kpi-value">
              {live.security?.overallScore != null ? live.security.overallScore : '—'}
            </div>
          </div>
          <div className="gd-kpi">
            <div className="gd-kpi-label">Health</div>
            <div className="gd-kpi-value">{live.health?.overallStatus ?? '—'}</div>
          </div>
          <div className="gd-kpi">
            <div className="gd-kpi-label">Active servers</div>
            <div className="gd-kpi-value">{m?.activeServers ?? 0}</div>
          </div>
          <div className="gd-kpi">
            <div className="gd-kpi-label">Updated</div>
            <div className="gd-kpi-value" style={{ fontSize: '0.85rem' }}>
              {m?.lastUpdated ? new Date(m.lastUpdated).toLocaleTimeString() : '—'}
            </div>
          </div>
        </div>
      </section>
    </StateBlock>
  );
}
