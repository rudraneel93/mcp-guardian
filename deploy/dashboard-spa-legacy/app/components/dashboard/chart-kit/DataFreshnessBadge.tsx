'use client';

import { useEffect, useState } from 'react';
import type { ChartMeta } from '@/lib/guardian-api';

type Props = {
  meta?: ChartMeta | null;
  generatedAt?: string;
  recordCount?: number;
  window?: string;
  sparse?: boolean;
};

function formatRelative(iso: string): string {
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return '';
  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}

export function DataFreshnessBadge({ meta, generatedAt, recordCount, window: windowLabel, sparse }: Props) {
  const [relative, setRelative] = useState('');

  const at = meta?.generatedAt ?? generatedAt;
  const count = meta?.recordCount ?? recordCount;
  const win = meta?.window ?? windowLabel;
  const isSparse = meta?.sparse ?? sparse;

  useEffect(() => {
    if (!at) return;
    const tick = () => setRelative(formatRelative(at));
    tick();
    const id = globalThis.setInterval(tick, 15_000);
    return () => globalThis.clearInterval(id);
  }, [at]);

  if (!at && count == null && !win) return null;

  const parts: string[] = [];
  if (relative) parts.push(`Updated ${relative}`);
  if (count != null) parts.push(`${count.toLocaleString()} records`);
  if (win) parts.push(`${win} window`);
  if (isSparse) parts.push('sparse traffic');

  return (
    <p className="chart-freshness-badge" aria-live="polite">
      {parts.join(' · ')}
    </p>
  );
}
