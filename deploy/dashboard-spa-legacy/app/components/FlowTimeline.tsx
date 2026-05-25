'use client';

import { useEffect, useRef, useState } from 'react';
import type { FlowTimelineEntry } from '@/lib/flow-types';

type Props = {
  entries: FlowTimelineEntry[];
};

function formatTime(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function FlowTimeline({ entries }: Props) {
  const [autoScroll, setAutoScroll] = useState(true);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (autoScroll && listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [entries.length, autoScroll]);

  return (
    <div className="flow-timeline-wrap">
      <div className="filter-row">
        <label className="inline">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
          />
          Auto-scroll
        </label>
        <span className="hint">{entries.length} events (newest first)</span>
      </div>
      <ul ref={listRef} className="flow-timeline">
        <li className="flow-timeline-anchor" aria-hidden />
        {entries.length === 0 ? (
          <li className="events-empty">Waiting for agent activity…</li>
        ) : (
          entries.map((e) => (
            <li key={e.id} className={`flow-entry severity-${e.severity}`}>
              <div className="flow-entry-head">
                <span className="flow-time">{formatTime(e.timestamp)}</span>
                <span className="flow-ch">[{e.channel}]</span>
                <span className="flow-kind">{e.kind}</span>
              </div>
              <strong className="flow-title">{e.title}</strong>
              <p className="flow-summary">{e.summary}</p>
              {e.toolName || e.serverName ? (
                <p className="muted flow-meta">
                  {e.serverName ? `${e.serverName} · ` : ''}
                  {e.toolName || ''}
                  {e.requestId ? ` · req ${e.requestId}` : ''}
                  {typeof e.metadata?.confidence === 'number'
                    ? ` · confidence ${(e.metadata.confidence * 100).toFixed(0)}%`
                    : ''}
                </p>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
