'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  downloadSwarmReport,
  fetchPlainEnglishReport,
  fetchSwarmFigures,
  fetchSwarmLatest,
  fetchSwarmReportPreview,
  fetchSwarmSummary,
  fetchTrafficSummary,
  fetchUserServersSession,
  fetchThreatLabCandidates,
  fetchToolIntegrityReport,
  fetchAutoCorpusManifest,
  type PlainEnglishReport,
  type SwarmFigureEntry,
  type SwarmLatest,
  type ThreatLabCandidate,
  type AutoCorpusEntry,
  type TrafficSummary,
} from '@/lib/guardian-api';
import { InfrastructureVisualsPanel } from './InfrastructureVisualsPanel';
import { DashboardWindowProvider } from './dashboard/DashboardWindowContext';
import { VisualsProvider } from './dashboard/VisualsProvider';
import { PlainEnglishReportView } from './PlainEnglishReportView';

type Props = {
  refreshKey?: number;
  showReport?: boolean;
  className?: string;
};

function gateLabel(ok: unknown): string {
  return ok ? 'PASS' : 'FAIL';
}

function gateClass(ok: unknown): string {
  return ok ? 'gate-pass' : 'gate-fail';
}

export function SwarmResultsView({
  refreshKey = 0,
  showReport = true,
  className = '',
}: Props) {
  const [loading, setLoading] = useState(true);
  const [latest, setLatest] = useState<SwarmLatest | null>(null);
  const [figures, setFigures] = useState<SwarmFigureEntry[]>([]);
  const [summaryMd, setSummaryMd] = useState('');
  const [report, setReport] = useState('');
  const [plainReport, setPlainReport] = useState<PlainEnglishReport | null>(null);
  const [traffic, setTraffic] = useState<TrafficSummary | null>(null);
  const [userServers, setUserServers] = useState<Record<string, unknown> | null>(null);
  const [threatLabCandidates, setThreatLabCandidates] = useState<ThreatLabCandidate[]>([]);
  const [autoCorpusEntries, setAutoCorpusEntries] = useState<AutoCorpusEntry[]>([]);
  const [toolIntegrity, setToolIntegrity] = useState<Record<string, unknown> | null>(null);
  const [showFullReport, setShowFullReport] = useState(false);
  const [loadError, setLoadError] = useState('');
  const sectionRef = useRef<HTMLElement>(null);

  const loadArtifacts = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [r, l, f, s, pr, tr, us, tl, ac, tw] = await Promise.all([
        showReport ? fetchSwarmReportPreview() : Promise.resolve(''),
        fetchSwarmLatest(),
        fetchSwarmFigures(),
        fetchSwarmSummary(),
        fetchPlainEnglishReport(),
        fetchTrafficSummary(),
        fetchUserServersSession(),
        fetchThreatLabCandidates(),
        fetchAutoCorpusManifest(),
        fetchToolIntegrityReport(),
      ]);
      setReport(r || '');
      setLatest(l);
      setFigures(f);
      setSummaryMd(s || '');
      setPlainReport(pr);
      setTraffic(tr);
      setUserServers(us);
      setThreatLabCandidates(tl);
      setAutoCorpusEntries(ac);
      setToolIntegrity(tw);
      if (!pr && !l && !f.length && !s && !r) {
        setLoadError(
          'No batch artifacts for this dashboard session. Run Security Swarm from Agent flow — committed CI reports are hidden until then.',
        );
      } else {
        setLoadError('');
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load analysis artifacts');
    } finally {
      setLoading(false);
    }
  }, [showReport]);

  useEffect(() => {
    void loadArtifacts();
  }, [loadArtifacts, refreshKey]);

  const gates = latest?.gates as Record<string, unknown> | undefined;
  const hasPlainReport = !!(plainReport?.headline || plainReport?.sections?.length);
  const hasTechnical = !!(latest || figures.length || report);
  const userProbeServers = (userServers?.servers as Array<Record<string, unknown>>) || [];

  return (
    <section
      ref={sectionRef}
      className={`swarm-results-view ${className}`.trim()}
      aria-label="Security analysis results"
    >
      <div className="swarm-results-head">
        <h3>Security report (plain English)</h3>
        <div className="btn-row">
          <button type="button" className="secondary" disabled={loading} onClick={() => void loadArtifacts()}>
            {loading ? 'Loading…' : 'Refresh report'}
          </button>
          {report ? (
            <button type="button" className="secondary" onClick={() => void downloadSwarmReport()}>
              Download analysis.txt
            </button>
          ) : null}
        </div>
      </div>

      {loading ? <p className="hint">Loading plain-English report…</p> : null}
      {!loading && loadError && !hasPlainReport ? (
        <p className="status status-error">{loadError}</p>
      ) : null}

      {!loading && hasPlainReport && plainReport ? (
        <PlainEnglishReportView report={plainReport} />
      ) : null}

      <DashboardWindowProvider>
        <VisualsProvider refreshKey={refreshKey} pollMs={30_000}>
          <InfrastructureVisualsPanel refreshKey={refreshKey} />
        </VisualsProvider>
      </DashboardWindowProvider>

      {!loading && !hasPlainReport && hasTechnical ? (
        <p className="hint">
          Plain-English report is being generated — click Refresh report, or re-run analysis.
        </p>
      ) : null}

      {!loading && traffic?.hasData && (traffic.servers?.length ?? 0) > 0 ? (
        <div className="traffic-summary-block">
          <h4>Your traffic (last {traffic.windowDays ?? 7} days)</h4>
          <table className="data-table compact">
            <thead>
              <tr>
                <th>Server</th>
                <th>Calls</th>
                <th>Blocked</th>
                <th>Top tool</th>
              </tr>
            </thead>
            <tbody>
              {(traffic.servers || []).map((s) => (
                <tr key={s.serverName}>
                  <td>{s.serverName}</td>
                  <td>{s.calls}</td>
                  <td>{s.blocked}</td>
                  <td>{s.topTools?.[0]?.tool ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && userProbeServers.length > 0 ? (
        <div className="user-servers-block">
          <h4>Server probes</h4>
          <table className="data-table compact">
            <thead>
              <tr>
                <th>Server</th>
                <th>Status</th>
                <th>Tools</th>
              </tr>
            </thead>
            <tbody>
              {userProbeServers.map((s) => (
                <tr key={String(s.serverName)}>
                  <td>{String(s.serverName)}</td>
                  <td>{String(s.status)}</td>
                  <td>{String(s.toolCount ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && (threatLabCandidates.length > 0 || autoCorpusEntries.length > 0) ? (
        <div className="threat-discovery-summary card">
          <h4>Threat Discovery</h4>
          <p>
            {threatLabCandidates.length > 0
              ? `${threatLabCandidates.filter((c) => !c.reviewStatus || c.reviewStatus === 'pending').length} Threat Lab candidate(s) pending review`
              : null}
            {threatLabCandidates.length > 0 && autoCorpusEntries.length > 0 ? ' · ' : null}
            {autoCorpusEntries.length > 0
              ? `${autoCorpusEntries.length} auto corpus fixture(s)`
              : null}
          </p>
          <p className="hint">
            Open the <strong>Threat Discovery</strong> tab for interactive architecture, run controls,
            detailed statistics, and accept/reject workflow.
          </p>
        </div>
      ) : null}

      {!loading && latest ? (
        <details className="regression-details">
          <summary>Regression gates &amp; findings</summary>
          <div className="swarm-gate-summary">
            <div className="gate-cards">
              <div className={`gate-card ${gateClass(latest.overall)}`}>
                <span className="gate-card-label">Overall</span>
                <span className="gate-card-value">{gateLabel(latest.overall)}</span>
              </div>
              <div className={`gate-card ${gateClass(gates?.corpus)}`}>
                <span className="gate-card-label">Corpus</span>
                <span className="gate-card-value">{gateLabel(gates?.corpus)}</span>
              </div>
              <div className={`gate-card ${gateClass(gates?.parity)}`}>
                <span className="gate-card-label">Parity</span>
                <span className="gate-card-value">{gateLabel(gates?.parity)}</span>
              </div>
              <div className={`gate-card ${gateClass(gates?.scout)}`}>
                <span className="gate-card-label">Scout</span>
                <span className="gate-card-value">{gateLabel(gates?.scout)}</span>
              </div>
            </div>
            {latest.findings?.length ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>Source</th>
                    <th>Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {latest.findings.map((f, i) => (
                    <tr key={`${f.source}-${i}`}>
                      <td>{f.severity}</td>
                      <td>{f.source}</td>
                      <td>{f.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </div>
        </details>
      ) : null}

      {!loading && figures.length > 0 ? (
        <FigureGalleryByCategory figures={figures} />
      ) : null}

      {!loading && showReport && report ? (
        <details className="technical-appendix">
          <summary>Technical appendix (analysis.txt)</summary>
          <div className="btn-row">
            <button type="button" className="secondary" onClick={() => setShowFullReport((v) => !v)}>
              {showFullReport ? 'Collapse' : 'Expand full report'}
            </button>
          </div>
          <pre className="code-block report-full">
            {showFullReport ? report : `${report.split('\n').slice(0, 60).join('\n')}\n…`}
          </pre>
        </details>
      ) : null}

      {!loading && summaryMd && !hasPlainReport ? (
        <pre className="code-block md-preview">{summaryMd}</pre>
      ) : null}

      {toolIntegrity?.hasData ? (
        <details className="tool-integrity-panel">
          <summary>Tool integrity (ToolWatch)</summary>
          <p className="hint">
            {(toolIntegrity.summary as { serversChanged?: number })?.serversChanged ?? 0} server(s) changed ·{' '}
            {(toolIntegrity.summary as { criticalCount?: number })?.criticalCount ?? 0} critical diff(s)
          </p>
        </details>
      ) : null}

      <p className="hint enterprise-ai-link-hint">
        Supply chain graph, shadow red team, and federated signature hints → <strong>Enterprise AI</strong> tab.
      </p>
    </section>
  );
}

const FIGURE_CATEGORY_ORDER = ['traffic', 'learning', 'semantic', 'regression', 'infrastructure', 'other'];

function FigureGalleryByCategory({ figures }: { figures: SwarmFigureEntry[] }) {
  const grouped = new Map<string, SwarmFigureEntry[]>();
  for (const f of figures) {
    const cat = f.category || 'other';
    const list = grouped.get(cat) ?? [];
    list.push(f);
    grouped.set(cat, list);
  }
  const categories = [
    ...FIGURE_CATEGORY_ORDER.filter((c) => grouped.has(c)),
    ...[...grouped.keys()].filter((c) => !FIGURE_CATEGORY_ORDER.includes(c)),
  ];

  return (
    <details className="figures-details" open>
      <summary>PNG figure gallery ({figures.length})</summary>
      {categories.map((cat) => (
        <div key={cat} className="figure-category-block">
          <h5 className="figure-category-title">{cat}</h5>
          <div className="figure-gallery figure-gallery-detailed">
            {grouped.get(cat)?.map((f) => (
              <figure key={f.name} className="figure-card">
                <a href={f.url} target="_blank" rel="noopener noreferrer" title={f.title}>
                  <img src={f.url} alt={f.title} loading="lazy" />
                </a>
                <figcaption>
                  <strong>{f.title}</strong>
                  {f.dataSource ? (
                    <span className="figure-source"> · {f.dataSource}</span>
                  ) : null}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      ))}
    </details>
  );
}
