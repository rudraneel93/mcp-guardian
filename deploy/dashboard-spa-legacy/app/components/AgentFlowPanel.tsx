'use client';

import { FlowPipelineStrip } from './FlowPipelineStrip';
import { FlowTimeline } from './FlowTimeline';
import { SwarmResultsView } from './SwarmResultsView';
import { SwarmRunControls } from './SwarmRunControls';
import type { DashboardWsState } from '@/lib/use-dashboard-ws';

type Props = {
  ws: DashboardWsState;
  roles?: string[];
};

export function AgentFlowPanel({ ws, roles }: Props) {
  return (
    <section aria-label="Agent flow">
      <h2>Live agent flow</h2>
      <p className="hint">
        Real-time MCP tool decisions, semantic audit, AI learning, and security analysis — via
        WebSocket.
      </p>
      <p className={ws.statusIsError ? 'status status-error' : 'status'}>{ws.statusText}</p>

      <h3>Analysis pipeline</h3>
      <SwarmRunControls
        roles={roles}
        pipeline={ws.pipeline}
        onSwarmStatus={ws.syncSwarmJobStatus}
        showDownload
      />
      <FlowPipelineStrip pipeline={ws.pipeline} />
      {ws.pipeline.state === 'failed' ? (
        <p className="status status-error" role="alert">
          Last analysis failed
          {ws.pipeline.phaseLabel ? ` at ${ws.pipeline.phaseLabel}` : ''}
          {ws.pipeline.error ? `: ${ws.pipeline.error}` : ''}. See{' '}
          <code>reports/security-swarm/job.log</code>.
        </p>
      ) : null}

      <h3>Security report</h3>
      <SwarmResultsView
        refreshKey={
          ws.swarmDoneTick
          + ws.pipeline.progressPct
          + (ws.pipeline.state === 'done' ? 1000 : 0)
        }
        showReport
        className="swarm-results-flow"
      />

      <h3>Activity timeline</h3>
      <FlowTimeline entries={ws.entries} />
    </section>
  );
}
