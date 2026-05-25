'use client';

type LegendItem = {
  key: string;
  label: string;
  color: string;
};

type Props = {
  items: LegendItem[];
  className?: string;
};

export function ChartLegend({ items, className = '' }: Props) {
  if (!items.length) return null;
  return (
    <ul className={`chart-legend ${className}`.trim()} aria-label="Chart legend">
      {items.map((item) => (
        <li key={item.key} className="chart-legend-item">
          <span className="chart-legend-swatch" style={{ background: item.color }} />
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
