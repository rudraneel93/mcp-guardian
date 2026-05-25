'use client';

import type { ThreatLabCandidate } from '@/lib/guardian-api';
import type { AutoCorpusEntry } from '@/lib/guardian-api';
import { SOURCE_LABELS } from '@/lib/threat-discovery-copy';

type Props = {
  candidate?: ThreatLabCandidate | null;
  autoEntry?: AutoCorpusEntry | null;
  onClose: () => void;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  canMutate?: boolean;
};

export function ThreatCandidateDrawer({
  candidate,
  autoEntry,
  onClose,
  onAccept,
  onReject,
  canMutate,
}: Props) {
  if (!candidate && !autoEntry) return null;

  const title = candidate?.id || autoEntry?.advId || 'Detail';
  const hypothesis = candidate?.hypothesis || autoEntry?.hypothesis || '';
  const attackClass = candidate?.attackClass || autoEntry?.attackClass || '';
  const confidence = candidate?.confidence ?? autoEntry?.confidence ?? 0;
  const source =
    candidate?.provenance?.source ||
    autoEntry?.source ||
    'unknown';

  return (
    <aside className="candidate-drawer" aria-label="Threat candidate detail">
      <div className="candidate-drawer-head">
        <h4>{title}</h4>
        <button type="button" className="secondary btn-sm" onClick={onClose}>
          Close
        </button>
      </div>
      <dl className="candidate-drawer-meta">
        <dt>Attack class</dt>
        <dd>{attackClass}</dd>
        <dt>Confidence</dt>
        <dd>{(confidence * 100).toFixed(0)}%</dd>
        <dt>Source</dt>
        <dd>{SOURCE_LABELS[source] || source.replace(/_/g, ' ')}</dd>
        {candidate?.reviewStatus ? (
          <>
            <dt>Review status</dt>
            <dd>{candidate.reviewStatus}</dd>
          </>
        ) : null}
        {autoEntry?.toolName ? (
          <>
            <dt>Tool</dt>
            <dd>{autoEntry.toolName}</dd>
          </>
        ) : null}
        {(candidate?.path || autoEntry?.relPath) ? (
          <>
            <dt>Fixture path</dt>
            <dd className="fixture-path">{candidate?.path || autoEntry?.relPath}</dd>
          </>
        ) : null}
      </dl>
      <div className="candidate-drawer-section">
        <h5>Hypothesis</h5>
        <p>{hypothesis || '—'}</p>
      </div>
      {candidate?.validation ? (
        <div className="candidate-drawer-section">
          <h5>Validation</h5>
          <p>
            {candidate.validation.ok ? 'Passed' : 'Failed'}
            {candidate.validation.replayBlocked ? ' · replay blocked' : ''}
          </p>
          {(candidate.validation.errors || []).length > 0 ? (
            <ul className="list compact">
              {candidate.validation.errors!.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {candidate?.policyRule ? (
        <div className="candidate-drawer-section">
          <h5>Policy rule</h5>
          <pre className="code-block">{JSON.stringify(candidate.policyRule, null, 2)}</pre>
        </div>
      ) : null}
      {(candidate?.corpusCandidate || autoEntry) ? (
        <div className="candidate-drawer-section">
          <h5>Corpus fixture</h5>
          <pre className="code-block">
            {JSON.stringify(candidate?.corpusCandidate || {
              toolName: autoEntry?.toolName,
              category: autoEntry?.category,
              advId: autoEntry?.advId,
            }, null, 2)}
          </pre>
        </div>
      ) : null}
      {candidate && canMutate && (!candidate.reviewStatus || candidate.reviewStatus === 'pending') ? (
        <div className="btn-row candidate-drawer-actions">
          <button
            type="button"
            className="primary"
            onClick={() => onAccept?.(candidate.id)}
          >
            Accept rule
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => onReject?.(candidate.id)}
          >
            Reject
          </button>
        </div>
      ) : null}
    </aside>
  );
}
