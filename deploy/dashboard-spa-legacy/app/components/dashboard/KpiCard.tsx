'use client';

import { useState } from 'react';

export type KpiVariant = 'default' | 'success' | 'warn' | 'danger';

export type KpiComparison = {
  deltaPct: number | null;
  deltaAbs: number;
  direction: 'up' | 'down' | 'flat';
  label?: string;
};

type Props = {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  delta?: string;
  comparison?: KpiComparison;
  explanation?: string;
  variant?: KpiVariant;
  sparkline?: React.ReactNode;
};

function formatComparison(c: KpiComparison): string {
  const prefix = c.label || 'vs prior window';
  if (c.deltaPct == null) {
    if (c.deltaAbs === 0) return `${prefix}: no change`;
    return `${prefix}: ${c.deltaAbs > 0 ? '+' : ''}${c.deltaAbs.toLocaleString()}`;
  }
  const sign = c.deltaPct > 0 ? '+' : '';
  return `${prefix}: ${sign}${c.deltaPct}%`;
}

export function KpiCard({
  label,
  value,
  unit,
  sub,
  delta,
  comparison,
  explanation,
  variant = 'default',
  sparkline,
}: Props) {
  const [open, setOpen] = useState(false);
  const comparisonText = comparison ? formatComparison(comparison) : delta;

  return (
    <article className={`kpi-card kpi-card-${variant}`}>
      <div className="kpi-card-head">
        <span className="kpi-card-label">{label}</span>
        {explanation ? (
          <button
            type="button"
            className="kpi-card-info"
            aria-expanded={open}
            aria-label={`Explain ${label}`}
            onClick={() => setOpen((v) => !v)}
          >
            ?
          </button>
        ) : null}
      </div>
      <p className="kpi-card-value">
        {value}
        {unit ? <span className="kpi-card-unit">{unit}</span> : null}
      </p>
      {comparisonText && comparison ? (
        <span
          className={`kpi-card-delta-chip kpi-card-delta-${comparison.direction}`}
          aria-label={comparisonText}
        >
          {comparisonText}
        </span>
      ) : comparisonText ? (
        <p className="kpi-card-delta">{comparisonText}</p>
      ) : null}
      {sub ? <p className="kpi-card-sub">{sub}</p> : null}
      {sparkline ? <div className="kpi-card-spark">{sparkline}</div> : null}
      {open && explanation ? <p className="kpi-card-detail">{explanation}</p> : null}
    </article>
  );
}
