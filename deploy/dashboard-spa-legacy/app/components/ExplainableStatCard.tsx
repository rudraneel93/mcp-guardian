'use client';

import { useState } from 'react';

type Props = {
  label: string;
  value: string | number;
  sub?: string;
  explanation: string;
  variant?: 'default' | 'success' | 'warn' | 'danger';
};

export function ExplainableStatCard({
  label,
  value,
  sub,
  explanation,
  variant = 'default',
}: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`explainable-stat explainable-stat-${variant}`}>
      <div className="explainable-stat-head">
        <span className="explainable-stat-label">{label}</span>
        <button
          type="button"
          className="explainable-stat-info"
          aria-expanded={open}
          aria-label={`Explain ${label}`}
          onClick={() => setOpen((v) => !v)}
        >
          ?
        </button>
      </div>
      <p className="explainable-stat-value">{value}</p>
      {sub ? <p className="explainable-stat-sub">{sub}</p> : null}
      {open ? <p className="explainable-stat-detail">{explanation}</p> : null}
    </div>
  );
}
