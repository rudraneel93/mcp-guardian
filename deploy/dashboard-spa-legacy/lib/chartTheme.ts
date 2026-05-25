/** Shared Recharts styling for enterprise dashboard panels. */

export const CHART_SERIES = {
  allow: 'var(--chart-allow)',
  block: 'var(--chart-block)',
  warn: 'var(--chart-warn)',
  cost: 'var(--chart-cost)',
  neutral: 'var(--chart-neutral)',
  accent: 'var(--chart-accent)',
  purple: 'var(--chart-purple)',
  teal: 'var(--chart-teal)',
  orange: 'var(--chart-orange)',
} as const;

export const CHART_COLORS = [
  CHART_SERIES.accent,
  CHART_SERIES.allow,
  CHART_SERIES.block,
  CHART_SERIES.warn,
  CHART_SERIES.purple,
  CHART_SERIES.neutral,
  CHART_SERIES.teal,
  CHART_SERIES.orange,
] as const;

export const CHART_GRID = { stroke: 'var(--chart-grid)', strokeDasharray: '3 3' };
export const CHART_AXIS = { stroke: 'var(--chart-axis)', fontSize: 11, tickLine: false };
export const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'var(--chart-tooltip-bg)',
  border: '1px solid var(--chart-tooltip-border)',
  borderRadius: 8,
  color: 'var(--text)',
  fontSize: 12,
};

export const rechartsAxisProps = CHART_AXIS;
export const rechartsGridProps = CHART_GRID;
export const rechartsTooltipContentStyle = CHART_TOOLTIP_STYLE;

export type AxisGranularity = 'hour' | 'day';

export function formatAxisTime(iso: string, granularity: AxisGranularity = 'hour'): string {
  if (!iso) return '';
  if (granularity === 'day') {
    return iso.slice(5, 10);
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso.slice(5, 16).replace('T', ' ');
  }
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  return `${mm}-${dd} ${hh}:00`;
}

export function formatAxisTimeTooltip(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { timeZoneName: 'short' });
}

export function formatUsd(value: number, digits = 4): string {
  if (!Number.isFinite(value)) return '—';
  return `$${value.toFixed(digits)}`;
}

export function formatCount(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString();
}

export function formatPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '—';
  return `${value.toFixed(digits)}%`;
}

export function severityColor(score: number | null | undefined): string {
  if (score == null) return CHART_SERIES.neutral;
  if (score >= 80) return CHART_SERIES.allow;
  if (score >= 60) return CHART_SERIES.warn;
  return CHART_SERIES.block;
}

export function budgetUtilColor(pct: number): 'success' | 'warn' | 'danger' {
  if (pct >= 100) return 'danger';
  if (pct >= 75) return 'warn';
  return 'success';
}

export function topNBuckets<T extends { name: string; value: number }>(
  items: T[],
  n = 6,
  otherLabel = 'Other',
): T[] {
  if (items.length <= n) return items;
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, n);
  const rest = sorted.slice(n);
  const otherValue = rest.reduce((s, i) => s + i.value, 0);
  if (otherValue <= 0) return top;
  return [...top, { name: otherLabel, value: otherValue } as T];
}

export const CHART_MIN_HEIGHT = {
  area: 280,
  bar: 240,
  pie: 260,
  sparkline: 36,
} as const;
