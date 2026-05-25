'use client';

import type { FleetInstance, FleetResponse } from '@/lib/guardian-api';
import { DashboardSection } from './DashboardSection';
import { KpiCard } from './KpiCard';
import { DataTablePro, type Column } from './DataTablePro';

type Props = {
  fleet: FleetInstance[];
  meta?: FleetResponse | null;
};

const SOURCE_LABELS: Record<string, string> = {
  postgres: 'PostgreSQL guardian_instances',
  'multi-sqlite': 'GUARDIAN_FLEET_DB_PATHS',
  sqlite: 'SQLite fleet path',
  local: 'This dashboard host',
  none: 'No fleet data',
};

export function FleetOverviewPanel({ fleet, meta }: Props) {
  const totalRequests = fleet.reduce((s, i) => s + (i.totalRequests ?? 0), 0);
  const totalBlocked = fleet.reduce((s, i) => s + (i.blockedRequests ?? 0), 0);
  const totalCost = fleet.reduce((s, i) => s + (i.totalCostUsd ?? 0), 0);
  const source = meta?.source || fleet[0]?.fleetSource || 'local';
  const sourceLabel = SOURCE_LABELS[source] || source;
  const activeCount = meta?.activeInstances ?? fleet.filter((i) => i.status === 'active').length;

  const byRegion = new Map<string, FleetInstance[]>();
  for (const inst of fleet) {
    const regionKey = inst.region?.trim() || 'unlabeled';
    const list = byRegion.get(regionKey) || [];
    list.push(inst);
    byRegion.set(regionKey, list);
  }
  const regionGroups = [...byRegion.entries()].sort(([a], [b]) => a.localeCompare(b));

  const columns: Column<FleetInstance>[] = [
    {
      key: 'instance',
      header: 'Instance',
      render: (r) => r.instanceName || r.instanceId,
      sortValue: (r) => r.instanceName || r.instanceId,
    },
    { key: 'status', header: 'Status', render: (r) => r.status || '—' },
    {
      key: 'region',
      header: 'Region',
      render: (r) => r.region || '—',
      sortValue: (r) => r.region || '',
    },
    {
      key: 'heartbeat',
      header: 'Last heartbeat',
      render: (r) => (r.lastHeartbeat ? r.lastHeartbeat.slice(0, 19).replace('T', ' ') : '—'),
      sortValue: (r) => r.lastHeartbeat || '',
    },
    {
      key: 'requests',
      header: 'Requests',
      render: (r) => r.totalRequests?.toLocaleString() ?? '—',
      sortValue: (r) => r.totalRequests ?? 0,
    },
    {
      key: 'blocked',
      header: 'Blocked',
      render: (r) => r.blockedRequests?.toLocaleString() ?? '—',
      sortValue: (r) => r.blockedRequests ?? 0,
    },
    {
      key: 'cost',
      header: 'Cost (USD)',
      render: (r) => (r.totalCostUsd != null ? `$${r.totalCostUsd.toFixed(4)}` : '—'),
      sortValue: (r) => r.totalCostUsd ?? 0,
    },
    { key: 'source', header: 'Source', render: (r) => r.fleetSource || source },
  ];

  return (
    <DashboardSection
      title="Fleet instances"
      subtitle={`${sourceLabel}${meta?.region ? ` · region ${meta.region}` : ''} — same data as mcp-guardian fleet status`}
    >
      <div className="kpi-row">
        <KpiCard label="Instances" value={meta?.totalInstances ?? fleet.length} sub={`${activeCount} active`} />
        <KpiCard label="Total requests" value={totalRequests.toLocaleString()} />
        <KpiCard label="Total blocked" value={totalBlocked.toLocaleString()} />
        <KpiCard label="Total cost" value={`$${totalCost.toFixed(4)}`} />
      </div>

      {fleet.length === 0 ? (
        <p className="muted">
          No fleet instances found. Set <code>DATABASE_URL</code> + <code>DB_TYPE=postgres</code> for
          multi-replica registry, or <code>GUARDIAN_FLEET_DB_PATHS</code> for comma-separated SQLite DBs.
        </p>
      ) : (
        <>
          {regionGroups.map(([regionKey, instances]) => (
            <div key={regionKey} className="fleet-region-group">
              <h3 className="fleet-region-heading">
                {regionKey === 'unlabeled' ? 'Unlabeled region' : regionKey}
                <span className="muted"> ({instances.length})</span>
              </h3>
              <div className="fleet-card-grid">
                {instances.map((i) => (
                  <article key={i.instanceId} className="kpi-card">
                    <p className="kpi-card-label">{i.instanceName || i.instanceId}</p>
                    <p className="kpi-card-value">{i.status || 'unknown'}</p>
                    <p className="kpi-card-sub">
                      {i.totalRequests ?? 0} req · {i.blockedRequests ?? 0} blocked · $
                      {(i.totalCostUsd ?? 0).toFixed(4)}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          ))}

          <DataTablePro
            columns={columns}
            rows={fleet}
            rowKey={(r) => r.instanceId}
            exportFilename="guardian-fleet.csv"
          />
        </>
      )}
    </DashboardSection>
  );
}
