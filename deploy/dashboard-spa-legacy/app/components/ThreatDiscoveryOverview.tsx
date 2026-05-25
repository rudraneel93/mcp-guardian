'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import type { ThreatDiscoveryStatus } from '@/lib/guardian-api';
import { ExplainableStatCard } from './ExplainableStatCard';
import { ThreatDiscoveryRunControls } from './ThreatDiscoveryRunControls';
import { THREAT_DISCOVERY_EXPLAINERS } from '@/lib/threat-discovery-copy';
import { CHART_AXIS, CHART_COLORS, CHART_GRID, CHART_SERIES } from '@/lib/chartTheme';
import { ChartTooltip, ChartLegend } from './dashboard/chart-kit';

type Props = {
  status: ThreatDiscoveryStatus | null;
  loading: boolean;
  loadError?: string;
  roles?: string[];
  onRunStarted?: (msg: string) => void;
  onRefresh?: () => void;
};

function toChartData(record: Record<string, number> | undefined) {
  if (!record) return [];
  return Object.entries(record).map(([name, value]) => ({ name, value }));
}

export function ThreatDiscoveryOverview({
  status,
  loading,
  loadError,
  roles,
  onRunStarted,
  onRefresh,
}: Props) {
  if (loading && !status) {
    return <p className="hint">Loading threat discovery status…</p>;
  }
  if (!status) {
    return (
      <p className="muted">
        {loadError ||
          'Threat Discovery status unavailable — ensure Pro license and dashboard API on port 4000.'}
      </p>
    );
  }

  const tl = status.threatLab.stats;
  const ac = status.autoCorpus.stats;
  const pipeline = status.pipeline;
  const sessionActive = status.provenance?.sessionActive ?? false;
  const sourceChart = toChartData({
    ...tl.bySource,
    ...Object.fromEntries(
      Object.entries(ac.bySource || {}).map(([k, v]) => [`auto:${k}`, v]),
    ),
  });
  const reviewChart = toChartData(tl.byReviewStatus);

  return (
    <div className="threat-discovery-overview">
      {!status.llm.ok ? (
        <p className="status status-error banner-inline">
          LLM unavailable: {status.llm.reason || 'Configure Ollama'}
        </p>
      ) : null}
      {!sessionActive ? (
        <p className="hint banner-inline live-data-banner">
          Batch Threat Lab / Auto Research results appear only after you run a job in this dashboard
          session. Stale or committed swarm artifacts are hidden.
        </p>
      ) : (
        <p className="hint banner-inline live-data-banner live-data-banner-ok">
          Session batch data · Threat Lab / Auto Research outputs from this dashboard session
        </p>
      )}
      {!status.features.threatLabEnabled && !status.features.autoResearchEnabled ? (
        <p className="hint banner-inline">
          Enable <code>SWARM_THREAT_LAB=true</code> and/or{' '}
          <code>GUARDIAN_THREAT_RESEARCH_AUTO=true</code> +{' '}
          <code>SWARM_THREAT_RESEARCH_AUTO=true</code> on the proxy server, or use Run buttons
          below (sets env for child job only).
        </p>
      ) : null}

      <div className="explainable-stat-grid">
        <ExplainableStatCard
          label="Pending review"
          value={tl.pending}
          sub={`${tl.total} total candidates`}
          explanation={THREAT_DISCOVERY_EXPLAINERS.pendingReview}
          variant={tl.pending > 0 ? 'warn' : 'default'}
        />
        <ExplainableStatCard
          label="Auto fixtures"
          value={ac.total}
          sub={`${ac.last24h} in last 24h`}
          explanation={THREAT_DISCOVERY_EXPLAINERS.autoFixtures}
        />
        <ExplainableStatCard
          label="LLM"
          value={status.llm.ok ? 'Healthy' : 'Offline'}
          sub={status.llm.model || '—'}
          explanation={THREAT_DISCOVERY_EXPLAINERS.llmStatus}
          variant={status.llm.ok ? 'success' : 'danger'}
        />
        <ExplainableStatCard
          label="Queue depth"
          value={pipeline.queued}
          sub={`${pipeline.writesThisHour}/${pipeline.maxPerHour} writes/hr`}
          explanation={THREAT_DISCOVERY_EXPLAINERS.queueDepth}
        />
        <ExplainableStatCard
          label="Dedupe store"
          value={status.processedFingerprints}
          explanation={THREAT_DISCOVERY_EXPLAINERS.processedFingerprints}
        />
        <ExplainableStatCard
          label="Avg confidence"
          value={tl.total > 0 ? `${(tl.avgConfidence * 100).toFixed(0)}%` : '—'}
          sub="Threat Lab candidates"
          explanation="Mean LLM confidence across pending and reviewed Threat Lab candidates."
        />
      </div>

      <ThreatDiscoveryRunControls
        roles={roles}
        status={status}
        onRunStarted={onRunStarted}
        onRefresh={onRefresh}
      />

      <div className="infra-charts-grid">
        <div className="infra-chart-card">
          <h5>Detection sources</h5>
          {sourceChart.length === 0 ? (
            <p className="muted">No candidates or auto writes yet.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={sourceChart} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={70} label={false}>
                    {sourceChart.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <ChartLegend
                items={sourceChart.map((s, i) => ({
                  key: s.name,
                  label: s.name,
                  color: CHART_COLORS[i % CHART_COLORS.length],
                }))}
              />
            </>
          )}
        </div>
        <div className="infra-chart-card">
          <h5>Review status (Threat Lab)</h5>
          {reviewChart.length === 0 ? (
            <p className="muted">No Threat Lab candidates.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={reviewChart}>
                <CartesianGrid {...CHART_GRID} />
                <XAxis dataKey="name" {...CHART_AXIS} />
                <YAxis {...CHART_AXIS} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" fill={CHART_SERIES.accent} name="Count" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
