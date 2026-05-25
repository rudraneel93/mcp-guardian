/**
 * In-process Threat Discovery Auto-Scheduler.
 *
 * Replaces the previous no-op endpoints that just returned a static OK message.
 * The scheduler:
 *   - Persists state to `~/.mcp-guardian/scheduler-state.json` so the
 *     existing `/api/threat-discovery/scheduler/status` reader keeps working.
 *   - Runs Auto-Threat-Research on a configurable interval per tenant.
 *   - Survives proxy restarts when GUARDIAN_THREAT_DISCOVERY_AUTOSTART=true
 *     by checking the persisted `running` flag on import.
 *
 * Environment:
 *   GUARDIAN_THREAT_DISCOVERY_INTERVAL_MS  default 3_600_000 (1h)
 *   GUARDIAN_THREAT_DISCOVERY_AUTOSTART    'true' to auto-start at proxy boot
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { dirname, join } from 'path';
import { Logger } from './logger.js';

export interface SchedulerState {
  running: boolean;
  startedAt: string | null;
  stoppedAt: string | null;
  lastRunAt: string | null;
  lastRunStatus: 'success' | 'failed' | null;
  lastRunError: string | null;
  nextRunAt: string | null;
  intervalMs: number;
  totalRuns: number;
  totalErrors: number;
  tenantId: string;
  pid: number | null;
  message?: string;
}

interface RunnerHandle {
  timer: NodeJS.Timeout;
  tenantId: string;
}

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000; // 1h

function stateFilePath(): string {
  return join(homedir(), '.mcp-guardian', 'scheduler-state.json');
}

function readIntervalMs(): number {
  const raw = parseInt(process.env.GUARDIAN_THREAT_DISCOVERY_INTERVAL_MS || '', 10);
  if (Number.isFinite(raw) && raw >= 60_000) return raw;
  return DEFAULT_INTERVAL_MS;
}

function defaultState(tenantId: string): SchedulerState {
  return {
    running: false,
    startedAt: null,
    stoppedAt: null,
    lastRunAt: null,
    lastRunStatus: null,
    lastRunError: null,
    nextRunAt: null,
    intervalMs: readIntervalMs(),
    totalRuns: 0,
    totalErrors: 0,
    tenantId,
    pid: null,
  };
}

let inMemoryState: SchedulerState | null = null;
let runnerHandle: RunnerHandle | null = null;

function loadStateFromDisk(): SchedulerState | null {
  const file = stateFilePath();
  if (!existsSync(file)) return null;
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf-8')) as Partial<SchedulerState>;
    const tenantId = String(parsed.tenantId || 'default');
    return {
      ...defaultState(tenantId),
      ...parsed,
      tenantId,
    } as SchedulerState;
  } catch (err) {
    Logger.warn(
      `[scheduler] Failed to read state file (${err instanceof Error ? err.message : String(err)})`,
    );
    return null;
  }
}

function persistState(state: SchedulerState): void {
  const file = stateFilePath();
  try {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    Logger.warn(
      `[scheduler] Failed to persist state (${err instanceof Error ? err.message : String(err)})`,
    );
  }
}

function getState(tenantId: string): SchedulerState {
  if (!inMemoryState) {
    inMemoryState = loadStateFromDisk() || defaultState(tenantId);
  }
  // If the persisted state belongs to a different tenant than the request, prefer the request.
  if (inMemoryState.tenantId !== tenantId && !runnerHandle) {
    inMemoryState.tenantId = tenantId;
  }
  return inMemoryState;
}

function updateState(patch: Partial<SchedulerState>): SchedulerState {
  const current = inMemoryState || defaultState('default');
  inMemoryState = { ...current, ...patch };
  persistState(inMemoryState);
  return inMemoryState;
}

async function runOnce(tenantId: string): Promise<void> {
  Logger.info(`[scheduler] Running Auto-Threat-Research for tenant=${tenantId}`);
  try {
    const { startAutoThreatResearchJob } = await import('./threat-discovery-runner.js');
    const result = startAutoThreatResearchJob(tenantId);
    if (!result.ok) {
      // 409 (already running) is benign — treat as success for the schedule
      const benign = result.status === 409;
      updateState({
        lastRunAt: new Date().toISOString(),
        lastRunStatus: benign ? 'success' : 'failed',
        lastRunError: benign ? null : result.error ?? 'Job failed to start',
        totalRuns: (inMemoryState?.totalRuns ?? 0) + 1,
        totalErrors: (inMemoryState?.totalErrors ?? 0) + (benign ? 0 : 1),
        nextRunAt: new Date(Date.now() + readIntervalMs()).toISOString(),
      });
      return;
    }
    updateState({
      lastRunAt: new Date().toISOString(),
      lastRunStatus: 'success',
      lastRunError: null,
      totalRuns: (inMemoryState?.totalRuns ?? 0) + 1,
      nextRunAt: new Date(Date.now() + readIntervalMs()).toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    Logger.error(`[scheduler] Run failed: ${msg}`);
    updateState({
      lastRunAt: new Date().toISOString(),
      lastRunStatus: 'failed',
      lastRunError: msg,
      totalRuns: (inMemoryState?.totalRuns ?? 0) + 1,
      totalErrors: (inMemoryState?.totalErrors ?? 0) + 1,
      nextRunAt: new Date(Date.now() + readIntervalMs()).toISOString(),
    });
  }
}

export function startScheduler(tenantId: string): SchedulerState {
  const state = getState(tenantId);
  if (runnerHandle) {
    return updateState({
      running: true,
      tenantId: runnerHandle.tenantId,
      message: 'Scheduler already running',
    });
  }
  const intervalMs = readIntervalMs();
  const next = new Date(Date.now() + intervalMs).toISOString();
  const startedAt = new Date().toISOString();
  updateState({
    running: true,
    startedAt,
    stoppedAt: null,
    nextRunAt: next,
    intervalMs,
    tenantId,
    pid: process.pid,
    message: `Scheduler running every ${Math.round(intervalMs / 60_000)} min`,
  });

  // Fire one immediately, then schedule periodic
  void runOnce(tenantId);
  const timer = setInterval(() => {
    void runOnce(tenantId);
  }, intervalMs);
  // Allow node to exit cleanly if needed
  if (typeof timer.unref === 'function') timer.unref();
  runnerHandle = { timer, tenantId };
  Logger.info(
    `[scheduler] Started Threat Discovery scheduler tenant=${tenantId} intervalMs=${intervalMs}`,
  );
  return inMemoryState!;
}

export function stopScheduler(): SchedulerState {
  if (runnerHandle) {
    clearInterval(runnerHandle.timer);
    runnerHandle = null;
  }
  const stoppedAt = new Date().toISOString();
  const next = updateState({
    running: false,
    stoppedAt,
    nextRunAt: null,
    pid: null,
    message: 'Scheduler stopped',
  });
  Logger.info('[scheduler] Stopped Threat Discovery scheduler');
  return next;
}

export function getSchedulerStatus(tenantId: string): SchedulerState {
  const state = getState(tenantId);
  // If we crashed previously, disk may say running:true but no live timer — reconcile.
  if (state.running && !runnerHandle && state.pid !== process.pid) {
    return updateState({
      running: false,
      stoppedAt: state.stoppedAt || new Date().toISOString(),
      pid: null,
      message: 'Scheduler not started in this process — POST /api/threat-discovery/scheduler/start to start',
    });
  }
  return state;
}

/** Auto-start at proxy boot if env flag is set. Called from dashboard-server start path. */
export function maybeAutoStart(tenantId: string): void {
  if (process.env.GUARDIAN_THREAT_DISCOVERY_AUTOSTART === 'true') {
    Logger.info('[scheduler] AUTOSTART=true — starting Threat Discovery scheduler');
    startScheduler(tenantId);
  }
}
