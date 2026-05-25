export type FlowStepKind =
  | 'tool_call'
  | 'policy_block'
  | 'policy_pass'
  | 'semantic_queued'
  | 'semantic_complete'
  | 'ai_suggestion'
  | 'swarm_phase'
  | 'swarm_done'
  | 'swarm_failed'
  | 'analysis_ready'
  | 'system';

export type FlowSeverity = 'info' | 'warn' | 'error' | 'success';

export type FlowTimelineEntry = {
  id: string;
  kind: FlowStepKind;
  title: string;
  summary: string;
  severity: FlowSeverity;
  channel: string;
  serverName?: string;
  toolName?: string;
  requestId?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
};

export type PipelinePhase = {
  id: string;
  label: string;
  progressPct: number;
};

export const SWARM_PIPELINE_PHASES: PipelinePhase[] = [
  { id: 'preflight', label: 'Preflight', progressPct: 5 },
  { id: 'build', label: 'Build', progressPct: 10 },
  { id: 'live-mcp', label: 'Live MCP', progressPct: 25 },
  { id: 'user-servers', label: 'Your servers', progressPct: 35 },
  { id: 'traffic', label: 'Traffic', progressPct: 42 },
  { id: 'calibrate', label: 'Calibrate', progressPct: 50 },
  { id: 'swarm', label: 'Swarm gates', progressPct: 75 },
  { id: 'visuals', label: 'Visuals', progressPct: 88 },
  { id: 'report', label: 'Plain English', progressPct: 95 },
  { id: 'analysis', label: 'Technical', progressPct: 100 },
];

export type PipelineState = {
  activePhaseId: string | null;
  activeIndex: number;
  progressPct: number;
  state: 'idle' | 'running' | 'done' | 'failed';
  phaseLabel?: string;
  error?: string;
};

/** Map /api/security-swarm/status (or WS payload) → pipeline strip state */
export function pipelineFromSwarmJob(job: {
  state?: string;
  phase?: string;
  phaseLabel?: string;
  progressPct?: number;
  error?: string | null;
}): PipelineState {
  const phaseId = job.phase || '';
  const idx = phaseId ? SWARM_PIPELINE_PHASES.findIndex((p) => p.id === phaseId) : -1;
  const st = job.state || 'idle';
  const running = st === 'running';
  const done = st === 'done';
  const failed = st === 'failed';
  return {
    state: running ? 'running' : done ? 'done' : failed ? 'failed' : 'idle',
    activePhaseId: phaseId || null,
    activeIndex: idx >= 0 ? idx : running ? 0 : done ? SWARM_PIPELINE_PHASES.length - 1 : -1,
    progressPct: job.progressPct ?? 0,
    phaseLabel: job.phaseLabel || phaseId || undefined,
    error: job.error ? String(job.error) : undefined,
  };
}
