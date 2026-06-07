'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchVisualsLive, type HealthResponse, type VisualsData } from '@/lib/guardian-api';
import { CHART_AXIS, CHART_COLORS, CHART_GRID, CHART_TOOLTIP_STYLE } from '@/lib/chartTheme';
import { DashboardSection } from './DashboardSection';
import { KpiCard } from './KpiCard';
import { ChartCard } from './ChartCard';
import { DataTablePro, type Column } from './DataTablePro';
import { computeReliabilityRiskMetrics } from '@/lib/advanced-analytics';
import { trackAdvancedAnalyticsEvent } from '@/lib/guardian-api';

type ServerRow = NonNullable<HealthResponse['serverReports']>[number];

type Props = {
  health: HealthResponse | null;
  refreshKey?: number;
};

export function HealthReliabilityPanel({ health, refreshKey = 0 }: Props) {
  const [visuals, setVisuals] = useState<VisualsData | null>(null);

  const loadVisuals = useCallback(async () => {
    const v = await fetchVisualsLive();
    setVisuals(v.ok ? v.data : null);
  }, []);

  useEffect(() => {
    void loadVisuals();
  }, [loadVisuals, refreshKey]);

  useEffect(() => {
    if (!health) return;
    const metrics = computeReliabilityRiskMetrics(health, visuals?.traffic?.byServer ?? []);
    void trackAdvancedAnalyticsEvent({
      feature: 'reliability_risk_index',
      metric: 'index',
      confidence: metrics.caveat.confidence,
      value: metrics.index,
    });
  }, [health, visuals?.traffic?.byServer, refreshKey]);

  if (!health) {
    return (
      <DashboardSection title="Health & reliability" subtitle="Upstream MCP server health checks">
        <p className="muted">No health data — connect proxy history DB.</p>
      </DashboardSection>
    );
  }

  const latencyChart = (visuals?.traffic?.byServer ?? []).map((s) => ({
    name: s.serverName,
    p50: s.latencyP50Ms ?? 0,
    p95: s.latencyP95Ms ?? 0,
  }));

  const columns: Column<ServerRow>[] = [
    { key: 'name', header: 'Server', render: (r) => r.name, sortValue: (r) => r.name },
    {
      key: 'latency',
      header: 'Latency (ms)',
      render: (r) => r.latency,
      sortValue: (r) => r.latency,
    },
    {
      key: 'successRate',
      header: 'Success %',
      render: (r) => (r.successRate != null ? `${r.successRate.toFixed(1)}%` : '—'),
      sortValue: (r) => r.successRate ?? 0,
    },
    { key: 'circuitBreaker', header: 'Circuit breaker', render: (r) => r.circuitBreaker },
    { key: 'tools', header: 'Tools', render: (r) => (r as { tools?: number }).tools ?? '—' },
  ];

  const atRisk = health.atRisk || [];
  const reliability = computeReliabilityRiskMetrics(health, visuals?.traffic?.byServer ?? []);

  return (
    <div className="health-reliability-panel">
      <DashboardSection
        title="Health & reliability"
        subtitle="Latency, success rate, and circuit breaker state per upstream MCP server"
      >
        <div className="kpi-row">
          <KpiCard
            label="Reliability risk index"
            value={reliability.index}
            variant={
              reliability.status === 'critical'
                ? 'danger'
                : reliability.status === 'watch'
                  ? 'warn'
                  : 'success'
            }
            sub={`Status: ${reliability.status} · confidence ${reliability.caveat.confidence}`}
            explanation="Composite index using p95 drift, success-rate gaps, and circuit-breaker state."
          />
          <KpiCard
            label="Avg latency"
            value={health.avgLatencyMs != null ? `${health.avgLatencyMs} ms` : health.avgLatency != null ? `${health.avgLatency} ms` : '—'}
            variant={health.avgLatencyMs != null && health.avgLatencyMs > 200 ? 'warn' : 'default'}
            explanation="Mean response latency across active servers."
          />
          <KpiCard
            label="Total tools"
            value={health.totalTools ?? '—'}
            explanation="Tools registered across monitored MCP servers."
          />
          <KpiCard
            label="At-risk servers"
            value={atRisk.length}
            variant={atRisk.length > 0 ? 'danger' : 'success'}
            sub={atRisk.length ? atRisk.join(', ') : 'None'}
            explanation="Servers with latency >200ms or success rate <70%."
          />
        </div>
        <p className="hint">
          Risk factors — p95 drift {reliability.p95DriftPct.toFixed(1)}%, success gap{' '}
          {reliability.successGapPct.toFixed(1)}%, open circuit-breakers {reliability.circuitBreakerOpenPct.toFixed(1)}%.
        </p>
        {reliability.caveat.confidence === 'low' ? (
          <p className="alert">
            Reliability risk confidence is low due to limited healthy sample coverage.
          </p>
        ) : null}

        <div className="dash-grid">
          <div className="dash-grid-span-8">
            <ChartCard
              title="Latency distribution"
              subtitle="p50 vs p95 — widening gap indicates tail latency issues"
              empty={latencyChart.length === 0}
            >
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={latencyChart}>
                  <CartesianGrid {...CHART_GRID} />
                  <XAxis dataKey="name" {...CHART_AXIS} />
                  <YAxis {...CHART_AXIS} unit=" ms" />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="p50" fill={CHART_COLORS[0]} name="p50" />
                  <Bar dataKey="p95" fill={CHART_COLORS[3]} name="p95" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
          <div className="dash-grid-span-4">
            <ChartCard
              title="Success rate"
              subtitle="Upstream tool call success percentage"
              empty={(health.serverReports?.length ?? 0) === 0}
            >
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={(health.serverReports || []).map((h) => ({
                    name: h.name,
                    rate: h.successRate ?? 0,
                  }))}
                >
                  <CartesianGrid {...CHART_GRID} />
                  <XAxis dataKey="name" {...CHART_AXIS} />
                  <YAxis domain={[0, 100]} {...CHART_AXIS} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="rate" name="Success %">
                    {(health.serverReports || []).map((h, i) => (
                      <Cell
                        key={h.name}
                        fill={(h.successRate ?? 100) < 70 ? CHART_COLORS[2] : CHART_COLORS[1]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>

        <DataTablePro
          columns={columns}
          rows={health.serverReports || []}
          rowKey={(r) => r.name}
          exportFilename="guardian-health.csv"
        />
      </DashboardSection>
    </div>
  );
}
