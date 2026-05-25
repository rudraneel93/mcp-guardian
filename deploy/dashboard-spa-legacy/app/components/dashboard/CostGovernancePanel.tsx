'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  fetchCost,
  fetchCostBreakdown,
  fetchCostRecommendations,
  type CostRecommendation,
  type CostResponse,
} from '@/lib/guardian-api';
import {
  CHART_AXIS,
  CHART_COLORS,
  CHART_GRID,
  CHART_SERIES,
  formatAxisTime,
  formatUsd,
} from '@/lib/chartTheme';
import { DashboardSection } from './DashboardSection';
import { KpiCard } from './KpiCard';
import { ChartCard } from './ChartCard';
import { InsightsNarrativeRail } from './InsightsNarrativeRail';
import { DataTablePro, type Column } from './DataTablePro';
import { ChartTooltip } from './chart-kit';
import { useDashboardWindow } from './DashboardWindowContext';
import { useVisuals } from './VisualsProvider';

type Props = {
  refreshKey?: number;
  initialCost?: CostResponse | null;
};

type ServerRow = NonNullable<CostResponse['serverReports']>[number];
type ToolRow = { server: string; tool: string; calls: number; costUsd: number };

export function CostGovernancePanel({ refreshKey = 0, initialCost = null }: Props) {
  const { windowDays, window } = useDashboardWindow();
  const { costTimeseries, loading: visualsLoading } = useVisuals();
  const [cost, setCost] = useState<CostResponse | null>(initialCost);
  const [tools, setTools] = useState<ToolRow[]>([]);
  const [recommendations, setRecommendations] = useState<CostRecommendation[]>([]);
  const [loading, setLoading] = useState(!initialCost);

  const granularity = windowDays <= 7 ? 'hour' : 'day';

  const load = useCallback(async () => {
    setLoading(true);
    const [c, b, rec] = await Promise.all([
      fetchCost(windowDays),
      fetchCostBreakdown(windowDays),
      fetchCostRecommendations(windowDays),
    ]);
    setCost(c);
    setTools(b?.tools || []);
    setRecommendations(rec?.recommendations || []);
    setLoading(false);
  }, [windowDays]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const timeseries = useMemo(() => {
    const pivoted = costTimeseries?.pivoted ?? [];
    return pivoted.map((row) => ({
      ...row,
      bucket: formatAxisTime(String(row.bucket), granularity),
    }));
  }, [costTimeseries?.pivoted, granularity]);

  const servers = useMemo(() => {
    const names = new Set<string>();
    for (const row of costTimeseries?.pivoted ?? []) {
      for (const key of Object.keys(row)) {
        if (key !== 'bucket' && key !== 'total') names.add(key);
      }
    }
    return [...names];
  }, [costTimeseries?.pivoted]);

  const budgetPct =
    cost?.budgetUsd && cost.totalCost != null && cost.budgetUsd > 0
      ? Math.min(100, (cost.totalCost / cost.budgetUsd) * 100)
      : null;

  const serverColumns: Column<ServerRow>[] = [
    { key: 'name', header: 'Server', render: (r) => r.name, sortValue: (r) => r.name },
    {
      key: 'cost',
      header: 'Cost (USD)',
      render: (r) => formatUsd(r.cost),
      sortValue: (r) => r.cost,
    },
    { key: 'tokens', header: 'Tokens', render: (r) => r.tokens.toLocaleString(), sortValue: (r) => r.tokens },
    { key: 'trend', header: 'Trend', render: (r) => r.trend || '—' },
    { key: 'unpriced', header: 'Unpriced', render: (r) => r.unpriced ?? 0, sortValue: (r) => r.unpriced ?? 0 },
  ];

  const toolColumns: Column<ToolRow>[] = [
    { key: 'server', header: 'Server', render: (r) => r.server, sortValue: (r) => r.server },
    { key: 'tool', header: 'Tool', render: (r) => r.tool, sortValue: (r) => r.tool },
    { key: 'calls', header: 'Calls', render: (r) => r.calls, sortValue: (r) => r.calls },
    {
      key: 'costUsd',
      header: 'Cost (USD)',
      render: (r) => formatUsd(r.costUsd),
      sortValue: (r) => r.costUsd,
    },
  ];

  const toolChartData = useMemo(
    () =>
      tools.slice(0, 10).map((t) => ({
        label: `${t.server}:${t.tool}`.slice(0, 24),
        costUsd: t.costUsd,
      })),
    [tools],
  );

  const chartLoading = loading || visualsLoading;
  const costMeta = cost?.meta ?? costTimeseries?.meta;
  const costCmp = costTimeseries?.comparison?.totalCostUsd;

  if (!cost && !chartLoading) {
    return (
      <DashboardSection title="Cost governance" subtitle="Measured spend from proxy call_records">
        <p className="muted">No cost data — connect proxy history DB and route MCP traffic.</p>
      </DashboardSection>
    );
  }

  const utilVariant = budgetPct != null ? (budgetPct >= 100 ? 'danger' : budgetPct >= 75 ? 'warn' : 'success') : 'default';

  return (
    <div className="cost-governance-panel">
      <InsightsNarrativeRail scope="cost" refreshKey={refreshKey} />

      <DashboardSection
        title="Cost governance"
        subtitle={`FinOps view — ${window} measured spend`}
      >
        <div className="kpi-row">
          <KpiCard
            label="Total spend"
            value={cost?.totalCost != null ? formatUsd(cost.totalCost) : '—'}
            comparison={costCmp ? { ...costCmp, label: 'vs prior window' } : undefined}
            explanation="Sum of costUsd on intercepted MCP calls with pricing metadata."
          />
          <KpiCard
            label="Burn rate"
            value={cost?.burnRatePerHour != null ? formatUsd(cost.burnRatePerHour) : '—'}
            unit="/hr"
            explanation="Spend divided by observed traffic time span in history DB."
          />
          <KpiCard
            label="Projected monthly"
            value={cost?.projectedMonthly != null ? formatUsd(cost.projectedMonthly, 2) : '—'}
            explanation="Extrapolated from current burn rate over 30 days."
          />
          <KpiCard
            label="Pricing model"
            value={cost?.pricingModel?.split(' ')[0] || '—'}
            sub={cost?.pricingModel}
            explanation="Rate source used for unpriced call enrichment."
          />
        </div>

        {budgetPct != null && cost?.budgetUsd ? (
          <div className="budget-gauge dash-grid-span-12">
            <strong>
              Daily budget: ${cost.budgetUsd.toFixed(2)} ({budgetPct.toFixed(1)}% used)
            </strong>
            <div className="budget-gauge-bar">
              <div
                className={`budget-gauge-fill budget-gauge-fill-${utilVariant}`}
                style={{ width: `${Math.min(100, budgetPct)}%` }}
              />
            </div>
          </div>
        ) : null}

        {(cost?.budgetAlerts || []).map((a) => (
          <p key={a} className="alert">
            {a}
          </p>
        ))}

        <div className="dash-grid">
          <div className="dash-grid-span-8">
            <ChartCard
              title="Spend over time"
              subtitle="Cost stacked by MCP server (top 5 + Other)"
              loading={chartLoading}
              empty={timeseries.length === 0}
              meta={costMeta}
              sparse={costMeta?.sparse}
            >
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={timeseries}>
                  <CartesianGrid {...CHART_GRID} />
                  <XAxis dataKey="bucket" {...CHART_AXIS} interval="preserveStartEnd" />
                  <YAxis {...CHART_AXIS} tickFormatter={(v) => formatUsd(Number(v), 3)} />
                  <Tooltip content={<ChartTooltip valueFormatter={(v) => formatUsd(v)} />} />
                  {servers.map((srv, i) => (
                    <Area
                      key={srv}
                      type="monotone"
                      dataKey={srv}
                      stackId="1"
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                      fillOpacity={0.5}
                      name={srv}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
          <div className="dash-grid-span-4">
            <ChartCard
              title="Top tools by cost"
              subtitle="Focus optimization on highest USD drivers"
              loading={chartLoading}
              empty={toolChartData.length === 0}
              height={280}
              meta={costMeta}
            >
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={toolChartData} layout="vertical">
                  <CartesianGrid {...CHART_GRID} />
                  <XAxis type="number" {...CHART_AXIS} tickFormatter={(v) => formatUsd(Number(v), 2)} />
                  <YAxis type="category" dataKey="label" width={100} {...CHART_AXIS} />
                  <Tooltip content={<ChartTooltip valueFormatter={(v) => formatUsd(v)} />} />
                  <Bar dataKey="costUsd" fill={CHART_SERIES.cost} name="Cost">
                    {toolChartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>

        <div className="dash-grid">
          <div className="dash-grid-span-6">
            <DashboardSection title="By server" subtitle="Aggregate cost and token volume">
              <DataTablePro
                columns={serverColumns}
                rows={cost?.serverReports || []}
                rowKey={(r) => r.name}
                exportFilename="guardian-cost-by-server.csv"
              />
            </DashboardSection>
          </div>
          <div className="dash-grid-span-6">
            <DashboardSection title="By tool" subtitle={`Top tools in ${window}`}>
              <DataTablePro
                columns={toolColumns}
                rows={tools}
                rowKey={(r) => `${r.server}:${r.tool}`}
                exportFilename="guardian-cost-by-tool.csv"
              />
            </DashboardSection>
          </div>
        </div>

        {recommendations.length > 0 ? (
          <DashboardSection
            title="Optimization recommendations"
            subtitle="Policy suggestions from cost pattern analysis"
          >
            <ul className="cost-recommendations-list">
              {recommendations.map((r) => (
                <li key={r.ruleName} className="cost-recommendation-item">
                  <strong>{r.ruleName}</strong>
                  <span className="hint">
                    {r.reason} · est. savings {formatUsd(r.estimatedSavingsUsd, 2)} ·{' '}
                    {Math.round(r.confidence * 100)}% confidence
                  </span>
                  {r.description ? <p>{r.description}</p> : null}
                </li>
              ))}
            </ul>
          </DashboardSection>
        ) : null}
      </DashboardSection>
    </div>
  );
}
