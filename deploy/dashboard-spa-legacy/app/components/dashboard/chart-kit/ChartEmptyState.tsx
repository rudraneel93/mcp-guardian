'use client';

type Props = {
  title?: string;
  message?: string;
  emptyReason?: string;
};

export function ChartEmptyState({
  title = 'No data in selected window',
  message = 'Route traffic through the proxy to populate charts.',
  emptyReason,
}: Props) {
  return (
    <div className="chart-empty-state" role="status">
      <p className="chart-empty-title">{title}</p>
      <p className="chart-empty-message">{emptyReason || message}</p>
    </div>
  );
}
