'use client';

type Debate = {
  recordId?: string;
  toolName?: string;
  verdict?: { recommendedLabel?: string; unanimous?: boolean };
};

type Props = {
  tribunal: Record<string, unknown> | null;
};

export function TribunalSummaryCard({ tribunal }: Props) {
  const debates = (tribunal?.debates as Debate[]) ?? [];
  const debatedCount = Number(tribunal?.debatedCount ?? debates.length);
  const autoLabels = Number(tribunal?.autoLabelsApplied ?? 0);

  return (
    <article className="enterprise-ai-card">
      <h3>Swarm debate tribunal</h3>
      <p className="hint">Multi-agent resolution for uncertain semantic flags</p>
      {debates.length === 0 ? (
        <p className="muted">No debated outcomes yet — tribunal runs when semantic confidence is in the uncertain band.</p>
      ) : (
        <>
          <p className="hint">
            {debatedCount} debated
            {autoLabels > 0 ? ` · ${autoLabels} auto-labeled` : ''}
          </p>
          <ul className="insight-callout-list">
            {debates.map((d) => (
              <li key={String(d.recordId)}>
                <strong>{String(d.toolName ?? '—')}</strong> →{' '}
                {String(d.verdict?.recommendedLabel ?? 'needs_review')}
                {d.verdict?.unanimous ? ' (unanimous)' : ''}
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}
