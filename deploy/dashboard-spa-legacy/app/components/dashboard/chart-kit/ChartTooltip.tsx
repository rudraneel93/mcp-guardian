'use client';

import type { TooltipProps } from 'recharts';
import { formatAxisTimeTooltip, formatCount, formatUsd } from '@/lib/chartTheme';

type ValueType = number | string;

type Props = TooltipProps<ValueType, string> & {
  valueFormatter?: (value: number, name: string) => string;
  labelFormatter?: (label: string) => string;
};

export function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
  labelFormatter,
}: Props) {
  if (!active || !payload?.length) return null;

  const displayLabel = labelFormatter
    ? labelFormatter(String(label ?? ''))
    : formatAxisTimeTooltip(String(label ?? ''));

  return (
    <div className="chart-tooltip" role="tooltip">
      {displayLabel ? <p className="chart-tooltip-label">{displayLabel}</p> : null}
      <ul className="chart-tooltip-list">
        {payload.map((entry) => {
          const raw = Number(entry.value);
          const name = String(entry.name ?? entry.dataKey ?? '');
          const formatted = valueFormatter
            ? valueFormatter(raw, name)
            : Number.isFinite(raw) && name.toLowerCase().includes('cost')
              ? formatUsd(raw)
              : formatCount(raw);
          return (
            <li key={name} className="chart-tooltip-row">
              <span
                className="chart-tooltip-swatch"
                style={{ background: entry.color || 'var(--chart-accent)' }}
              />
              <span className="chart-tooltip-name">{name}</span>
              <span className="chart-tooltip-value">{formatted}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
