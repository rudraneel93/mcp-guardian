'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchAggregateMetrics,
  fetchAudit,
  fetchAuthStatus,
  fetchHealth,
  fetchSecurity,
  fetchSwarmStatus,
  guardianFetch,
  type AggregateMetrics,
  type AuditResponse,
  type AuthStatus,
  type HealthResponse,
  type SecurityResponse,
  type SwarmJobStatus,
} from '@/lib/guardian-api';
import { useDashboardWs } from '@/lib/use-dashboard-ws';

const REST_POLL_MS = 15_000;

export type LiveDashboardState = {
  ready: boolean;
  apiOnline: boolean;
  statusText: string;
  statusError: boolean;
  auth: AuthStatus | null;
  metrics: AggregateMetrics | null;
  audit: AuditResponse | null;
  security: SecurityResponse | null;
  health: HealthResponse | null;
  swarm: SwarmJobStatus | null;
  ws: ReturnType<typeof useDashboardWs>;
  refresh: () => Promise<void>;
  refreshTick: number;
};

export function useLiveDashboard(): LiveDashboardState {
  const [ready, setReady] = useState(false);
  const [apiOnline, setApiOnline] = useState(false);
  const [statusText, setStatusText] = useState('Connecting…');
  const [statusError, setStatusError] = useState(false);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [metrics, setMetrics] = useState<AggregateMetrics | null>(null);
  const [audit, setAudit] = useState<AuditResponse | null>(null);
  const [security, setSecurity] = useState<SecurityResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [swarm, setSwarm] = useState<SwarmJobStatus | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [sessionKey, setSessionKey] = useState(0);

  const ws = useDashboardWs(ready, sessionKey);

  const refresh = useCallback(async () => {
    try {
      const probe = await guardianFetch('/api/auth/status');
      const online = probe.ok;
      setApiOnline(online);

      if (!online) {
        setStatusText('API offline — start pnpm serve or dashboard:proxy');
        setStatusError(true);
        return;
      }

      const [m, a, s, h, sw, au] = await Promise.all([
        fetchAggregateMetrics(7),
        fetchAudit({ limit: 50, windowDays: 7 }),
        fetchSecurity(),
        fetchHealth(),
        fetchSwarmStatus(),
        fetchAuthStatus(),
      ]);

      if (m) setMetrics(m);
      if (a) setAudit(a);
      if (s) setSecurity(s);
      if (h) setHealth(h);
      if (sw) setSwarm(sw);
      if (au) setAuth(au);

      setStatusError(false);
      setStatusText(ws.connected ? ws.statusText : 'Live data from Guardian API');
      setRefreshTick((t) => t + 1);
    } catch {
      setApiOnline(false);
      setStatusText('Network error — check pnpm serve');
      setStatusError(true);
    }
  }, [ws.connected, ws.statusText]);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    void refresh();
    const id = window.setInterval(() => void refresh(), REST_POLL_MS);
    return () => window.clearInterval(id);
  }, [ready, sessionKey, refresh]);

  useEffect(() => {
    if (ws.metricsPatch) setMetrics(ws.metricsPatch);
  }, [ws.metricsPatch]);

  useEffect(() => {
    if (!ws.auditPatch?.events?.length) return;
    setAudit((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        events: ws.auditPatch!.events ?? prev.events,
        total: ws.auditPatch!.total ?? prev.total,
        blocked: ws.auditPatch!.blocked ?? prev.blocked,
        passed: ws.auditPatch!.passed ?? prev.passed,
      };
    });
  }, [ws.auditPatch]);

  useEffect(() => {
    void fetchSwarmStatus().then((st) => {
      if (st) setSwarm(st);
    });
  }, [ws.pipeline.state, ws.pipeline.progressPct, ws.swarmDoneTick, refreshTick]);

  const displayMetrics = metrics ?? ws.metricsPatch;

  return useMemo(
    () => ({
      ready,
      apiOnline,
      statusText: ws.connected ? ws.statusText : statusText,
      statusError: statusError && !ws.connected,
      auth,
      metrics: displayMetrics,
      audit,
      security,
      health,
      swarm,
      ws,
      refresh,
      refreshTick: refreshTick + ws.swarmDoneTick + ws.aiRefreshTick,
    }),
    [
      ready,
      apiOnline,
      statusText,
      statusError,
      auth,
      displayMetrics,
      audit,
      security,
      health,
      swarm,
      ws,
      refresh,
      refreshTick,
    ],
  );
}
