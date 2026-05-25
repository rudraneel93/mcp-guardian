'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchAggregateMetrics,
  fetchAudit,
  fetchAuthStatus,
  guardianFetch,
  fetchCost,
  fetchHealth,
  fetchFleetInstances,
  fetchSecurity,
  rejectFp,
  type FleetResponse,
  type AuditResponse,
  type AggregateMetrics,
  type CostResponse,
  type HealthResponse,
  type SecurityResponse,
} from '@/lib/guardian-api';
import { useDashboardWs } from '@/lib/use-dashboard-ws';
import { DashboardShell } from './DashboardShell';
import { LoginGate } from './LoginGate';
import { AgentFlowPanel } from './AgentFlowPanel';
import { SetupPanel } from './SetupPanel';
import { SwarmPanel } from './SwarmPanel';
import { AiLearningPanel } from './AiLearningPanel';
import { ThreatDiscoveryPanel } from './ThreatDiscoveryPanel';
import { EnterpriseAiPanel } from './EnterpriseAiPanel';
import { PolicyPanel } from './PolicyPanel';
import { AdminPanel } from './AdminPanel';
import { TenantContextBar } from './TenantContextBar';
import { ProUpgradeBanner } from './ProUpgradeBanner';
import { ExecutiveOverviewPanel } from './dashboard/ExecutiveOverviewPanel';
import { CostGovernancePanel } from './dashboard/CostGovernancePanel';
import { SecurityPosturePanel } from './dashboard/SecurityPosturePanel';
import { HealthReliabilityPanel } from './dashboard/HealthReliabilityPanel';
import { AuditExplorerPanel } from './dashboard/AuditExplorerPanel';
import { FleetOverviewPanel } from './dashboard/FleetOverviewPanel';
import { AnalyticsChartsHub } from './dashboard/AnalyticsChartsHub';
import { DashboardWindowProvider, DashboardWindowSelector } from './dashboard/DashboardWindowContext';
import { DashboardRegionProvider, DashboardRegionSelector } from './dashboard/DashboardRegionContext';
import { VisualsProvider } from './dashboard/VisualsProvider';
import { hasPermission } from '@/lib/dashboard-roles';
import type { AuthStatus } from '@/lib/guardian-api';
import type { ThreatLabContext } from './IncidentInvestigatorDrawer';

type TabId =
  | 'setup'
  | 'flow'
  | 'overview'
  | 'audit'
  | 'security'
  | 'cost'
  | 'health'
  | 'ai'
  | 'enterprise-ai'
  | 'threat-discovery'
  | 'policy'
  | 'fleet'
  | 'swarm'
  | 'admin';

const TABS: { id: TabId; label: string }[] = [
  { id: 'setup', label: 'Setup' },
  { id: 'flow', label: 'Agent flow' },
  { id: 'overview', label: 'Overview' },
  { id: 'audit', label: 'Live audit' },
  { id: 'security', label: 'Security' },
  { id: 'cost', label: 'Cost' },
  { id: 'health', label: 'Health' },
  { id: 'ai', label: 'AI copilot' },
  { id: 'enterprise-ai', label: 'Enterprise AI' },
  { id: 'threat-discovery', label: 'Threat Discovery' },
  { id: 'policy', label: 'Policy' },
  { id: 'fleet', label: 'Fleet' },
  { id: 'swarm', label: 'Analysis' },
  { id: 'admin', label: 'Admin' },
];

const POLL_FAILURES_BEFORE_DOWN = 3;
const STATUS_DEBOUNCE_MS = 400;
const REST_POLL_MS = 30_000;

export function DashboardClient() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<TabId>('flow');
  const [status, setStatus] = useState('Loading…');
  const [statusIsError, setStatusIsError] = useState(false);
  const [apiUnreachable, setApiUnreachable] = useState(false);

  const [audit, setAudit] = useState<AuditResponse | null>(null);
  const [metrics, setMetrics] = useState<AggregateMetrics | null>(null);
  const [cost, setCost] = useState<CostResponse | null>(null);
  const [security, setSecurity] = useState<SecurityResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [fleetMeta, setFleetMeta] = useState<FleetResponse | null>(null);
  const [actionMsg, setActionMsg] = useState('');
  const [sessionKey, setSessionKey] = useState(0);
  const [roles, setRoles] = useState<string[]>([]);
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [auditAction, setAuditAction] = useState('');
  const [auditServer, setAuditServer] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);
  const [threatLabContext, setThreatLabContext] = useState<ThreatLabContext | null>(null);
  const [threatDiscoverySubTab, setThreatDiscoverySubTab] = useState<'overview' | 'threat-lab' | 'auto-research' | 'architecture' | undefined>();
  const [policyCopilotTab, setPolicyCopilotTab] = useState<'generate' | 'counterfactual'>('generate');

  const pollFailuresRef = useRef(0);
  const statusTimerRef = useRef<number | null>(null);

  const ws = useDashboardWs(ready, sessionKey);

  const applyStatus = useCallback((text: string, isError: boolean, immediate = false) => {
    if (statusTimerRef.current) {
      window.clearTimeout(statusTimerRef.current);
      statusTimerRef.current = null;
    }
    const apply = () => {
      setStatus(text);
      setStatusIsError(isError);
    };
    if (immediate) {
      apply();
      return;
    }
    statusTimerRef.current = window.setTimeout(apply, STATUS_DEBOUNCE_MS);
  }, []);

  const refreshAll = useCallback(async () => {
    try {
      const authProbe = await guardianFetch('/api/auth/status');
      const apiUp = authProbe.ok;

      const [auditRes, metricsRes, costRes, secRes, healthRes, fleetRes, authRes] =
        await Promise.all([
          fetchAudit({
            limit: 100,
            action: auditAction || undefined,
            server: auditServer || undefined,
          }),
          fetchAggregateMetrics(),
          fetchCost(),
          fetchSecurity(),
          fetchHealth(),
          fetchFleetInstances(),
          fetchAuthStatus(),
        ]);
      if (authRes) {
        setAuthStatus(authRes);
        if (authRes.roles) setRoles(authRes.roles);
      }

      if (!auditRes && !metricsRes && !costRes) {
        if (apiUp) {
          pollFailuresRef.current = 0;
          setApiUnreachable(false);
          applyStatus(
            'Dashboard API connected — no proxy history DB (use pnpm dashboard:proxy for live metrics)',
            false,
          );
        } else {
          pollFailuresRef.current += 1;
          if (pollFailuresRef.current >= POLL_FAILURES_BEFORE_DOWN) {
            setApiUnreachable(true);
            if (!ws.connected) {
              applyStatus(
                'API unavailable — check DASHBOARD_ENABLED on :4000, auth, or rate limit (429)',
                true,
              );
            }
          }
        }
        if (secRes) setSecurity(secRes);
        if (healthRes) setHealth(healthRes);
        setFleetMeta(fleetRes);
        return;
      }

      pollFailuresRef.current = 0;
      setApiUnreachable(false);
      if (!ws.connected) {
        applyStatus('Connected — live data from proxy history DB', false);
      } else {
        applyStatus(ws.statusText, ws.statusIsError);
      }
      if (auditRes) setAudit(auditRes);
      if (metricsRes) setMetrics(metricsRes);
      if (costRes) setCost(costRes);
      if (secRes) setSecurity(secRes);
      if (healthRes) setHealth(healthRes);
      setFleetMeta(fleetRes);
      setRefreshTick((t) => t + 1);
    } catch (e) {
      pollFailuresRef.current += 1;
      const message = e instanceof Error ? e.message : 'Network error';
      if (pollFailuresRef.current >= POLL_FAILURES_BEFORE_DOWN) {
        setApiUnreachable(true);
        if (!ws.connected) {
          applyStatus(`REST error: ${message}`, true);
        }
      }
    }
  }, [applyStatus, auditAction, auditServer, ws.connected, ws.statusText, ws.statusIsError]);

  useEffect(() => {
    setReady(true);
  }, []);

  const onAuthenticated = useCallback(() => {
    setSessionKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!ready) return;
    void refreshAll();
    const interval = window.setInterval(() => void refreshAll(), REST_POLL_MS);
    return () => window.clearInterval(interval);
  }, [ready, sessionKey, refreshAll]);

  useEffect(() => {
    if (ws.connected) {
      applyStatus(ws.statusText, ws.statusIsError, true);
    }
  }, [ws.connected, ws.statusText, ws.statusIsError, applyStatus]);

  useEffect(() => {
    if (ws.metricsPatch) setMetrics(ws.metricsPatch);
  }, [ws.metricsPatch]);

  useEffect(() => {
    if (!ws.auditPatch) return;
    const patch = ws.auditPatch;
    setAudit((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ...patch,
        events: patch.events ?? prev.events,
        total: patch.total ?? prev.total,
        blocked: patch.blocked ?? prev.blocked,
        passed: patch.passed ?? prev.passed,
        flagged: patch.flagged ?? prev.flagged,
        semanticAudit: patch.semanticAudit ?? prev.semanticAudit,
      };
    });
  }, [ws.auditPatch]);

  const onFpReject = async (rule: string, pattern: string) => {
    if (!hasPermission(roles, 'policy_mutate')) {
      setActionMsg('Requires operator role for FP reject');
      return;
    }
    const res = await rejectFp({ rule, pattern: pattern || rule });
    setActionMsg(res.ok ? 'FP rejection recorded' : res.error || 'FP reject failed');
    if (res.ok) await refreshAll();
  };

  if (!ready) {
    return <DashboardShell />;
  }

  const displayMetrics = metrics ?? ws.metricsPatch;
  const displayAudit = audit;

  const lastBlocked = (displayAudit?.events || []).find((e) => e.action === 'block');

  return (
    <LoginGate onAuthenticated={onAuthenticated}>
    <DashboardWindowProvider>
    <DashboardRegionProvider>
    <VisualsProvider refreshKey={refreshTick} pollMs={REST_POLL_MS}>
    <main>
      <header>
        <h1>MCP Guardian</h1>
        <p className={statusIsError ? 'status status-error' : 'status'} suppressHydrationWarning>
          {status}
        </p>
        <p className="subtitle">Data-authentic agentic SOC — metrics from real proxy call_records</p>
        <TenantContextBar authStatus={authStatus} />
        <ProUpgradeBanner authStatus={authStatus} />
        <DashboardWindowSelector />
        <DashboardRegionSelector />
      </header>

      {apiUnreachable && <MotionlessBanner />}
      {actionMsg ? <p className="action-msg">{actionMsg}</p> : null}

      <nav className="tabs" aria-label="Dashboard sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? 'tab active' : 'tab'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'setup' && <SetupPanel onGoToAgentFlow={() => setTab('flow')} />}

      {tab === 'flow' && <AgentFlowPanel ws={ws} roles={roles} />}

      {tab === 'overview' && (
        <>
          <ExecutiveOverviewPanel
            refreshKey={refreshTick}
            metrics={displayMetrics}
            semanticFlags={displayAudit?.flagged ?? displayAudit?.semanticAudit?.flagged ?? 0}
          />
          <AnalyticsChartsHub refreshKey={refreshTick} />
        </>
      )}

      {tab === 'audit' && (
        <AuditExplorerPanel
          audit={displayAudit}
          refreshKey={refreshTick}
          auditAction={auditAction}
          auditServer={auditServer}
          onFilterChange={(action, server) => {
            setAuditAction(action);
            setAuditServer(server);
          }}
          onApplyFilters={() => void refreshAll()}
          onFpReject={(rule, pattern) => void onFpReject(rule, pattern)}
          canMutate={hasPermission(roles, 'policy_mutate')}
        />
      )}

      {tab === 'security' && (
        <SecurityPosturePanel
          security={security}
          refreshKey={refreshTick}
          onOpenThreatDiscovery={() => setTab('threat-discovery')}
        />
      )}

      {tab === 'cost' && (
        <CostGovernancePanel refreshKey={refreshTick} initialCost={cost} />
      )}

      {tab === 'health' && (
        <HealthReliabilityPanel health={health} refreshKey={refreshTick} />
      )}

      {tab === 'ai' && (
        <AiLearningPanel
          roles={roles}
          refreshTick={ws.aiRefreshTick}
          onAction={(m) => setActionMsg(m)}
          onOpenThreatLab={(ctx) => {
            setThreatLabContext(ctx);
            setThreatDiscoverySubTab('threat-lab');
            setTab('threat-discovery');
            setActionMsg('Opened incident in Threat Lab');
          }}
        />
      )}

      {tab === 'enterprise-ai' && (
        <EnterpriseAiPanel
          roles={roles}
          refreshTick={ws.aiRefreshTick}
          onAction={(m) => setActionMsg(m)}
          onOpenThreatLab={(ctx) => {
            setThreatLabContext(ctx);
            setThreatDiscoverySubTab('threat-lab');
            setTab('threat-discovery');
            setActionMsg('Opened incident in Threat Lab');
          }}
          onOpenPolicyCounterfactual={() => {
            setPolicyCopilotTab('counterfactual');
            setTab('policy');
            setActionMsg('Open Policy → What-if counterfactual simulator');
          }}
        />
      )}

      {tab === 'threat-discovery' && (
        <ThreatDiscoveryPanel
          roles={roles}
          authStatus={authStatus}
          refreshKey={ws.threatDiscoveryTick}
          onAction={(m) => setActionMsg(m)}
          initialSubTab={threatDiscoverySubTab}
          threatLabContext={threatLabContext}
          onClearThreatLabContext={() => setThreatLabContext(null)}
        />
      )}

      {tab === 'policy' && (
        <PolicyPanel
          roles={roles}
          lastBlocked={lastBlocked ?? null}
          onAction={(m) => setActionMsg(m)}
          copilotInitialTab={policyCopilotTab}
        />
      )}

      {tab === 'swarm' && (
        <>
          <SwarmPanel pipeline={ws.pipeline} swarmDoneTick={ws.swarmDoneTick} />
          <AnalyticsChartsHub refreshKey={ws.swarmDoneTick || refreshTick} />
        </>
      )}

      {tab === 'admin' && (
        <AdminPanel roles={roles} tenantLocked={!!authStatus?.tenantLocked} />
      )}

      {tab === 'fleet' && (
        <FleetOverviewPanel fleet={fleetMeta?.instances ?? []} meta={fleetMeta} />
      )}

    </main>
    </VisualsProvider>
    </DashboardRegionProvider>
    </DashboardWindowProvider>
    </LoginGate>
  );
}

function MotionlessBanner() {
  return (
    <div className="banner" role="status">
      Guardian API not reachable (or rate-limited). Run the proxy with{' '}
      <code>DASHBOARD_ENABLED=true</code> on port 4000, restart after{' '}
      <code>pnpm dashboard:build</code>, or set{' '}
      <code>?apiBase=http://localhost:4000</code> (and <code>apiKey=</code> if required). If you
      see HTTP 429 in the network tab, refresh after a minute or raise{' '}
      <code>GUARDIAN_DASHBOARD_API_RATE_LIMIT</code>.
    </div>
  );
}
