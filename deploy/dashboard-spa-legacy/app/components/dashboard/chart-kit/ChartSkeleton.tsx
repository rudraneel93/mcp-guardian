'use client';

type Props = {
  height?: number;
  variant?: 'bar' | 'area' | 'pie';
};

export function ChartSkeleton({ height = 280, variant = 'area' }: Props) {
  return (
    <div
      className={`chart-skeleton chart-skeleton-${variant}`}
      style={{ minHeight: height }}
      aria-hidden="true"
      aria-label="Loading chart"
    >
      <div className="chart-skeleton-bars">
        {[0.4, 0.65, 0.35, 0.8, 0.5, 0.7, 0.45].map((h, i) => (
          <span key={i} className="chart-skeleton-bar" style={{ height: `${h * 100}%` }} />
        ))}
      </div>
    </div>
  );
}
