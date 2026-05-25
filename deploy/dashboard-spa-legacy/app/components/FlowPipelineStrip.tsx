'use client';

import { SWARM_PIPELINE_PHASES, type PipelineState } from '@/lib/flow-types';

type Props = {
  pipeline: PipelineState;
};

export function FlowPipelineStrip({ pipeline }: Props) {
  const activeIdx = (() => {
    if (pipeline.activeIndex >= 0) return pipeline.activeIndex;
    if (pipeline.activePhaseId) {
      const i = SWARM_PIPELINE_PHASES.findIndex((p) => p.id === pipeline.activePhaseId);
      if (i >= 0) return i;
    }
    if (pipeline.state === 'running') return 0;
    if (pipeline.state === 'done') return SWARM_PIPELINE_PHASES.length - 1;
    return -1;
  })();

  return (
    <div className="pipeline-strip" aria-label="Security analysis pipeline">
      {SWARM_PIPELINE_PHASES.map((phase, i) => {
        let stateClass = 'pending';
        if (pipeline.state === 'failed' && i === activeIdx) stateClass = 'failed';
        else if (pipeline.state === 'done' || i < activeIdx) stateClass = 'done';
        else if (i === activeIdx && pipeline.state === 'running') stateClass = 'active';

        return (
          <div key={phase.id} className={`pipeline-step ${stateClass}`}>
            <span className="pipeline-dot" aria-hidden />
            <span className="pipeline-label">{phase.label}</span>
          </div>
        );
      })}
      {pipeline.state === 'running' && pipeline.phaseLabel ? (
        <p className="hint pipeline-active-hint">
          Active: {pipeline.phaseLabel} ({pipeline.progressPct}%)
        </p>
      ) : null}
    </div>
  );
}
