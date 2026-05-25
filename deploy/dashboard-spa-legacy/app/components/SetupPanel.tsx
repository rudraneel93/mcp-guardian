'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  fetchOnboardingStatus,
  fetchServerRegistry,
  type OnboardingStatus,
  type ServerRegistryEntry,
} from '@/lib/guardian-api';

type Props = {
  onGoToAgentFlow?: () => void;
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="secondary setup-copy"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        });
      }}
    >
      {copied ? 'Copied' : label}
    </button>
  );
}

export function SetupPanel({ onGoToAgentFlow }: Props) {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [servers, setServers] = useState<ServerRegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [st, reg] = await Promise.all([fetchOnboardingStatus(), fetchServerRegistry()]);
      setStatus(st);
      setServers(reg);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load setup status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const wrapped = (status?.configCount ?? 0) > 0;
  const hasTraffic = !!(status?.hasTraffic || (status?.totalCalls ?? 0) > 0);
  const analysisDone = status?.lastAnalysisState === 'done';

  return (
    <section aria-label="Setup">
      <h2>Setup</h2>
      <p className="setup-lead">
        Connect your IDE MCP servers through Guardian, observe traffic, then run one-click security
        analysis from the <strong>Agent flow</strong> tab.
      </p>

      <div className="setup-progress" aria-label="Setup progress">
        <span className={wrapped ? 'setup-chip setup-chip-done' : 'setup-chip'}>1 Connect</span>
        <span className={hasTraffic ? 'setup-chip setup-chip-done' : 'setup-chip'}>2 Observe</span>
        <span className={analysisDone ? 'setup-chip setup-chip-done' : 'setup-chip'}>3 Analyze</span>
      </div>

      {loading ? <p className="hint">Loading setup status…</p> : null}
      {error ? <p className="status status-error">{error}</p> : null}

      {status ? (
        <ol className="setup-steps">
          <li className={wrapped ? 'setup-done' : ''}>
            <strong>1. Connect — wrap MCP servers</strong>
            <p className="hint">
              Patches your IDE config so each MCP server runs through Guardian (audit mode by
              default).
            </p>
            {wrapped ? (
              <span className="setup-badge">
                {status.configCount} server config(s) in guardian-configs/
              </span>
            ) : (
              <span className="setup-badge setup-warn">Not wrapped yet</span>
            )}
            <pre className="code-block setup-cmd">{status.commands.onboard}</pre>
            <div className="btn-row">
              <CopyButton text={status.commands.onboard} label="Copy command" />
            </div>
            <p className="hint">
              Run from the <strong>repo root</strong> after <code>pnpm build</code> (global{' '}
              <code>mcp-guardian</code> from npm may not include <code>onboard</code> yet).
            </p>
            <p className="hint">
              After <code>--apply</code>, <strong>reload MCP in Cursor</strong> (restart or
              reconnect MCP).
            </p>
            {status.onboardedAt ? (
              <p className="hint">Last onboard: {new Date(status.onboardedAt).toLocaleString()}</p>
            ) : null}
          </li>

          <li className={hasTraffic ? 'setup-done' : ''}>
            <strong>2. Observe — use MCP tools normally</strong>
            <p className="hint">
              Start the dashboard proxy so calls are recorded to history.db and appear in Live
              audit.
            </p>
            {hasTraffic ? (
              <span className="setup-badge">{status.totalCalls} call(s) recorded</span>
            ) : (
              <span className="setup-badge setup-warn">No traffic yet</span>
            )}
            <pre className="code-block setup-cmd">{status.commands.dashboardProxy}</pre>
            <div className="btn-row">
              <CopyButton text={status.commands.dashboardProxy} label="Copy command" />
              <a
                className="linkish"
                href="http://localhost:4000"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open dashboard
              </a>
            </div>
            <p className="hint">DB: {status.dbPath}</p>
          </li>

          <li className={analysisDone ? 'setup-done' : ''}>
            <strong>3. Analyze — one-click security report</strong>
            <p className="hint">
              In the dashboard, open <strong>Agent flow</strong> →{' '}
              <strong>Run full security analysis</strong>. Results appear as a plain-English report
              below the pipeline.
            </p>
            <div className="btn-row">
              {onGoToAgentFlow ? (
                <button type="button" onClick={onGoToAgentFlow}>
                  Go to Agent flow
                </button>
              ) : null}
              <CopyButton text={status.commands.runAnalysis} label="Copy CLI command" />
            </div>
            {status.lastAnalysisAt ? (
              <p className="hint">
                Last run: {new Date(status.lastAnalysisAt).toLocaleString()} (
                {status.lastAnalysisState})
              </p>
            ) : (
              <p className="hint">Or from terminal: {status.commands.runAnalysis}</p>
            )}
          </li>
        </ol>
      ) : null}

      {servers.length > 0 ? (
        <>
          <h3>Your MCP servers</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Server</th>
                <th>Transport</th>
                <th>Calls</th>
                <th>Blocked</th>
                <th>Last seen</th>
              </tr>
            </thead>
            <tbody>
              {servers.map((s) => (
                <tr key={s.name}>
                  <td>{s.name}</td>
                  <td>{s.transport}</td>
                  <td>{s.metrics?.totalCalls ?? '—'}</td>
                  <td>{s.metrics?.blocked ?? '—'}</td>
                  <td>
                    {s.metrics?.lastSeen
                      ? new Date(s.metrics.lastSeen).toLocaleString()
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : status && !wrapped ? (
        <p className="hint">No servers in guardian-configs/ — complete step 1 first.</p>
      ) : null}

      <div className="btn-row">
        <button type="button" className="secondary" disabled={loading} onClick={() => void load()}>
          Refresh setup
        </button>
      </div>
    </section>
  );
}
