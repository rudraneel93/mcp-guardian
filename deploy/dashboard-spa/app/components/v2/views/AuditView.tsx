'use client';

import type { LiveDashboardState } from '@/app/hooks/useLiveDashboard';
import { StateBlock } from '../StateBlock';

export function AuditView({ live }: { live: LiveDashboardState }) {
  const events = live.audit?.events ?? [];
  const loading = !live.ready;
  const error = live.statusError && !live.apiOnline ? live.statusText : null;

  return (
    <StateBlock
      loading={loading}
      error={error}
      empty={events.length === 0 && live.apiOnline ? 'No audit events in the selected window.' : null}
      onRetry={live.refresh}
    >
      <div className="gd-card">
        <h3>Live audit log</h3>
        <p className="hint">
          {live.audit?.total ?? 0} events · {live.audit?.blocked ?? 0} blocked ·{' '}
          {live.audit?.passed ?? 0} passed
        </p>
        <div className="gd-table-wrap">
          <table className="gd-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Server</th>
                <th>Tool</th>
                <th>Action</th>
                <th>Rule</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={`${e.timestamp}-${e.tool_name}-${i}`}>
                  <td>{new Date(e.timestamp).toLocaleString()}</td>
                  <td>{e.server_name}</td>
                  <td>{e.tool_name}</td>
                  <td>
                    <span className={`gd-badge ${e.action === 'block' ? 'block' : 'pass'}`}>
                      {e.action}
                    </span>
                  </td>
                  <td>{e.rule || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </StateBlock>
  );
}
