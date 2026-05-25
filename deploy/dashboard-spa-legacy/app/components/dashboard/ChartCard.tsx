'use client';

import type { ReactNode } from 'react';
import type { ChartMeta } from '@/lib/guardian-api';
import { ChartSkeleton, ChartEmptyState, DataFreshnessBadge } from './chart-kit';

type Props = {
  title: string;
  subtitle?: string;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  emptyReason?: string;
  height?: number;
  meta?: ChartMeta | null;
  sparse?: boolean;
  ariaLabel?: string;
  children: ReactNode;
};

export function ChartCard({
  title,
  subtitle,
  loading,
  empty,
  emptyMessage,
  emptyReason,
  height = 280,
  meta,
  sparse,
  ariaLabel,
  children,
}: Props) {
  const sparseNote = sparse || meta?.sparse ? ' · Sparse traffic in selected window' : '';
  const fullSubtitle = subtitle ? `${subtitle}${sparseNote}` : sparseNote ? sparseNote.slice(3) : undefined;

  return (
    <article className="chart-card" aria-label={ariaLabel || title}>
      <header className="chart-card-head">
        <h3 className="chart-card-title">{title}</h3>
        {fullSubtitle ? <p className="chart-card-sub">{fullSubtitle}</p> : null}
      </header>
      <div className="chart-card-body" style={{ minHeight: height }}>
        {loading ? <ChartSkeleton height={height} /> : null}
        {!loading && empty ? (
          <ChartEmptyState message={emptyMessage} emptyReason={emptyReason ?? meta?.emptyReason} />
        ) : null}
        {!loading && !empty ? children : null}
      </div>
      {!loading && !empty && (meta || sparse) ? (
        <footer className="chart-card-foot">
          <DataFreshnessBadge meta={meta} sparse={sparse} />
        </footer>
      ) : null}
    </article>
  );
}
