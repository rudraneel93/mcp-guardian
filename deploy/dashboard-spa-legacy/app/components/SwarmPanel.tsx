'use client';

import { SwarmResultsView } from './SwarmResultsView';
import type { PipelineState } from '@/lib/flow-types';

type Props = {
  roles?: string[];
  pipeline?: PipelineState;
  swarmDoneTick?: number;
};

/** Analysis tab — results only; run analysis from Agent flow (single canonical surface). */
export function SwarmPanel({ pipeline, swarmDoneTick = 0 }: Props) {
  const resultsKey =
    swarmDoneTick + (pipeline?.state === 'done' ? 1000 : 0);

  return (
    <section aria-label="Security analysis">
      <h2>Security analysis</h2>
      <p className="hint">
        Run analysis from the <strong>Agent flow</strong> tab (one canonical button). This tab shows
        your plain-English report, traffic summary, regression gates, and visuals.
      </p>

      {pipeline?.state === 'running' ? (
        <p className="status">
          Analysis in progress — {pipeline.phaseLabel || pipeline.activePhaseId}…
        </p>
      ) : null}

      <SwarmResultsView refreshKey={resultsKey} showReport className="swarm-results-tab" />
    </section>
  );
}
