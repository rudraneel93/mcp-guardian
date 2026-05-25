'use client';

import { useState } from 'react';
import {
  THREAT_LAB_STAGES,
  AUTO_RESEARCH_STAGES,
  type PipelineStage,
} from '@/lib/threat-discovery-copy';

type FlowId = 'threat-lab' | 'auto-research';

type Props = {
  className?: string;
};

export function ThreatArchitectureView({ className = '' }: Props) {
  const [flow, setFlow] = useState<FlowId>('threat-lab');
  const [selected, setSelected] = useState<string>('sources');
  const [showDiagram, setShowDiagram] = useState(false);

  const stages: PipelineStage[] =
    flow === 'threat-lab' ? THREAT_LAB_STAGES : AUTO_RESEARCH_STAGES;
  const active = stages.find((s) => s.id === selected) || stages[0];
  const diagramSrc =
    flow === 'threat-lab'
      ? '/docs/assets/llm-threat-discovery-architecture.png'
      : '/docs/assets/auto-threat-research-architecture.png';

  return (
    <section className={`architecture-explainer ${className}`.trim()}>
      <div className="architecture-flow-toggle">
        <button
          type="button"
          className={flow === 'threat-lab' ? 'tab active' : 'tab'}
          onClick={() => {
            setFlow('threat-lab');
            setSelected('sources');
          }}
        >
          LLM Threat Discovery
        </button>
        <button
          type="button"
          className={flow === 'auto-research' ? 'tab active' : 'tab'}
          onClick={() => {
            setFlow('auto-research');
            setSelected('detect');
          }}
        >
          Self-sustaining Auto Research
        </button>
        <button
          type="button"
          className="secondary btn-sm"
          onClick={() => setShowDiagram((v) => !v)}
        >
          {showDiagram ? 'Hide diagram' : 'View diagram'}
        </button>
      </div>

      <div className="pipeline-stages" role="list">
        {stages.map((stage, i) => (
          <button
            key={stage.id}
            type="button"
            role="listitem"
            className={`pipeline-stage ${selected === stage.id ? 'active' : ''}`}
            onClick={() => setSelected(stage.id)}
          >
            <span className="pipeline-stage-num">{i + 1}</span>
            <span className="pipeline-stage-label">{stage.short}</span>
          </button>
        ))}
      </div>

      <div className="pipeline-detail card">
        <h4>{active.label}</h4>
        <p>{active.explanation}</p>
        {active.envVars?.length ? (
          <div className="pipeline-detail-block">
            <h5>Environment</h5>
            <ul className="list compact">
              {active.envVars.map((v) => (
                <li key={v}>
                  <code>{v}</code>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {active.safetyGates?.length ? (
          <div className="pipeline-detail-block">
            <h5>Safety gates</h5>
            <ul className="list compact">
              {active.safetyGates.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {showDiagram ? (
        <figure className="architecture-diagram">
          <img src={diagramSrc} alt={`${flow} architecture diagram`} loading="lazy" />
          <figcaption>
            {flow === 'threat-lab'
              ? 'LLM Threat Discovery — human review required before policy apply'
              : 'Auto Threat Research — self-sustaining corpus loop, audit only'}
          </figcaption>
        </figure>
      ) : null}
    </section>
  );
}
