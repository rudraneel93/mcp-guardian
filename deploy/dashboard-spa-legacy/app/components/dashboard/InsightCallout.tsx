'use client';

import type { Scope } from './InsightsNarrativeRail';

type Citation = { id: string; text: string };

type Props = {
  title?: string;
  bullets: string[];
  source: 'measured' | 'llm' | 'deterministic';
  provider?: string;
  model?: string;
  generatedAt?: string;
  narrative?: string;
  citations?: Citation[];
  scope?: Scope;
  windowDays?: number;
  onExport?: () => void;
  exporting?: boolean;
};

export function InsightCallout({
  title = 'Analyst insights',
  bullets,
  source,
  provider,
  model,
  generatedAt,
  narrative,
  citations,
  onExport,
  exporting,
}: Props) {
  if (!bullets.length && !narrative) return null;
  const badge =
    source === 'measured'
      ? 'Measured from proxy'
      : source === 'llm'
        ? `LLM · ${provider || 'local'}${model ? ` · ${model}` : ''}`
        : 'Deterministic summary';

  return (
    <aside className="insight-callout" aria-label={title}>
      <header className="insight-callout-head">
        <h3 className="insight-callout-title">{title}</h3>
        <span className={`insight-callout-badge insight-callout-badge-${source}`}>{badge}</span>
      </header>
      {narrative ? <p className="insight-narrative">{narrative}</p> : null}
      {bullets.length ? (
        <ul className="insight-callout-list">
          {bullets.map((b) => (
            <li key={b.slice(0, 48)}>{b}</li>
          ))}
        </ul>
      ) : null}
      {citations?.length ? (
        <details className="insight-citations">
          <summary>Citations ({citations.length})</summary>
          <ul className="insight-callout-list">
            {citations.map((c) => (
              <li key={c.id}>
                <code>{c.id}</code> {c.text}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <footer className="insight-callout-foot">
        {generatedAt ? <p className="insight-callout-meta">Generated {generatedAt}</p> : <span />}
        {onExport ? (
          <span className="btn-row">
            <button type="button" className="secondary btn-sm" disabled={exporting} onClick={onExport}>
              {exporting ? 'Exporting…' : 'Download briefing'}
            </button>
            <button type="button" className="secondary btn-sm" onClick={() => window.print()}>
              Print / PDF
            </button>
          </span>
        ) : null}
      </footer>
    </aside>
  );
}
